import { handleOptions, readJsonBody, sendJson } from './_lib/http.js';
import { initializeSubscriptionTransaction } from './_lib/paystack.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const body = await readJsonBody(req);
    const planName = String(body?.planName || '').trim();
    const billingCycle = body?.billingCycle === 'annual' ? 'annual' : 'monthly';
    const email = String(body?.email || '').trim().toLowerCase();
    const userId = String(body?.userId || '').trim();
    const callbackUrl = body?.callbackUrl ? String(body.callbackUrl).trim() : null;
    const origin = req.headers.origin || body?.origin || null;

    if (!planName || !email || !userId) {
      return sendJson(res, 400, { error: 'Missing required fields: planName, billingCycle, email, userId.' });
    }

    const payload = await initializeSubscriptionTransaction({
      planName,
      billingCycle,
      email,
      userId,
      callbackUrl,
      origin,
    });

    return sendJson(res, 200, {
      success: true,
      ...payload,
    });
  } catch (error) {
    console.error('Paystack initialize error:', error);
    return sendJson(res, 500, {
      error: error.message || 'Failed to initialize Paystack subscription checkout.',
    });
  }
}
