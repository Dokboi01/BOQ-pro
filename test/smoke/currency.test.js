import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getProjectCurrencyCode,
  getProjectFxRateToNgn,
  convertNgnToProjectCurrency,
  formatProjectCurrency,
  getProjectCurrencySymbol,
} from '../../src/utils/currency.js';
import { getCurrencyDefinition, isSupportedCurrencyCode, SUPPORTED_CURRENCIES } from '../../src/data/currencies.js';
import { refreshLiveFxRates, __resetFxRatesCacheForTests } from '../../src/utils/fxRates.js';

beforeEach(() => {
  __resetFxRatesCacheForTests();
});

describe('Currency conversion', () => {
  describe('getCurrencyDefinition / isSupportedCurrencyCode', () => {
    it('resolves a known currency case-insensitively', () => {
      expect(getCurrencyDefinition('usd').code).toBe('USD');
      expect(getCurrencyDefinition('USD').symbol).toBe('$');
    });

    it('falls back to NGN for an unknown or missing currency code', () => {
      expect(getCurrencyDefinition('XYZ').code).toBe('NGN');
      expect(getCurrencyDefinition().code).toBe('NGN');
    });

    it('flags supported vs unsupported codes', () => {
      expect(isSupportedCurrencyCode('GBP')).toBe(true);
      expect(isSupportedCurrencyCode('xyz')).toBe(false);
    });

    it('every supported currency has a positive default FX rate to NGN', () => {
      SUPPORTED_CURRENCIES.forEach((currency) => {
        expect(currency.defaultFxRateToNgn).toBeGreaterThan(0);
      });
    });
  });

  describe('getProjectCurrencyCode', () => {
    it('defaults to NGN when the project has no currency set', () => {
      expect(getProjectCurrencyCode({})).toBe('NGN');
      expect(getProjectCurrencyCode(null)).toBe('NGN');
    });

    it('returns the project\'s own currency when set', () => {
      expect(getProjectCurrencyCode({ currency: 'USD' })).toBe('USD');
    });
  });

  describe('getProjectFxRateToNgn', () => {
    it('uses the project\'s own fxRateToNgn when set', () => {
      expect(getProjectFxRateToNgn({ currency: 'USD', fxRateToNgn: 1500 })).toBe(1500);
    });

    it('falls back to the currency default when the project has no explicit rate', () => {
      expect(getProjectFxRateToNgn({ currency: 'USD' })).toBe(1600);
    });

    it('falls back to the currency default for a zero or negative rate rather than dividing by it', () => {
      expect(getProjectFxRateToNgn({ currency: 'USD', fxRateToNgn: 0 })).toBe(1600);
      expect(getProjectFxRateToNgn({ currency: 'USD', fxRateToNgn: -5 })).toBe(1600);
    });

    it('NGN projects always convert 1:1', () => {
      expect(getProjectFxRateToNgn({ currency: 'NGN' })).toBe(1);
    });

    describe('live rate priority', () => {
      beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
      });

      afterEach(() => {
        vi.unstubAllGlobals();
      });

      it('prefers a live-fetched rate over the seed default', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: async () => ({ ratesToNgn: { USD: 1377.41 }, fetchedAt: '2026-07-22T00:02:31.000Z' }),
        });
        await refreshLiveFxRates();

        // 1600 is USD's hardcoded seed default -- the live rate must win.
        expect(getProjectFxRateToNgn({ currency: 'USD' })).toBe(1377.41);
      });

      it('still lets an explicit project override win over a live rate', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: async () => ({ ratesToNgn: { USD: 1377.41 }, fetchedAt: '2026-07-22T00:02:31.000Z' }),
        });
        await refreshLiveFxRates();

        expect(getProjectFxRateToNgn({ currency: 'USD', fxRateToNgn: 1500 })).toBe(1500);
      });

      it('falls back to the seed default when the live fetch has not resolved yet', () => {
        // No refreshLiveFxRates() call in this test -- cache stays empty.
        expect(getProjectFxRateToNgn({ currency: 'USD' })).toBe(1600);
      });
    });
  });

  describe('convertNgnToProjectCurrency', () => {
    it('passes NGN amounts through unchanged for an NGN project', () => {
      expect(convertNgnToProjectCurrency(125000, { currency: 'NGN' })).toBe(125000);
    });

    it('divides by the FX rate to convert into a foreign currency', () => {
      expect(convertNgnToProjectCurrency(160000, { currency: 'USD', fxRateToNgn: 1600 })).toBe(100);
    });

    it('clamps non-numeric NGN input to 0', () => {
      expect(convertNgnToProjectCurrency('not-a-number', { currency: 'USD' })).toBe(0);
      expect(convertNgnToProjectCurrency(undefined, { currency: 'USD' })).toBe(0);
    });
  });

  describe('formatProjectCurrency', () => {
    it('formats an NGN project with the naira symbol and two decimal places', () => {
      expect(formatProjectCurrency(12500, { currency: 'NGN' })).toBe('₦12,500.00');
    });

    it('formats a converted USD amount with the dollar symbol', () => {
      expect(formatProjectCurrency(160000, { currency: 'USD', fxRateToNgn: 1600 })).toBe('$100.00');
    });

    it('defaults an unset project (no currency field at all) to NGN formatting', () => {
      expect(formatProjectCurrency(5000, {})).toBe('₦5,000.00');
      expect(formatProjectCurrency(5000, null)).toBe('₦5,000.00');
    });
  });

  describe('getProjectCurrencySymbol', () => {
    it('returns the right symbol per currency', () => {
      expect(getProjectCurrencySymbol({ currency: 'NGN' })).toBe('₦');
      expect(getProjectCurrencySymbol({ currency: 'GBP' })).toBe('£');
      expect(getProjectCurrencySymbol({})).toBe('₦');
    });
  });
});
