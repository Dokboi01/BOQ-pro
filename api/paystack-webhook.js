import { handleOptions, readRawBody, sendJson } from './_lib/http.js';
import { verifyPaystackWebhookSignature } from './_lib/paystack.js';
import { syncSubscriptionProfileFromWebhook } from './_lib/subscriptionSync.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['x-paystack-signature'];

    if (!verifyPaystackWebhookSignature(rawBody, signature)) {
      return sendJson(res, 401, { error: 'Invalid webhook signature.' });
    }

    const event = JSON.parse(rawBody);
    await syncSubscriptionProfileFromWebhook(event?.event, event?.data);

    return sendJson(res, 200, {
      received: true,
      event: event?.event || null,
    });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    return sendJson(res, 500, {
      error: error.message || 'Failed to process Paystack webhook.',
    });
  }
}
