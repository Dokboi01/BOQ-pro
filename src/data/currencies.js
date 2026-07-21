/**
 * Supported display currencies for BOQ projects.
 *
 * Quantra's material benchmarks and regional rate data are sourced and
 * calculated in NGN — that is the single source of truth (see
 * src/utils/materialBenchmarks.js and src/data/nigeriaLocations.js). This file
 * does not duplicate that data per currency. Instead, `fxRateToNgn` is "how
 * many NGN equal 1 unit of this currency" (e.g. ~1600 NGN per USD), used to
 * convert NGN amounts to a project's chosen display currency at the point of
 * display/export — the underlying rate data and BOQ math always stay in NGN.
 *
 * `fxRateToNgn` values here are seed defaults for new projects, not a live
 * feed — each project stores its own editable `fxRateToNgn` so a QS can set
 * the rate they actually want to quote at, and it won't silently drift as
 * real-world exchange rates move.
 */

export const DEFAULT_CURRENCY_CODE = 'NGN';

export const SUPPORTED_CURRENCIES = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', defaultFxRateToNgn: 1 },
  { code: 'USD', symbol: '$', name: 'US Dollar', defaultFxRateToNgn: 1600 },
  { code: 'GBP', symbol: '£', name: 'British Pound', defaultFxRateToNgn: 2000 },
  { code: 'EUR', symbol: '€', name: 'Euro', defaultFxRateToNgn: 1700 },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', defaultFxRateToNgn: 110 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', defaultFxRateToNgn: 88 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', defaultFxRateToNgn: 12.4 },
];

const CURRENCY_BY_CODE = new Map(SUPPORTED_CURRENCIES.map((entry) => [entry.code, entry]));

export const getCurrencyDefinition = (code = DEFAULT_CURRENCY_CODE) => (
  CURRENCY_BY_CODE.get(String(code || '').toUpperCase()) || CURRENCY_BY_CODE.get(DEFAULT_CURRENCY_CODE)
);

export const isSupportedCurrencyCode = (code) => CURRENCY_BY_CODE.has(String(code || '').toUpperCase());
