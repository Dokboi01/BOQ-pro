/* global process */

import { handleOptions, sendJson } from './_lib/http.js';
import { runMaterialMarketSync } from './_lib/materialMarketSync.js';

const isCronAuthorized = (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.authorization || '';
  return authHeader === `Bearer ${secret}`;
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  if (!isCronAuthorized(req)) {
    return sendJson(res, 401, { error: 'Unauthorized.' });
  }

  try {
    const summary = await runMaterialMarketSync({ actor: 'BOQ Pro Market Bot' });
    return sendJson(res, 200, {
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Scheduled material market sync failed:', error);
    return sendJson(res, 500, {
      error: error.message || 'Scheduled material market sync failed.',
    });
  }
}
