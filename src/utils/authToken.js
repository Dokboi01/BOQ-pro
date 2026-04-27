import { auth } from '../db/firebase';

export async function getCurrentIdToken() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}
