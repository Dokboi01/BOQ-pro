/* global process */

// Handles both the scheduled cron trigger (see vercel.json's `crons` entry,
// GET + CRON_SECRET) and manual/admin invocation (GET or POST + MARKET_SYNC_SECRET,
// or unauthenticated in local dev). Merged from the former separate
// cron-material-market-sync.js -- Vercel's Hobby plan caps a deployment at 12
// Serverless Functions, and having both as standalone functions pushed the
// project over that limit (see git history for the standalone cron handler).

import { handleOptions, readJsonBody, sendJson } from './_lib/http.js';
import { runMaterialMarketSync } from './_lib/materialMarketSync.js';

const isCronRequest = (req) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return (req.headers.authorization || '') === `Bearer ${cronSecret}`;
};

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
    const defaultActor = isCronRequest(req) ? 'Quantra Market Bot' : 'Quantra Market Desk';
    const actor = String(body?.actor || '').trim() || defaultActor;
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
