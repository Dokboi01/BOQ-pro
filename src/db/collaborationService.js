import { db, auth } from './firebase';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// Collaborator Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invite a collaborator by email
 * @param {string} projectId
 * @param {string} email
 * @param {'editor'|'viewer'} role
 */
export async function inviteCollaborator(projectId, email, role = 'editor') {
  if (!projectId || projectId.startsWith('local_')) {
    return { success: false, error: 'Project must be synced to cloud before sharing.' };
  }

  try {
    const docRef = doc(db, 'projects', projectId);
    const collaborator = {
      email: email.toLowerCase().trim(),
      role,
      addedAt: new Date().toISOString(),
      addedBy: auth.currentUser?.email || 'unknown',
    };

    await updateDoc(docRef, {
      collaborators: arrayUnion(collaborator),
    });

    // Log the activity
    await logActivity(projectId, 'collaborator_invited', {
      email: collaborator.email,
      role,
    });

    return { success: true };
  } catch (err) {
    console.error('Invite collaborator error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Remove a collaborator by email
 */
export async function removeCollaborator(projectId, email) {
  try {
    const docRef = doc(db, 'projects', projectId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return { success: false, error: 'Project not found' };

    const data = snapshot.data();
    const collaborator = (data.collaborators || []).find(
      (c) => c.email === email.toLowerCase().trim()
    );

    if (collaborator) {
      await updateDoc(docRef, {
        collaborators: arrayRemove(collaborator),
      });

      await logActivity(projectId, 'collaborator_removed', { email });
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get collaborators for a project
 */
export async function getCollaborators(projectId) {
  try {
    const snapshot = await getDoc(doc(db, 'projects', projectId));
    if (!snapshot.exists()) return [];
    return snapshot.data().collaborators || [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Presence System
// ─────────────────────────────────────────────────────────────────────────────

let presenceInterval = null;

/**
 * Set current user as present on a project.
 * Pings every 60 seconds to keep presence alive.
 */
export function startPresence(projectId) {
  if (!projectId || projectId.startsWith('local_') || !auth.currentUser) return;

  const writePresence = async () => {
    try {
      const presenceRef = doc(db, 'projects', projectId, 'presence', auth.currentUser.uid);
      await setDoc(presenceRef, {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName || 'User',
        lastSeen: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Presence write failed:', err.message);
    }
  };

  // Write immediately, then every 60s
  writePresence();
  presenceInterval = setInterval(writePresence, 60000);
}

/**
 * Stop presence heartbeat and remove this user's presence doc
 */
export function stopPresence(projectId) {
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }

  if (projectId && !projectId.startsWith('local_') && auth.currentUser) {
    const presenceRef = doc(db, 'projects', projectId, 'presence', auth.currentUser.uid);
    deleteDoc(presenceRef).catch(() => {});
  }
}

/**
 * Subscribe to presence changes for a project.
 * Only returns users seen in the last 2 minutes.
 */
export function subscribeToPresence(projectId, callback) {
  if (!projectId || projectId.startsWith('local_')) {
    callback([]);
    return () => {};
  }

  const presenceCol = collection(db, 'projects', projectId, 'presence');

  const unsubscribe = onSnapshot(presenceCol, (snapshot) => {
    const now = Date.now();
    const twoMinutesAgo = now - 2 * 60 * 1000;

    const activeUsers = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((u) => {
        const lastSeen = u.lastSeen?.toMillis?.() || u.lastSeen?.seconds * 1000 || 0;
        return lastSeen > twoMinutesAgo;
      });

    callback(activeUsers);
  });

  return unsubscribe;
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity Log
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_LABELS = {
  item_edited: '✏️ Edited item',
  section_added: '📂 Added section',
  section_deleted: '🗑️ Deleted section',
  rate_changed: '💰 Changed rate',
  project_created: '🆕 Created project',
  project_updated: '📝 Updated project',
  collaborator_invited: '👤 Invited collaborator',
  collaborator_removed: '👤 Removed collaborator',
  message_sent: '💬 Sent message',
  task_created: '✅ Created task',
  task_updated: '🔧 Updated task',
};

/**
 * Log an activity to the project's activity subcollection
 */
export async function logActivity(projectId, action, details = {}) {
  if (!projectId || projectId.startsWith('local_') || !auth.currentUser) return;

  try {
    const activityCol = collection(db, 'projects', projectId, 'activity');
    await addDoc(activityCol, {
      action,
      label: ACTION_LABELS[action] || action,
      details,
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      userName: auth.currentUser.displayName || 'User',
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // Activity logging is non-critical — don't break the flow
    console.warn('Activity log failed:', err.message);
  }
}

/**
 * Get recent activity entries for a project
 */
export async function getRecentActivity(projectId, maxEntries = 20) {
  if (!projectId || projectId.startsWith('local_')) return [];

  try {
    const activityCol = collection(db, 'projects', projectId, 'activity');
    const q = query(activityCol, orderBy('timestamp', 'desc'), limit(maxEntries));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate?.() || new Date(),
    }));
  } catch (err) {
    console.warn('Failed to fetch activity:', err.message);
    return [];
  }
}

/**
 * Subscribe to real-time activity updates
 */
export function subscribeToActivity(projectId, callback, maxEntries = 15) {
  if (!projectId || projectId.startsWith('local_')) {
    callback([]);
    return () => {};
  }

  const activityCol = collection(db, 'projects', projectId, 'activity');
  const q = query(activityCol, orderBy('timestamp', 'desc'), limit(maxEntries));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate?.() || new Date(),
    }));
    callback(entries);
  });

  return unsubscribe;
}

export async function sendProjectMessage(projectId, text) {
  if (!projectId || projectId.startsWith('local_') || !auth.currentUser) {
    return { success: false, error: 'Project must be synced before team messaging is available.' };
  }

  const cleanText = String(text || '').trim();
  if (!cleanText) return { success: false, error: 'Message cannot be empty.' };

  try {
    const messagesCol = collection(db, 'projects', projectId, 'messages');
    await addDoc(messagesCol, {
      text: cleanText,
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      userName: auth.currentUser.displayName || 'User',
      createdAt: serverTimestamp(),
    });

    await logActivity(projectId, 'message_sent', {
      preview: cleanText.slice(0, 80),
    });

    return { success: true };
  } catch (err) {
    console.warn('Send message failed:', err.message);
    return { success: false, error: err.message };
  }
}

export function subscribeToMessages(projectId, callback, maxEntries = 50) {
  if (!projectId || projectId.startsWith('local_')) {
    callback([]);
    return () => {};
  }

  const messagesCol = collection(db, 'projects', projectId, 'messages');
  const q = query(messagesCol, orderBy('createdAt', 'asc'), limit(maxEntries));

  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || new Date(),
    }));
    callback(entries);
  });
}

export async function createProjectTask(projectId, task = {}) {
  if (!projectId || projectId.startsWith('local_') || !auth.currentUser) {
    return { success: false, error: 'Project must be synced before tasks are available.' };
  }

  const title = String(task.title || '').trim();
  if (!title) return { success: false, error: 'Task title is required.' };

  try {
    const taskCol = collection(db, 'projects', projectId, 'tasks');
    await addDoc(taskCol, {
      title,
      description: String(task.description || '').trim(),
      assigneeEmail: String(task.assigneeEmail || '').trim().toLowerCase(),
      status: task.status || 'todo',
      dueDate: task.dueDate ? Timestamp.fromDate(new Date(task.dueDate)) : null,
      createdById: auth.currentUser.uid,
      createdByEmail: auth.currentUser.email,
      createdByName: auth.currentUser.displayName || 'User',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await logActivity(projectId, 'task_created', {
      title,
      assigneeEmail: String(task.assigneeEmail || '').trim().toLowerCase(),
    });

    return { success: true };
  } catch (err) {
    console.warn('Create task failed:', err.message);
    return { success: false, error: err.message };
  }
}

export async function updateProjectTask(projectId, taskId, updates = {}) {
  if (!projectId || projectId.startsWith('local_') || !taskId || !auth.currentUser) {
    return { success: false, error: 'Task update is unavailable.' };
  }

  try {
    const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
    const payload = {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedById: auth.currentUser.uid,
      updatedByEmail: auth.currentUser.email,
      updatedByName: auth.currentUser.displayName || 'User',
    };

    if (payload.assigneeEmail !== undefined) {
      payload.assigneeEmail = String(payload.assigneeEmail || '').trim().toLowerCase();
    }
    if (payload.dueDate !== undefined) {
      payload.dueDate = payload.dueDate ? Timestamp.fromDate(new Date(payload.dueDate)) : null;
    }

    await updateDoc(taskRef, payload);

    await logActivity(projectId, 'task_updated', {
      taskId,
      status: updates.status,
      title: updates.title,
    });

    return { success: true };
  } catch (err) {
    console.warn('Update task failed:', err.message);
    return { success: false, error: err.message };
  }
}

export function subscribeToTasks(projectId, callback, maxEntries = 50) {
  if (!projectId || projectId.startsWith('local_')) {
    callback([]);
    return () => {};
  }

  const taskCol = collection(db, 'projects', projectId, 'tasks');
  const q = query(taskCol, orderBy('createdAt', 'desc'), limit(maxEntries));

  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || new Date(),
      updatedAt: d.data().updatedAt?.toDate?.() || null,
      dueDate: d.data().dueDate?.toDate?.() || null,
    }));
    callback(entries);
  });
}
