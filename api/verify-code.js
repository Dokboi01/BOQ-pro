/* global process */
import { requireFirebaseAuth } from './_lib/firebase-auth.js';
import { getDocumentByPath, patchProfileDocument, deleteDocumentByPath } from './_lib/firestore.js';

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authClaims = await requireFirebaseAuth(req);
    const uid = String(authClaims?.user_id || authClaims?.sub || '').trim();
    const email = String(authClaims?.email || '').trim().toLowerCase();

    if (!email || !uid) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const { code } = req.body;
    const cleanCode = String(code || '').trim();

    if (!cleanCode) {
      return res.status(400).json({ error: 'Please enter the verification code.' });
    }

    // Retrieve verification code details from Firestore
    const codePath = `verification_codes/${email}`;
    const storedDoc = await getDocumentByPath(codePath);

    if (!storedDoc) {
      return res.status(400).json({ error: 'No verification request found. Please request a new code.' });
    }

    const now = new Date();
    const expiresAt = new Date(storedDoc.expiresAt);

    if (now > expiresAt) {
      // Cleanup expired code
      await deleteDocumentByPath(codePath).catch(() => {});
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    if (storedDoc.code !== cleanCode) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    // Update user profile to set is_verified: true
    await patchProfileDocument(uid, {
      is_verified: true,
      updated_at: new Date().toISOString(),
    });

    // Cleanup the used verification code
    await deleteDocumentByPath(codePath).catch((err) => {
      console.warn(`⚠️ Failed to cleanup verification code doc at ${codePath}:`, err.message);
    });

    return res.status(200).json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    console.error('❌ Verify code error:', err.message);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to process request.' });
  }
}
