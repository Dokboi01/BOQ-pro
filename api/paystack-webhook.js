import { handleOptions, readRawBody, sendJson } from './_lib/http.js';
import { verifyPaystackWebhookSignature } from './_lib/paystack.js';
import { syncSubscriptionProfileFromWebhook } from './_lib/subscriptionSync.js';

// Disable Vercel's automatic JSON body parsing so the raw request bytes are
// preserved for Paystack HMAC-SHA512 signature verification.
export const config = { api: { bodyParser: false } };

const HANDLED_EVENTS = new Set([
  'charge.success',
  'subscription.create',
  'subscription.not_renew',
  'subscription.disable',
  'invoice.payment_failed',
  'invoice.update',
]);

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(req, res, 405, { error: 'Method not allowed.' });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['x-paystack-signature'];

    if (!verifyPaystackWebhookSignature(rawBody, signature)) {
      return sendJson(req, res, 401, { error: 'Invalid webhook signature.' });
    }

    const event = JSON.parse(rawBody);
    const eventName = event?.event || null;

    // Skip Firestore lookups for events we don't handle
    if (eventName && HANDLED_EVENTS.has(eventName)) {
      await syncSubscriptionProfileFromWebhook(eventName, event?.data);
    }

    return sendJson(req, res, 200, {
      received: true,
      event: eventName,
    });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    return sendJson(req, res, 500, {
      error: error.message || 'Failed to process Paystack webhook.',
    });
  }
}
