import { useSyncExternalStore } from 'react';
import { subscribeToFxRateUpdates, getLiveFxRatesFetchedAt } from '../utils/fxRates';

/**
 * Subscribes a component to live FX rate updates. Returns the timestamp of
 * the currently cached rates (or null before the first fetch resolves) --
 * the value itself usually isn't what callers need, but reading it through
 * useSyncExternalStore means React re-renders the component whenever the
 * background refresh in fxRates.js lands, so any convertNgnToProjectCurrency
 * / formatProjectCurrency calls in the render output pick up the new rate
 * immediately instead of only on the component's next unrelated re-render.
 */
export const useLiveFxRatesTick = () => (
  useSyncExternalStore(subscribeToFxRateUpdates, getLiveFxRatesFetchedAt, () => null)
);
