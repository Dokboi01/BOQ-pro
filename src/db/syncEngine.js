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

function canSyncToCloud() {
  return navigator.onLine && !!auth.currentUser;
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

async function addToQueue(action, projectId, payload) {
  // Remove any existing queued operation for this project+action to avoid duplication
  await localDB.syncQueue.where({ projectId, action }).delete();

  await localDB.syncQueue.add({
    action,        // 'save' | 'delete'
    projectId,
    payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
    retries: 0,
    createdAt: Date.now(),
  });

  setSyncState('pending');
}

/**
 * Process all queued sync operations
 */
export async function processQueue() {
  if (!canSyncToCloud()) return;

  const queue = await localDB.syncQueue.toArray();
  if (queue.length === 0) {
    setSyncState('synced');
    return;
  }

  setSyncState('syncing');

  for (const item of queue) {
    try {
      if (item.action === 'save' && item.payload) {
        const savedId = await saveProject(item.payload);
        if (savedId) {
          // If it was a local_ project, update the local DB with the real ID
          if (item.projectId.startsWith('local_') && savedId !== item.projectId) {
            const localProject = await localDB.projects.get(item.projectId);
            if (localProject) {
              await localDB.projects.delete(item.projectId);
              await localDB.projects.put({ ...localProject, id: savedId });
            }
          }
          await localDB.syncQueue.delete(item.id);
        } else {
          throw new Error('Save returned null');
        }
      } else if (item.action === 'delete') {
        const success = await cloudDeleteProject(item.projectId);
        if (success) {
          await localDB.syncQueue.delete(item.id);
        } else {
          throw new Error('Delete returned false');
        }
      }
    } catch (err) {
      console.warn(`⚠️ Sync failed for ${item.action} ${item.projectId}:`, err.message);
      // Increment retries, remove if too many
      if (item.retries >= 5) {
        console.error(`❌ Giving up on ${item.action} ${item.projectId} after 5 retries`);
        await localDB.syncQueue.delete(item.id);
      } else {
        await localDB.syncQueue.update(item.id, { retries: item.retries + 1 });
      }
    }
  }

  // Check if anything remains
  const remaining = await localDB.syncQueue.count();
  setSyncState(remaining > 0 ? 'pending' : 'synced');
}

// ─────────────────────────────────────────────────────────────────────────────
// Cloud Sync Operations (with debounce + queue)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sync a project to cloud (debounced, with queue fallback)
 */
export function syncToCloud(project) {
  // Debounce per project — avoid hammering Firestore on every keystroke
  if (debounceTimers[project.id]) {
    clearTimeout(debounceTimers[project.id]);
  }

  debounceTimers[project.id] = setTimeout(async () => {
    delete debounceTimers[project.id];

    if (!auth.currentUser) {
      setSyncState('synced');
      return;
    }

    if (!canSyncToCloud()) {
      await addToQueue('save', project.id, project);
      return;
    }

    setSyncState('syncing');

    try {
      const savedId = await saveProject(project);
      if (savedId) {
        // If local_ project got a real ID, update local DB
        if (project.id.startsWith('local_') && savedId !== project.id) {
          const localProject = await localDB.projects.get(project.id);
          if (localProject) {
            await localDB.projects.delete(project.id);
            await localDB.projects.put({ ...localProject, id: savedId });
          }
          // Return the new ID so context can update
          notifyIdChange(project.id, savedId);
        }
        setSyncState('synced');
      } else {
        await addToQueue('save', project.id, project);
      }
    } catch (err) {
      console.warn('⚠️ Cloud sync failed, queuing:', err.message);
      await addToQueue('save', project.id, project);
    }
  }, 800);
}

/**
 * Sync a delete operation to cloud
 */
export async function syncDeleteToCloud(projectId) {
  if (!auth.currentUser) {
    setSyncState('synced');
    return true;
  }

  if (!canSyncToCloud()) {
    await addToQueue('delete', projectId, null);
    return false;
  }

  try {
    const success = await cloudDeleteProject(projectId);
    if (!success) {
      await addToQueue('delete', projectId, null);
    }
    return success;
  } catch {
    await addToQueue('delete', projectId, null);
    return false;
  }
}

/**
 * Pull latest from cloud and merge with local DB
 * Cloud wins on conflict (by updated_at timestamp)
 */
export async function pullFromCloud() {
  if (!canSyncToCloud()) return null;

  setSyncState('syncing');

  try {
    const cloudProjects = await getProjects();
    const localProjects = await loadLocal();

    const localMap = new Map(localProjects.map(p => [p.id, p]));

    // Merge: cloud data wins for existing projects
    for (const cp of cloudProjects) {
      const cloudTime = cp.updated_at?.toMillis?.() || cp.updated_at?.seconds * 1000 || 0;
      const localVersion = localMap.get(cp.id);
      const localTime = localVersion?.updatedAt || 0;

      if (!localVersion || cloudTime >= localTime) {
        await localDB.projects.put({
          ...cp,
          userId: auth.currentUser.uid,
          updatedAt: cloudTime || Date.now(),
        });
      }
    }

    // Check for local-only projects that need syncing
    const cloudIds = new Set(cloudProjects.map(p => p.id));
    for (const lp of localProjects) {
      if (!cloudIds.has(lp.id) && !lp.id.startsWith('local_')) {
        // Project was deleted from cloud — remove locally too
        await localDB.projects.delete(lp.id);
      }
      // local_ projects stay — they'll be synced via queue
    }

    const merged = await loadLocal();
    setSyncState('synced');
    return merged;
  } catch (err) {
    console.warn('⚠️ Pull from cloud failed:', err.message);
    setSyncState('pending');
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
