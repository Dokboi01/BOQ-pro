/**
 * Live exchange-rate fetching and caching.
 *
 * The upstream provider (see api/fx-rates.js) refreshes its rates once a day,
 * which is appropriate for BOQ/tender pricing -- this is not a trading
 * application and doesn't need tick-by-tick FX data. Rates are cached in
 * localStorage so the app works offline/on first paint, and re-fetched in
 * the background on a timer so a project's currency conversion catches up
 * automatically when the real-world rate moves, without a page reload.
 */

const CACHE_KEY = 'quantra_fx_rates_cache';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours -- matches the API's CDN cache window
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

let memoryCache = null;
let refreshTimer = null;
let inFlightFetch = null;

const readCacheFromStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ratesToNgn || !parsed?.cachedAt) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCacheToStorage = (cache) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage unavailable (private browsing, quota) -- in-memory cache still works.
  }
};

const isCacheFresh = (cache) => (
  Boolean(cache?.cachedAt) && (Date.now() - new Date(cache.cachedAt).getTime()) < CACHE_TTL_MS
);

/**
 * Fetches live rates from our serverless endpoint and updates both the
 * in-memory and localStorage caches. Safe to call repeatedly -- concurrent
 * calls share a single in-flight request instead of firing duplicates.
 */
export const refreshLiveFxRates = async () => {
  if (inFlightFetch) return inFlightFetch;

  inFlightFetch = (async () => {
    try {
      const response = await fetch('/api/fx-rates');
      if (!response.ok) throw new Error(`FX rate endpoint returned ${response.status}`);
      const payload = await response.json();
      if (!payload?.ratesToNgn) throw new Error('FX rate endpoint returned an unexpected payload.');

      const cache = {
        ratesToNgn: payload.ratesToNgn,
        cachedAt: new Date().toISOString(),
        fetchedAt: payload.fetchedAt || null,
      };
      memoryCache = cache;
      writeCacheToStorage(cache);
      return cache;
    } catch (error) {
      console.warn('⚠️ Could not refresh live exchange rates, using cached/seed rates:', error.message);
      return null;
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
};

/**
 * Call once at app startup. Populates the cache from localStorage
 * immediately (if fresh), and kicks off a live refresh in the background
 * (always, so a stale cache catches up) plus a recurring timer so rates
 * keep updating themselves for as long as the app stays open.
 */
export const primeLiveFxRates = () => {
  if (!memoryCache) {
    memoryCache = readCacheFromStorage();
  }

  if (!isCacheFresh(memoryCache)) {
    refreshLiveFxRates();
  }

  if (typeof window !== 'undefined' && !refreshTimer) {
    refreshTimer = window.setInterval(refreshLiveFxRates, REFRESH_INTERVAL_MS);
  }
};

/**
 * Synchronous read for use in render-time formatting code. Returns null if
 * no live rate is available yet (first load before the fetch resolves, or
 * the fetch failed) -- callers should fall back to a seed default in that case.
 */
export const getLiveFxRateToNgn = (currencyCode) => {
  if (!memoryCache) {
    memoryCache = readCacheFromStorage();
  }
  if (!memoryCache?.ratesToNgn) return null;

  const rate = memoryCache.ratesToNgn[String(currencyCode || '').toUpperCase()];
  return typeof rate === 'number' && rate > 0 ? rate : null;
};

export const getLiveFxRatesFetchedAt = () => {
  if (!memoryCache) {
    memoryCache = readCacheFromStorage();
  }
  return memoryCache?.fetchedAt || null;
};

// Exposed for tests only.
export const __resetFxRatesCacheForTests = () => {
  memoryCache = null;
  inFlightFetch = null;
  if (refreshTimer && typeof window !== 'undefined') {
    window.clearInterval(refreshTimer);
  }
  refreshTimer = null;
};
