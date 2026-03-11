import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * Subscribe to real-time updates for a specific project.
 * When another collaborator edits the project, the callback fires with the new data.
 *
 * @param {string} projectId - Firestore document ID
 * @param {function} onUpdate - Called with the updated project object
 * @param {function} onError - Called on listener error
 * @returns {function} unsubscribe - Call to stop listening
 */
export function subscribeToProject(projectId, onUpdate, onError = null) {
  if (!projectId || projectId.startsWith('local_')) {
    // Can't subscribe to local-only projects
    return () => {};
  }

  const docRef = doc(db, 'projects', projectId);

  const unsubscribe = onSnapshot(
    docRef,
    { includeMetadataChanges: false },
    (snapshot) => {
      if (!snapshot.exists()) return;

      // Skip locally-originated changes (hasPendingWrites means this user wrote it)
      if (snapshot.metadata.hasPendingWrites) return;

      const data = { id: snapshot.id, ...snapshot.data() };
      onUpdate(data);
    },
    (error) => {
      console.warn('⚠️ Real-time listener error:', error.message);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}
