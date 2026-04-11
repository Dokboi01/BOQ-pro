import localDB from './localDB';
import { saveProject, getProjects, deleteProject as cloudDeleteProject } from './database';
import { auth } from './firebase';
import { toSaveTimestamp } from '../utils/projectSaveState';
import { safeStorageGet } from '../utils/safeStorage';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 2000;  // 2 s — was 5 s, gives faster first retry
const MAX_BACKOFF_MS = 300000; // 5 min
const RECONNECT_JITTER_MS = 1500; // max random jitter on reconnect
const SYNC_DEBOUNCE_MS = 400;   // was 800 ms — halved for snappier cloud writes
const AUTO_SYNC_INTERVAL_MS = 15000; // was 30 s — now 15 s for faster catch-up
const MISSING_CLOUD_GRACE_MS = 5 * 60 * 1000;
const MISSING_CLOUD_DELETE_THRESHOLD = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Sync State
// ─────────────────────────────────────────────────────────────────────────────
let syncState = 'synced'; // 'synced' | 'syncing' | 'pending' | 'offline'
let pendingCount = 0;
let listeners = [];
let projectSaveListeners = [];
let debounceTimers = {};
let autoSyncInterval = null;
let visibilityListenerAdded = false;
let migrationDone = false; // run legacy migration only once per session
const projectIdRedirects = new Map();

function getDefaultProjectSaveMeta(project, existingMeta = {}) {
  const isCloudProject = !!project?.id && !String(project.id).startsWith('local_');

  return {
    status: existingMeta.status || (isCloudProject ? 'synced' : 'local-only'),
    lastLocalSaveAt: toSaveTimestamp(existingMeta.lastLocalSaveAt),
    lastCloudSyncAt: toSaveTimestamp(existingMeta.lastCloudSyncAt || project?.updated_at),
    lastSyncAttemptAt: toSaveTimestamp(existingMeta.lastSyncAttemptAt),
    lastSyncError: existingMeta.lastSyncError || '',
    retryCount: Number(existingMeta.retryCount) || 0,
    cloudMissCount: Number(existingMeta.cloudMissCount) || 0,
    lastMissingFromCloudAt: toSaveTimestamp(existingMeta.lastMissingFromCloudAt),
    pendingChanges: existingMeta.pendingChanges === true,
    cloudLinked: existingMeta.cloudLinked === true || isCloudProject,
  };
}

function buildProjectSaveMeta(project, existingRecord = null, options = {}) {
  const now = Number(options.updatedAt) || Date.now();
  const existingMeta = {
    ...(existingRecord?.saveMeta || {}),
    ...(project?.saveMeta || {}),
  };
  const base = getDefaultProjectSaveMeta(project, existingMeta);

  if (options.source === 'cloud') {
    const cloudSyncedAt = Number(options.cloudSyncedAt)
      || toSaveTimestamp(project?.updated_at)
      || now;

    return {
      ...base,
      status: base.pendingChanges ? base.status : 'synced',
      lastCloudSyncAt: cloudSyncedAt,
      lastSyncAttemptAt: base.lastSyncAttemptAt || cloudSyncedAt,
      lastSyncError: base.pendingChanges ? base.lastSyncError : '',
      retryCount: base.pendingChanges ? base.retryCount : 0,
      cloudMissCount: 0,
      lastMissingFromCloudAt: 0,
      pendingChanges: base.pendingChanges,
      cloudLinked: true,
    };
  }

  if (options.source === 'user') {
    const nextStatus = !navigator.onLine
      ? 'offline'
      : auth.currentUser
        ? 'pending'
        : 'local-only';

    return {
      ...base,
      status: nextStatus,
      lastLocalSaveAt: now,
      lastSyncError: '',
      retryCount: 0,
      cloudMissCount: 0,
      lastMissingFromCloudAt: 0,
      pendingChanges: true,
    };
  }

  if (options.metaPatch) {
    return {
      ...base,
      ...options.metaPatch,
      lastLocalSaveAt: toSaveTimestamp(options.metaPatch.lastLocalSaveAt ?? base.lastLocalSaveAt),
      lastCloudSyncAt: toSaveTimestamp(options.metaPatch.lastCloudSyncAt ?? base.lastCloudSyncAt),
      lastSyncAttemptAt: toSaveTimestamp(options.metaPatch.lastSyncAttemptAt ?? base.lastSyncAttemptAt),
      retryCount: Number(options.metaPatch.retryCount ?? base.retryCount) || 0,
      cloudMissCount: Number(options.metaPatch.cloudMissCount ?? base.cloudMissCount) || 0,
      lastMissingFromCloudAt: toSaveTimestamp(options.metaPatch.lastMissingFromCloudAt ?? base.lastMissingFromCloudAt),
      pendingChanges: options.metaPatch.pendingChanges ?? base.pendingChanges,
      cloudLinked: options.metaPatch.cloudLinked ?? base.cloudLinked,
      lastSyncError: options.metaPatch.lastSyncError ?? base.lastSyncError,
    };
  }

  return base;
}

function notifyProjectSaveListeners(projectId, saveMeta) {
  projectSaveListeners.forEach((fn) => fn(projectId, saveMeta));
}

function getLocalUserId() {
  if (auth.currentUser?.uid) return auth.currentUser.uid;

  try {
    const cached = safeStorageGet('boq_pro_profile');
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed?.id || null;
  } catch {
    return null;
  }
}

function getAuthenticatedUserId() {
  return auth.currentUser?.uid || null;
}

function canSyncToCloudForUser(userId = getAuthenticatedUserId()) {
  return navigator.onLine && !!userId && getAuthenticatedUserId() === userId;
}

function resolveProjectId(projectId) {
  if (!projectId) return projectId;

  let resolvedId = projectId;
  const seen = new Set();

  while (projectIdRedirects.has(resolvedId) && !seen.has(resolvedId)) {
    seen.add(resolvedId);
    resolvedId = projectIdRedirects.get(resolvedId);
  }

  return resolvedId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Backoff helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the earliest timestamp at which a failed item should be retried.
 * Uses capped exponential backoff: min(2^retries * BASE, MAX)
 */
function calcRetryAfter(retries = 0) {
  const delay = Math.min(Math.pow(2, retries) * BASE_BACKOFF_MS, MAX_BACKOFF_MS);
  return Date.now() + delay;
}

/**
 * Returns true if the item is in backoff and should be skipped this pass.
 */
function isInBackoff(item) {
  if (!item.retryAfter) return false;
  return Date.now() < item.retryAfter;
}

/**
 * Returns true if the item has exceeded the max retry limit.
 */
function isExhausted(item) {
  return (item.retries || 0) >= MAX_RETRIES;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue management helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getQueuedItemsForUser(userId = getLocalUserId()) {
  if (!userId) return [];
  // Migration is handled once at startup — no need to re-run on every read
  const queuedItems = await localDB.syncQueue.where('userId').equals(userId).toArray();
  return queuedItems.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

async function getPendingQueueCount(userId = getLocalUserId()) {
  if (!userId) return 0;
  // Skip migration here — it runs once in startAutoSync
  return localDB.syncQueue.where('userId').equals(userId).count();
}

async function refreshSyncState(userId = getLocalUserId()) {
  if (!navigator.onLine) {
    pendingCount = 0;
    setSyncState('offline');
    return;
  }

  const count = await getPendingQueueCount(userId);
  pendingCount = count;
  setSyncState(count > 0 ? 'pending' : 'synced');
}

async function migrateLegacyQueueItems(userId) {
  if (!userId || migrationDone) return;
  migrationDone = true; // prevent repeat runs in the same session

  const legacyItems = await localDB.syncQueue
    .toCollection()
    .filter((item) => !item.userId)
    .toArray();

  for (const item of legacyItems) {
    await localDB.syncQueue.update(item.id, { userId });
  }
}

async function upsertQueueItem(action, projectId, payload, userId = getLocalUserId()) {
  const scopedUserId = userId || getLocalUserId();
  if (!scopedUserId || !projectId) return;

  const resolvedProjectId = resolveProjectId(projectId);
  const nextPayload = payload
    ? JSON.parse(JSON.stringify({
        ...payload,
        id: resolvedProjectId,
        local_origin_id: payload.local_origin_id || (resolvedProjectId !== projectId ? projectId : payload.local_origin_id || null),
      }))
    : null;

  const existing = await localDB.syncQueue
    .where('[userId+projectId+action]')
    .equals([scopedUserId, resolvedProjectId, action])
    .first();

  if (existing) {
    await localDB.syncQueue.update(existing.id, {
      payload: nextPayload,
      retries: 0,
      createdAt: Date.now(),
      lastError: null,
      lastTriedAt: null,
      retryAfter: null,
    });
  } else {
    await localDB.syncQueue.add({
      userId: scopedUserId,
      action,
      projectId: resolvedProjectId,
      payload: nextPayload,
      retries: 0,
      createdAt: Date.now(),
      lastError: null,
      lastTriedAt: null,
      retryAfter: null,
    });
  }

  await refreshSyncState(scopedUserId);
}

async function clearQueuedAction(userId, projectId, action) {
  if (!userId || !projectId) return;

  const resolvedProjectId = resolveProjectId(projectId);
  await localDB.syncQueue
    .where('[userId+projectId+action]')
    .equals([userId, resolvedProjectId, action])
    .delete();
}

async function remapQueuedProject(userId, oldProjectId, newProjectId) {
  if (!userId || !oldProjectId || !newProjectId || oldProjectId === newProjectId) return;

  const queuedItems = await getQueuedItemsForUser(userId);
  const oldItems = queuedItems.filter((item) => item.projectId === oldProjectId);

  for (const item of oldItems) {
    const existingTarget = queuedItems.find((candidate) => (
      candidate.id !== item.id
      && candidate.projectId === newProjectId
      && candidate.action === item.action
    ));

    const nextPayload = item.payload
      ? {
          ...item.payload,
          id: newProjectId,
          local_origin_id: item.payload.local_origin_id || oldProjectId,
        }
      : null;

    if (existingTarget) {
      await localDB.syncQueue.update(existingTarget.id, {
        payload: nextPayload || existingTarget.payload,
        createdAt: Math.max(existingTarget.createdAt || 0, item.createdAt || 0),
        retries: 0,
        lastError: null,
        lastTriedAt: null,
        retryAfter: null,
      });
      await localDB.syncQueue.delete(item.id);
      continue;
    }

    await localDB.syncQueue.update(item.id, {
      projectId: newProjectId,
      payload: nextPayload,
      retries: 0,
      lastError: null,
      lastTriedAt: null,
      retryAfter: null,
    });
  }
}

async function promoteLocalProjectId(oldProjectId, newProjectId, userId = getLocalUserId()) {
  if (!oldProjectId || !newProjectId || oldProjectId === newProjectId) return;

  const localProject = await localDB.projects.get(oldProjectId);
  const existingProject = await localDB.projects.get(newProjectId);

  if (!localProject) {
    await remapQueuedProject(userId, oldProjectId, newProjectId);
    return;
  }

  await localDB.projects.delete(oldProjectId);
  const promotedRecord = {
    ...(existingProject || {}),
    ...localProject,
    id: newProjectId,
    userId: existingProject?.userId || localProject.userId || userId,
    local_origin_id: existingProject?.local_origin_id || localProject.local_origin_id || oldProjectId,
    saveMeta: {
      ...(existingProject?.saveMeta || {}),
      ...(localProject.saveMeta || {}),
      cloudLinked: true,
    },
  };
  await localDB.projects.put(promotedRecord);
  notifyProjectSaveListeners(newProjectId, promotedRecord.saveMeta || null);

  await remapQueuedProject(userId, oldProjectId, newProjectId);
}

function notifyListeners() {
  listeners.forEach(fn => fn(getSyncStatus()));
}

export function onSyncStatusChange(callback) {
  listeners.push(callback);
  return () => { listeners = listeners.filter(fn => fn !== callback); };
}

export function onProjectSaveStateChange(callback) {
  projectSaveListeners.push(callback);
  return () => { projectSaveListeners = projectSaveListeners.filter(fn => fn !== callback); };
}

export function getSyncStatus() {
  return {
    state: navigator.onLine ? syncState : 'offline',
    pendingCount,
  };
}

function setSyncState(state) {
  syncState = state;
  notifyListeners();
}

async function updateProjectSaveMeta(projectId, metaPatch, userId = getLocalUserId()) {
  if (!projectId || !userId) return null;

  const resolvedProjectId = resolveProjectId(projectId);
  const existingRecord = await localDB.projects.get(resolvedProjectId);
  if (!existingRecord) return null;

  const nextSaveMeta = buildProjectSaveMeta(existingRecord, existingRecord, {
    metaPatch,
    updatedAt: Date.now(),
  });

  const nextRecord = {
    ...existingRecord,
    saveMeta: nextSaveMeta,
  };

  await localDB.projects.put(nextRecord);
  notifyProjectSaveListeners(resolvedProjectId, nextSaveMeta);
  return nextRecord;
}

// ─────────────────────────────────────────────────────────────────────────────
// Local DB Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a project to local Dexie DB
 */
export async function saveLocal(project, options = {}) {
  const userId = options.userId || getLocalUserId();
  if (!userId) return;

  const existingRecord = await localDB.projects.get(project.id);
  const updatedAt = Number(options.updatedAt)
    || (options.source === 'cloud' ? toSaveTimestamp(project?.updated_at) : 0)
    || Date.now();
  const saveMeta = buildProjectSaveMeta(project, existingRecord, {
    source: options.source,
    updatedAt,
    cloudSyncedAt: options.cloudSyncedAt,
    metaPatch: options.metaPatch,
  });

  const record = {
    ...(existingRecord || {}),
    ...project,
    userId,
    updatedAt,
    saveMeta,
  };

  await localDB.projects.put(record);
  notifyProjectSaveListeners(record.id, saveMeta);
  return record;
}

/**
 * Load all projects for the current user from local DB
 */
export async function loadLocal() {
  const userId = getLocalUserId();
  if (!userId) return [];

  try {
    const projects = await localDB.projects.where('userId').equals(userId).toArray();
    const visibleProjectIds = new Set(projects.map((project) => project.id));
    const queuedItems = await getQueuedItemsForUser(userId);

    for (const item of queuedItems) {
      if (item.action !== 'save' || !item.payload) continue;

      const queuedProjectId = resolveProjectId(item.projectId);
      if (visibleProjectIds.has(queuedProjectId)) continue;

      const recoveredProject = await saveLocal({
        ...item.payload,
        id: queuedProjectId,
        local_origin_id: item.payload.local_origin_id || (queuedProjectId !== item.projectId ? item.projectId : item.payload.local_origin_id || null),
      }, {
        source: 'user',
        userId,
        updatedAt: item.createdAt || Date.now(),
        metaPatch: {
          status: navigator.onLine ? 'pending' : 'offline',
          pendingChanges: true,
          retryCount: item.retries || 0,
          lastSyncError: item.lastError || '',
          lastSyncAttemptAt: item.lastTriedAt || 0,
          cloudLinked: !String(queuedProjectId || '').startsWith('local_'),
        }
      });

      if (recoveredProject) {
        visibleProjectIds.add(recoveredProject.id);
        projects.push(recoveredProject);
      }
    }

    // Sort by updatedAt descending
    return projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch {
    return [];
  }
}

/**
 * Delete a project from local DB
 */
export async function deleteLocal(projectId) {
  await localDB.projects.delete(projectId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync Queue
// ─────────────────────────────────────────────────────────────────────────────

async function addToQueue(action, projectId, payload, userId = getLocalUserId()) {
  await upsertQueueItem(action, projectId, payload, userId);
}

/**
 * Process all queued sync operations.
 * Items in backoff or exhausted are skipped.
 */
export async function processQueue() {
  const syncUserId = getLocalUserId();
  if (!syncUserId) {
    await refreshSyncState(null);
    return;
  }

  if (!canSyncToCloudForUser(syncUserId)) {
    await refreshSyncState(syncUserId);
    return;
  }

  const queue = await getQueuedItemsForUser(syncUserId);
  const actionable = queue.filter(item => !isExhausted(item) && !isInBackoff(item));

  if (actionable.length === 0) {
    // Still update state — exhausted items keep pendingCount correct
    pendingCount = queue.length;
    setSyncState(queue.length > 0 ? 'pending' : 'synced');
    return;
  }

  setSyncState('syncing');

  // Process all actionable items concurrently — no need to await each Firestore call serially
  await Promise.allSettled(
    actionable.map(async (item) => {
      try {
        await updateProjectSaveMeta(item.projectId, {
          status: 'syncing',
          lastSyncAttemptAt: Date.now(),
          retryCount: item.retries || 0,
          lastSyncError: '',
        }, syncUserId);

        if (item.action === 'save' && item.payload) {
          const resolvedProjectId = resolveProjectId(item.projectId);
          const payload = resolvedProjectId === item.projectId
            ? item.payload
            : {
                ...item.payload,
                id: resolvedProjectId,
                local_origin_id: item.payload.local_origin_id || item.projectId,
              };

          const savedId = await saveProject(payload);
          if (savedId) {
            if (resolvedProjectId.startsWith('local_') && savedId !== resolvedProjectId) {
              await promoteLocalProjectId(resolvedProjectId, savedId, syncUserId);
              notifyIdChange(resolvedProjectId, savedId);
            } else if (resolvedProjectId !== item.projectId) {
              await remapQueuedProject(syncUserId, item.projectId, resolvedProjectId);
            }

            await localDB.syncQueue.delete(item.id);
            await updateProjectSaveMeta(savedId || resolvedProjectId, {
              status: 'synced',
              lastCloudSyncAt: Date.now(),
              lastSyncAttemptAt: Date.now(),
              lastSyncError: '',
              retryCount: 0,
              pendingChanges: false,
              cloudLinked: true,
            }, syncUserId);
          } else {
            throw new Error('Save returned null');
          }
        } else if (item.action === 'delete') {
          const success = await cloudDeleteProject(resolveProjectId(item.projectId));
          if (success) {
            await localDB.syncQueue.delete(item.id);
          } else {
            throw new Error('Delete returned false');
          }
        }
      } catch (err) {
        console.warn(`⚠️ Sync failed for ${item.action} ${item.projectId}:`, err.message);
        const nextRetries = (item.retries || 0) + 1;
        await localDB.syncQueue.update(item.id, {
          retries: nextRetries,
          lastError: err.message || 'Unknown sync error',
          lastTriedAt: Date.now(),
          retryAfter: calcRetryAfter(nextRetries),
        });
        await updateProjectSaveMeta(item.projectId, {
          status: nextRetries >= MAX_RETRIES ? 'attention' : (navigator.onLine ? 'pending' : 'offline'),
          lastSyncAttemptAt: Date.now(),
          lastSyncError: err.message || 'Unknown sync error',
          retryCount: nextRetries,
          pendingChanges: true,
        }, syncUserId);
      }
    })
  );

  await refreshSyncState(syncUserId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cloud Sync Operations (with debounce + queue)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sync a project to cloud (debounced, with queue fallback).
 */
export function syncToCloud(project) {
  const sourceUserId = getAuthenticatedUserId() || getLocalUserId();
  if (!project?.id || !sourceUserId) return;

  // Debounce per project — avoid hammering Firestore on every keystroke
  if (debounceTimers[project.id]) {
    clearTimeout(debounceTimers[project.id]);
  }

  debounceTimers[project.id] = setTimeout(async () => {
    delete debounceTimers[project.id];

    const resolvedProjectId = resolveProjectId(project.id);
    const nextProject = resolvedProjectId === project.id
      ? project
      : {
          ...project,
          id: resolvedProjectId,
          local_origin_id: project.local_origin_id || project.id,
        };

    if (!canSyncToCloudForUser(sourceUserId)) {
      await addToQueue('save', resolvedProjectId, nextProject, sourceUserId);
      await updateProjectSaveMeta(resolvedProjectId, {
        status: navigator.onLine ? 'pending' : 'offline',
        pendingChanges: true,
        cloudLinked: !resolvedProjectId.startsWith('local_'),
      }, sourceUserId);
      return;
    }

    setSyncState('syncing');
    await updateProjectSaveMeta(resolvedProjectId, {
      status: 'syncing',
      lastSyncAttemptAt: Date.now(),
      lastSyncError: '',
      pendingChanges: true,
      cloudLinked: !resolvedProjectId.startsWith('local_'),
    }, sourceUserId);

    try {
      const savedId = await saveProject(nextProject);
      if (savedId) {
        if (resolvedProjectId.startsWith('local_') && savedId !== resolvedProjectId) {
          await promoteLocalProjectId(resolvedProjectId, savedId, sourceUserId);
          notifyIdChange(resolvedProjectId, savedId);
        }
        await clearQueuedAction(sourceUserId, resolvedProjectId, 'save');
        await updateProjectSaveMeta(savedId || resolvedProjectId, {
          status: 'synced',
          lastCloudSyncAt: Date.now(),
          lastSyncAttemptAt: Date.now(),
          lastSyncError: '',
          retryCount: 0,
          pendingChanges: false,
          cloudLinked: true,
        }, sourceUserId);
        await refreshSyncState(sourceUserId);
      } else {
        await addToQueue('save', resolvedProjectId, nextProject, sourceUserId);
        await updateProjectSaveMeta(resolvedProjectId, {
          status: navigator.onLine ? 'pending' : 'offline',
          lastSyncAttemptAt: Date.now(),
          pendingChanges: true,
        }, sourceUserId);
      }
    } catch (err) {
      console.warn('⚠️ Cloud sync failed, queuing:', err.message);
      await addToQueue('save', resolvedProjectId, nextProject, sourceUserId);
      await updateProjectSaveMeta(resolvedProjectId, {
        status: navigator.onLine ? 'pending' : 'offline',
        lastSyncAttemptAt: Date.now(),
        lastSyncError: err.message || 'Cloud sync failed',
        pendingChanges: true,
      }, sourceUserId);
    }
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Sync a delete operation to cloud.
 * Cancels any pending save debounce for the same project first.
 */
export async function syncDeleteToCloud(projectId) {
  const sourceUserId = getAuthenticatedUserId() || getLocalUserId();
  const resolvedProjectId = resolveProjectId(projectId);

  // Cancel any pending save debounce for this project to avoid a save racing with the delete
  if (debounceTimers[projectId]) {
    clearTimeout(debounceTimers[projectId]);
    delete debounceTimers[projectId];
  }
  if (projectId !== resolvedProjectId && debounceTimers[resolvedProjectId]) {
    clearTimeout(debounceTimers[resolvedProjectId]);
    delete debounceTimers[resolvedProjectId];
  }

  if (!sourceUserId) {
    await refreshSyncState(null);
    return false;
  }

  // Also clear any queued save for this project — no point saving something we're deleting
  await clearQueuedAction(sourceUserId, resolvedProjectId, 'save');

  if (!canSyncToCloudForUser(sourceUserId)) {
    await addToQueue('delete', resolvedProjectId, null, sourceUserId);
    return false;
  }

  try {
    const success = await cloudDeleteProject(resolvedProjectId);
    if (!success) {
      await addToQueue('delete', resolvedProjectId, null, sourceUserId);
    } else {
      await clearQueuedAction(sourceUserId, resolvedProjectId, 'delete');
      await refreshSyncState(sourceUserId);
    }
    return success;
  } catch {
    await addToQueue('delete', resolvedProjectId, null, sourceUserId);
    return false;
  }
}

/**
 * Pull latest from cloud and merge with local DB.
 * Cloud wins on conflict (by updated_at timestamp).
 * Orphan deletion is skipped for projects that have a pending save in the queue.
 */
/**
 * Merge a cloud-pulled project with the existing local version.
 * Cloud wins on scalar pricing fields, but local-only fields (breakdown,
 * customPricingHistory, full customPricing studio config) are preserved
 * from the local copy when the cloud payload doesn't include them.
 */
function mergeCloudProjectWithLocal(cloudProject, localProject) {
  if (!localProject) return cloudProject;

  // Build a map of local items by id for O(1) lookup
  const localItemMap = new Map();
  for (const section of localProject.sections || []) {
    for (const item of section.items || []) {
      if (item.id) localItemMap.set(item.id, item);
    }
  }

  const mergedSections = (cloudProject.sections || []).map(cloudSection => {
    const mergedItems = (cloudSection.items || []).map(cloudItem => {
      const local = localItemMap.get(cloudItem.id);
      if (!local) return cloudItem;

      // Cloud values win for pricing outputs
      // Local values fill in fields the cloud no longer stores
      return {
        ...local,           // start with full local (has breakdown, history, etc.)
        ...cloudItem,       // cloud wins on all scalar fields
        // Restore local-only fields that are stripped before cloud upload
        breakdown: local.breakdown || null,
        customPricingHistory: local.customPricingHistory || null,
        // Restore full customPricing studio config if cloud only has the summary
        customPricing: cloudItem.customPricing
          ? {
              ...(local.customPricing || {}),  // local has full arrays
              ...cloudItem.customPricing,       // cloud summary wins for scalars
            }
          : local.customPricing || null,
      };
    });

    return { ...cloudSection, items: mergedItems };
  });

  return { ...cloudProject, sections: mergedSections };
}

export async function pullFromCloud() {
  const syncUserId = getAuthenticatedUserId();
  if (!canSyncToCloudForUser(syncUserId)) {
    await refreshSyncState(getLocalUserId());
    return null;
  }

  setSyncState('syncing');

  try {
    const cloudProjects = await getProjects();
    const localProjects = await loadLocal();

    const localMap = new Map(localProjects.map(p => [p.id, p]));
    const localOriginMap = new Map(
      localProjects
        .filter(project => project?.local_origin_id)
        .map(project => [project.local_origin_id, project])
    );

    // Collect project IDs that have a pending save in the queue (must not be deleted locally)
    const queuedItems = await getQueuedItemsForUser(syncUserId);
    const queuedSaveProjectIds = new Set(
      queuedItems
        .filter(item => item.action === 'save')
        .map(item => item.projectId)
    );

    // Merge: cloud data wins for existing projects
    for (const cp of cloudProjects) {
      const cloudTime = cp.updated_at?.toMillis?.() || cp.updated_at?.seconds * 1000 || 0;
      const originLinkedLocal = cp.local_origin_id ? (localMap.get(cp.local_origin_id) || localOriginMap.get(cp.local_origin_id)) : null;
      const localVersion = localMap.get(cp.id) || originLinkedLocal;
      const localTime = localVersion?.updatedAt || 0;

      if (!localVersion || cloudTime >= localTime) {
        if (originLinkedLocal && originLinkedLocal.id !== cp.id) {
          await localDB.projects.delete(originLinkedLocal.id);
          await remapQueuedProject(syncUserId, originLinkedLocal.id, cp.id);
          notifyIdChange(originLinkedLocal.id, cp.id);
        }

        // Merge cloud (stripped) with local (rich) so breakdown/customPricing detail is preserved
        const projectToWrite = mergeCloudProjectWithLocal(cp, localVersion);

        await saveLocal({
          ...projectToWrite,
          userId: auth.currentUser.uid,
          local_origin_id: cp.local_origin_id || localVersion?.local_origin_id || null,
        }, {
          source: 'cloud',
          userId: auth.currentUser.uid,
          updatedAt: cloudTime || Date.now(),
          cloudSyncedAt: cloudTime || Date.now(),
        });
      }
    }

    // Check for local-only projects that need syncing
    const cloudIds = new Set(cloudProjects.map(p => p.id));
    const cloudOriginIds = new Set(cloudProjects.map(p => p.local_origin_id).filter(Boolean));
    for (const lp of localProjects) {
      if (cloudOriginIds.has(lp.id)) {
        await localDB.projects.delete(lp.id);
        continue;
      }
      if (!cloudIds.has(lp.id) && !lp.id.startsWith('local_')) {
        // Guard: don't delete if there's a pending save queued — it may have just been created
        if (queuedSaveProjectIds.has(lp.id)) continue;
        const lastProtectedAt = Math.max(
          lp.updatedAt || 0,
          toSaveTimestamp(lp?.saveMeta?.lastLocalSaveAt),
          toSaveTimestamp(lp?.saveMeta?.lastCloudSyncAt)
        );
        const nextMissCount = (Number(lp?.saveMeta?.cloudMissCount) || 0) + 1;

        if (Date.now() - lastProtectedAt < MISSING_CLOUD_GRACE_MS || nextMissCount < MISSING_CLOUD_DELETE_THRESHOLD) {
          await saveLocal(lp, {
            userId: lp.userId || syncUserId,
            updatedAt: lp.updatedAt || Date.now(),
            metaPatch: {
              cloudMissCount: nextMissCount,
              lastMissingFromCloudAt: Date.now(),
            }
          });
          continue;
        }

        // Project has been missing from repeated cloud pulls long enough to treat as deleted
        await localDB.projects.delete(lp.id);
      }
      // local_ projects stay — they'll be synced via queue
    }

    const merged = await loadLocal();
    await refreshSyncState(syncUserId);
    return merged;
  } catch (err) {
    console.warn('⚠️ Pull from cloud failed:', err.message);
    await refreshSyncState(syncUserId || getLocalUserId());
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ID change notifications (for when local_ IDs get real IDs)
// ─────────────────────────────────────────────────────────────────────────────
let idChangeListeners = [];

export function onIdChange(callback) {
  idChangeListeners.push(callback);
  return () => { idChangeListeners = idChangeListeners.filter(fn => fn !== callback); };
}

function notifyIdChange(oldId, newId) {
  if (oldId && newId && oldId !== newId) {
    projectIdRedirects.set(oldId, newId);
  }
  idChangeListeners.forEach(fn => fn(oldId, newId));
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto Sync (start/stop)
// ─────────────────────────────────────────────────────────────────────────────

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    processQueue();
  }
}

export function startAutoSync() {
  if (autoSyncInterval) return;

  // Run legacy migration exactly once at startup
  const userId = getLocalUserId();
  if (userId) migrateLegacyQueueItems(userId);

  // Process queue on a regular interval
  autoSyncInterval = setInterval(() => {
    processQueue();
  }, AUTO_SYNC_INTERVAL_MS);

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Trigger processQueue when the user switches back to the tab
  if (!visibilityListenerAdded) {
    document.addEventListener('visibilitychange', onVisibilityChange);
    visibilityListenerAdded = true;
  }

  // Initial queue check
  processQueue();
}

export function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);

  if (visibilityListenerAdded) {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    visibilityListenerAdded = false;
  }
}

function onOnline() {
  setSyncState('pending');
  // Add random jitter to avoid thundering-herd when many clients reconnect simultaneously
  const jitter = Math.floor(Math.random() * RECONNECT_JITTER_MS);
  setTimeout(() => {
    processQueue();
    pullFromCloud();
  }, jitter);
}

function onOffline() {
  pendingCount = 0;
  setSyncState('offline');
}
