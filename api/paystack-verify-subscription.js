import { handleOptions, readJsonBody, sendJson } from './_lib/http.js';
import { requireFirebaseAuth } from './_lib/firebase-auth.js';
import { verifySubscriptionTransaction } from './_lib/paystack.js';
import { applyVerifiedSubscriptionCharge } from './_lib/subscriptionSync.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(req, res, 405, { error: 'Method not allowed.' });
  }

  try {
    const authClaims = await requireFirebaseAuth(req);
    const body = await readJsonBody(req);
    const reference = String(body?.reference || '').trim();
    if (!reference) {
      return sendJson(req, res, 400, { error: 'Transaction reference is required.' });
    }

    const { transaction, context, expectedAmount } = await verifySubscriptionTransaction(reference);
    const transactionStatus = String(transaction?.status || '').toLowerCase();

    if (expectedAmount && Number(transaction?.amount) !== Number(expectedAmount)) {
      return sendJson(req, res, 409, {
        success: false,
        verified: false,
        status: 'amount_mismatch',
        error: 'Verified transaction amount does not match the expected plan amount.',
      });
    }

    const authUid = String(authClaims?.user_id || authClaims?.sub || '').trim();
    const authEmail = String(authClaims?.email || '').trim().toLowerCase();
    const transactionUid = String(context?.userId || '').trim();
    const transactionEmail = String(context?.email || '').trim().toLowerCase();

    if ((transactionUid && authUid && transactionUid !== authUid) || (transactionEmail && authEmail && transactionEmail !== authEmail)) {
      return sendJson(req, res, 403, {
        success: false,
        verified: false,
        status: 'forbidden',
        error: 'This transaction does not belong to the authenticated user.',
      });
    }

    if (transactionStatus !== 'success') {
      return sendJson(req, res, 200, {
        success: false,
        verified: false,
        status: transactionStatus || 'pending',
        transaction,
      });
    }

    let updatedProfile = null;
    let serverSynced = false;
    let syncWarning = null;

    try {
      updatedProfile = await applyVerifiedSubscriptionCharge(transaction);
      serverSynced = Boolean(updatedProfile);
    } catch (syncError) {
      console.warn('Paystack verification succeeded but server profile sync failed:', syncError);
      syncWarning = syncError.message || 'Profile sync failed after verification.';
    }

    return sendJson(req, res, 200, {
      success: true,
      verified: true,
      status: transactionStatus,
      transaction,
      context,
      serverSynced,
      syncWarning,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Paystack verify error:', error);
    return sendJson(req, res, Number(error.status || 500), {
      error: error.message || 'Failed to verify the Paystack transaction.',
    });
  }
}
