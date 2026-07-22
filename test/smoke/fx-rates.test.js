import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  refreshLiveFxRates,
  getLiveFxRateToNgn,
  getLiveFxRatesFetchedAt,
  __resetFxRatesCacheForTests,
} from '../../src/utils/fxRates.js';

describe('Live FX rates', () => {
  beforeEach(() => {
    __resetFxRatesCacheForTests();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('refreshLiveFxRates', () => {
    it('fetches from the fx-rates endpoint and caches the result', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          base: 'NGN',
          ratesToNgn: { USD: 1650.5, GBP: 2100.25 },
          fetchedAt: '2026-07-22T00:00:00.000Z',
        }),
      });

      const result = await refreshLiveFxRates();

      expect(global.fetch).toHaveBeenCalledWith('/api/fx-rates');
      expect(result.ratesToNgn).toEqual({ USD: 1650.5, GBP: 2100.25 });
      expect(getLiveFxRateToNgn('USD')).toBe(1650.5);
      expect(getLiveFxRateToNgn('GBP')).toBe(2100.25);
      expect(getLiveFxRatesFetchedAt()).toBe('2026-07-22T00:00:00.000Z');
    });

    it('returns null and leaves the cache untouched when the endpoint fails', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 502 });

      const result = await refreshLiveFxRates();

      expect(result).toBeNull();
      expect(getLiveFxRateToNgn('USD')).toBeNull();
    });

    it('returns null when fetch itself throws (e.g. offline)', async () => {
      global.fetch.mockRejectedValue(new Error('network error'));

      const result = await refreshLiveFxRates();

      expect(result).toBeNull();
      expect(getLiveFxRateToNgn('USD')).toBeNull();
    });

    it('shares a single in-flight request across concurrent callers', async () => {
      let resolveResponse;
      global.fetch.mockReturnValue(new Promise((resolve) => { resolveResponse = resolve; }));

      const firstCall = refreshLiveFxRates();
      const secondCall = refreshLiveFxRates();

      resolveResponse({
        ok: true,
        json: async () => ({ ratesToNgn: { USD: 1600 }, fetchedAt: '2026-07-22T00:00:00.000Z' }),
      });

      await Promise.all([firstCall, secondCall]);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getLiveFxRateToNgn', () => {
    it('returns null before any fetch has completed', () => {
      expect(getLiveFxRateToNgn('USD')).toBeNull();
    });

    it('is case-insensitive for currency codes', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ratesToNgn: { USD: 1600 }, fetchedAt: null }),
      });
      await refreshLiveFxRates();

      expect(getLiveFxRateToNgn('usd')).toBe(1600);
    });

    it('returns null for a currency with no cached rate', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ratesToNgn: { USD: 1600 }, fetchedAt: null }),
      });
      await refreshLiveFxRates();

      expect(getLiveFxRateToNgn('GBP')).toBeNull();
    });
  });
});
