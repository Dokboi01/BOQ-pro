import Dexie from 'dexie';

/**
 * Local database for offline-first storage.
 * Projects are stored locally for instant access, then synced to Firebase.
 */
const localDB = new Dexie('BOQProDB');

localDB.version(1).stores({
  // Projects table — keyed by id, indexed by userId and updatedAt
  projects: 'id, userId, updatedAt',
  // Sync queue — pending operations to push to cloud
  syncQueue: '++id, action, projectId, createdAt',
});

localDB.version(2).stores({
  projects: 'id, userId, updatedAt',
  syncQueue: '++id, userId, action, projectId, createdAt, [userId+projectId+action]',
});

export default localDB;
