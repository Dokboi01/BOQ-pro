import localDB from './localDB';
import { saveProject, getProjects, deleteProject as cloudDeleteProject } from './database';
import { auth } from './firebase';

// ─────────────────────────────────────────────────────────────────────────────
// Sync State
// ─────────────────────────────────────────────────────────────────────────────
let syncState = 'synced'; // 'synced' | 'syncing' | 'pending' | 'offline'
let listeners = [];
let debounceTimers = {};
let autoSyncInterval = null;
const projectIdRedirects = new Map();

function getLocalUserId() {
  if (auth.currentUser?.uid) return auth.currentUser.uid;

  try {
    const cached = localStorage.getItem('boq_pro_profile');
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

async function getQueuedItemsForUser(userId = getLocalUserId()) {
  if (!userId) return [];

  await migrateLegacyQueueItems(userId);
  const queuedItems = await localDB.syncQueue.where('userId').equals(userId).toArray();
  return queuedItems.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

async function getPendingQueueCount(userId = getLocalUserId()) {
  if (!userId) return 0;
  await migrateLegacyQueueItems(userId);
  return localDB.syncQueue.where('userId').equals(userId).count();
}

async function refreshSyncState(userId = getLocalUserId()) {
  if (!navigator.onLine) {
    setSyncState('offline');
    return;
  }

  const pendingCount = await getPendingQueueCount(userId);
  setSyncState(pendingCount > 0 ? 'pending' : 'synced');
}

async function migrateLegacyQueueItems(userId) {
  if (!userId) return;

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
  await localDB.projects.put({
    ...(existingProject || {}),
    ...localProject,
    id: newProjectId,
    userId: existingProject?.userId || localProject.userId || userId,
    local_origin_id: existingProject?.local_origin_id || localProject.local_origin_id || oldProjectId,
  });

  await remapQueuedProject(userId, oldProjectId, newProjectId);
}

function notifyListeners() {
  listeners.forEach(fn => fn(getSyncStatus()));
}

export function onSyncStatusChange(callback) {
  listeners.push(callback);
  return () => { listeners = listeners.filter(fn => fn !== callback); };
}

export function getSyncStatus() {
  return {
    state: navigator.onLine ? syncState : 'offline',
  };
}

function setSyncState(state) {
  syncState = state;
  notifyListeners();
}

// ─────────────────────────────────────────────────────────────────────────────
// Local DB Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a project to local Dexie DB
 */
export async function saveLocal(project) {
  const userId = getLocalUserId();
  if (!userId) return;

  const record = {
    ...project,
    userId,
    updatedAt: Date.now(),
  };

  await localDB.projects.put(record);
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
 * Process all queued sync operations
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
  if (queue.length === 0) {
    setSyncState('synced');
    return;
  }

  setSyncState('syncing');

  for (const item of queue) {
    try {
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
      await localDB.syncQueue.update(item.id, {
        retries: (item.retries || 0) + 1,
        lastError: err.message || 'Unknown sync error',
        lastTriedAt: Date.now(),
      });
    }
  }

  await refreshSyncState(syncUserId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cloud Sync Operations (with debounce + queue)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sync a project to cloud (debounced, with queue fallback)
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
      return;
    }

    setSyncState('syncing');

    try {
      const savedId = await saveProject(nextProject);
      if (savedId) {
        if (resolvedProjectId.startsWith('local_') && savedId !== resolvedProjectId) {
          await promoteLocalProjectId(resolvedProjectId, savedId, sourceUserId);
          notifyIdChange(resolvedProjectId, savedId);
        }
        await clearQueuedAction(sourceUserId, resolvedProjectId, 'save');
        await refreshSyncState(sourceUserId);
      } else {
        await addToQueue('save', resolvedProjectId, nextProject, sourceUserId);
      }
    } catch (err) {
      console.warn('⚠️ Cloud sync failed, queuing:', err.message);
      await addToQueue('save', resolvedProjectId, nextProject, sourceUserId);
    }
  }, 800);
}

/**
 * Sync a delete operation to cloud
 */
export async function syncDeleteToCloud(projectId) {
  const sourceUserId = getAuthenticatedUserId() || getLocalUserId();
  const resolvedProjectId = resolveProjectId(projectId);

  if (!sourceUserId) {
    await refreshSyncState(null);
    return false;
  }

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
 * Pull latest from cloud and merge with local DB
 * Cloud wins on conflict (by updated_at timestamp)
 */
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

        await localDB.projects.put({
          ...cp,
          userId: auth.currentUser.uid,
          local_origin_id: cp.local_origin_id || localVersion?.local_origin_id || null,
          updatedAt: cloudTime || Date.now(),
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
        // Project was deleted from cloud — remove locally too
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

export function startAutoSync() {
  if (autoSyncInterval) return;

  // Process queue every 30 seconds
  autoSyncInterval = setInterval(() => {
    processQueue();
  }, 30000);

  // Process queue immediately when coming back online
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

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
}

function onOnline() {
  setSyncState('pending');
  processQueue();
  // Also pull latest from cloud when reconnecting
  pullFromCloud();
}

function onOffline() {
  setSyncState('offline');
}
