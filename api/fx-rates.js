import { handleOptions, sendJson } from './_lib/http.js';
import { SUPPORTED_CURRENCIES } from '../src/data/currencies.js';

// Free, keyless endpoint (https://www.exchangerate-api.com/docs/free) --
// rates refresh daily upstream, which is appropriate for BOQ/tender pricing
// (not a trading application). Fetching NGN as the base gives rates as
// "1 NGN = X <currency>"; we invert to "1 <currency> = X NGN" to match how
// fxRateToNgn is used everywhere else in the app.
const UPSTREAM_URL = 'https://open.er-api.com/v6/latest/NGN';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return sendJson(req, res, 405, { error: 'Method not allowed.' });
  }

  try {
    const upstreamResponse = await fetch(UPSTREAM_URL);
    if (!upstreamResponse.ok) {
      throw new Error(`Upstream FX provider returned ${upstreamResponse.status}`);
    }

    const upstreamData = await upstreamResponse.json();
    if (upstreamData?.result !== 'success' || !upstreamData?.rates) {
      throw new Error('Upstream FX provider returned an unexpected payload.');
    }

    const ratesToNgn = SUPPORTED_CURRENCIES.reduce((acc, currency) => {
      if (currency.code === 'NGN') {
        acc.NGN = 1;
        return acc;
      }

      const ngnPerUnit = upstreamData.rates[currency.code];
      if (typeof ngnPerUnit === 'number' && ngnPerUnit > 0) {
        acc[currency.code] = 1 / ngnPerUnit;
      }

      return acc;
    }, {});

    // CDN-cached for 6h so bursts of app loads don't hammer the upstream
    // provider; stale-while-revalidate keeps responses fast while refreshing
    // in the background.
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');

    return sendJson(req, res, 200, {
      base: 'NGN',
      ratesToNgn,
      fetchedAt: upstreamData.time_last_update_utc || new Date().toISOString(),
      nextUpdateAt: upstreamData.time_next_update_utc || null,
    });
  } catch (error) {
    console.error('FX rate fetch failed:', error);
    return sendJson(req, res, 502, {
      error: error.message || 'Failed to fetch live exchange rates.',
    });
  }
}
