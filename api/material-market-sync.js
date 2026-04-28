/* global process */

import { handleOptions, readJsonBody, sendJson } from './_lib/http.js';
import { runMaterialMarketSync } from './_lib/materialMarketSync.js';

const isAuthorized = (req) => {
  const secret = process.env.MARKET_SYNC_SECRET || process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV !== 'production') {
    return true;
  }

  const authHeader = req.headers.authorization || '';
  return authHeader === `Bearer ${secret}`;
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (!['GET', 'POST'].includes(req.method)) {
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  if (!isAuthorized(req)) {
    return sendJson(res, 401, { error: 'Unauthorized.' });
  }

  try {
    const body = req.method === 'POST' ? await readJsonBody(req) : {};
    const actor = String(body?.actor || '').trim() || 'BOQ Pro Market Desk';
    const summary = await runMaterialMarketSync({ actor });

    return sendJson(res, 200, {
      success: true,
      actor,
      summary,
    });
  } catch (error) {
    console.error('Material market sync failed:', error);
    return sendJson(res, 500, {
      error: error.message || 'Material market sync failed.',
    });
  }
}
