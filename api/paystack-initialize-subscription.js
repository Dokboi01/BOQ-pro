import { handleOptions, readJsonBody, sendJson } from './_lib/http.js';
import { requireFirebaseAuth } from './_lib/firebase-auth.js';
import { initializeSubscriptionTransaction } from './_lib/paystack.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(req, res, 405, { error: 'Method not allowed.' });
  }

  try {
    const authClaims = await requireFirebaseAuth(req);
    const body = await readJsonBody(req);
    const planName = String(body?.planName || '').trim();
    const billingCycle = body?.billingCycle === 'annual' ? 'annual' : 'monthly';
    const callbackUrl = body?.callbackUrl ? String(body.callbackUrl).trim() : null;
    const origin = req.headers.origin || body?.origin || null;
    const email = String(authClaims?.email || '').trim().toLowerCase();
    const userId = String(authClaims?.user_id || authClaims?.sub || '').trim();

    if (!planName || !email || !userId) {
      return sendJson(req, res, 400, { error: 'Missing required fields: planName, billingCycle, email, userId.' });
    }

    const payload = await initializeSubscriptionTransaction({
      planName,
      billingCycle,
      email,
      userId,
      callbackUrl,
      origin,
    });

    return sendJson(req, res, 200, {
      success: true,
      ...payload,
    });
  } catch (error) {
    console.error('Paystack initialize error:', error);
    return sendJson(req, res, Number(error.status || 500), {
      error: error.message || 'Failed to initialize Paystack subscription checkout.',
    });
  }
}
