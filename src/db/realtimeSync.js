import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const MAX_LISTENER_RETRIES = 3;
const LISTENER_RETRY_DELAY_MS = 5000;

/**
 * Subscribe to real-time updates for a specific project.
 * Automatically retries up to MAX_LISTENER_RETRIES times on error.
 *
 * @param {string} projectId - Firestore document ID
 * @param {function} onUpdate - Called with the updated project object
 * @param {function} onError - Called on listener error (after retries exhausted)
 * @returns {function} unsubscribe - Call to stop listening
 */
export function subscribeToProject(projectId, onUpdate, onError = null) {
  if (!projectId || projectId.startsWith('local_')) {
    // Can't subscribe to local-only projects
    return () => {};
  }

  let retries = 0;
  let stopped = false;
  let currentUnsubscribe = null;

  function attach() {
    if (stopped) return;

    const docRef = doc(db, 'projects', projectId);

    currentUnsubscribe = onSnapshot(
      docRef,
      { includeMetadataChanges: false },
      (snapshot) => {
        // Reset retry counter on a successful read
        retries = 0;

        if (!snapshot.exists()) return;

        // Skip locally-originated changes (hasPendingWrites means this user wrote it)
        if (snapshot.metadata.hasPendingWrites) return;

        const data = { id: snapshot.id, ...snapshot.data() };
        onUpdate(data);
      },
      (error) => {
        console.warn('⚠️ Real-time listener error:', error.message);

        if (stopped) return;

        if (retries < MAX_LISTENER_RETRIES) {
          retries += 1;
          console.info(`↻ Retrying real-time listener for ${projectId} (attempt ${retries}/${MAX_LISTENER_RETRIES})…`);
          setTimeout(attach, LISTENER_RETRY_DELAY_MS * retries);
        } else {
          console.warn(`⛔ Real-time listener for ${projectId} exhausted retries.`);
          if (onError) onError(error);
        }
      }
    );
  }

  attach();

  return () => {
    stopped = true;
    if (currentUnsubscribe) currentUnsubscribe();
  };
}
