import { DEFAULT_CURRENCY_CODE, getCurrencyDefinition } from '../data/currencies';
import { getLiveFxRateToNgn } from './fxRates';

const clampNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Resolves a project's display currency code, falling back to NGN.
 */
export const getProjectCurrencyCode = (project) => (
  project?.currency || DEFAULT_CURRENCY_CODE
);

/**
 * Resolves the NGN-per-unit exchange rate a project should convert through,
 * in priority order:
 *   1. An explicit rate the user pinned on the project (a deliberate
 *      manual override -- e.g. locking a tender to the rate quoted on a
 *      specific date), always wins.
 *   2. The live rate fetched from fxRates.js, kept fresh automatically in
 *      the background (see primeLiveFxRates, called once at app startup).
 *   3. The currency's hardcoded seed default, only as a last-resort
 *      fallback for the brief window before the first live fetch resolves,
 *      or if the live fetch fails entirely (e.g. offline).
 */
export const getProjectFxRateToNgn = (project) => {
  const currencyCode = getProjectCurrencyCode(project);
  const explicitRate = clampNumber(project?.fxRateToNgn);
  if (explicitRate > 0) return explicitRate;

  const liveRate = getLiveFxRateToNgn(currencyCode);
  if (liveRate > 0) return liveRate;

  return getCurrencyDefinition(currencyCode).defaultFxRateToNgn;
};

/**
 * Converts an NGN amount into a project's display currency. Amounts
 * everywhere else in the app (BOQ rates, benchmarks, totals) are always in
 * NGN — this is the one place that conversion happens, so exports and UI
 * stay consistent with whatever currency/rate the project has set.
 */
export const convertNgnToProjectCurrency = (ngnAmount, project) => {
  const fxRateToNgn = getProjectFxRateToNgn(project);
  if (!fxRateToNgn) return 0;
  return clampNumber(ngnAmount) / fxRateToNgn;
};

/**
 * Formats an NGN amount as the project's display currency, e.g. "₦12,500.00"
 * or "$7.81". `options` are passed through to toLocaleString.
 */
export const formatProjectCurrency = (ngnAmount, project, options = {}) => {
  const currencyCode = getProjectCurrencyCode(project);
  const definition = getCurrencyDefinition(currencyCode);
  const convertedAmount = convertNgnToProjectCurrency(ngnAmount, project);

  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  return `${definition.symbol}${convertedAmount.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  })}`;
};

/**
 * Returns just the currency symbol for a project (e.g. for table headers
 * like "RATE (₦)" / "RATE ($)").
 */
export const getProjectCurrencySymbol = (project) => (
  getCurrencyDefinition(getProjectCurrencyCode(project)).symbol
);
