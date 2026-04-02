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

// v3: adds retryAfter for exponential backoff skipping in processQueue
localDB.version(3).stores({
  projects: 'id, userId, updatedAt',
  syncQueue: '++id, userId, action, projectId, createdAt, retryAfter, [userId+projectId+action]',
});

// v4: adds separate breakdowns table so heavy per-item breakdown arrays are stored
//     independently from the project document. Projects table stays lean for fast reads.
//     breakdowns are local-only — never synced to Firestore.
localDB.version(4).stores({
  projects: 'id, userId, updatedAt',
  syncQueue: '++id, userId, action, projectId, createdAt, retryAfter, [userId+projectId+action]',
  breakdowns: '[projectId+itemId], projectId',
});

export default localDB;
