import { describe, it, expect } from 'vitest';
import {
  getBenchmarkConfidenceLabel,
  getMaterialRegionalBenchmark,
  getExactMaterialRegionalBenchmark,
  normalizeMaterialBenchmarkRecord,
  getMaterialBenchmarkGovernance,
  getMaterialApprovalSnapshotComparison,
  buildMaterialApprovedSnapshotEntry,
  buildMaterialBenchmarkHistoryEntry,
} from '../../src/utils/materialBenchmarks.js';

describe('Material Benchmarks', () => {
  describe('getBenchmarkConfidenceLabel', () => {
    it('buckets confidence into High / Medium / Low at the documented thresholds', () => {
      expect(getBenchmarkConfidenceLabel(0.82)).toBe('High');
      expect(getBenchmarkConfidenceLabel(0.81)).toBe('Medium');
      expect(getBenchmarkConfidenceLabel(0.64)).toBe('Medium');
      expect(getBenchmarkConfidenceLabel(0.63)).toBe('Low');
      expect(getBenchmarkConfidenceLabel(0)).toBe('Low');
    });
  });

  describe('getMaterialRegionalBenchmark', () => {
    const material = {
      benchmark: 12500,
      price: 12500,
      regionRates: { Lagos: 12500, Abuja: 13200, 'Port Harcourt': 12900, Kano: 13800 },
      stateRates: { Ogun: 12125 },
    };

    it('returns 0 for a missing material', () => {
      expect(getMaterialRegionalBenchmark(null)).toBe(0);
    });

    it('returns an explicit stateRate directly when present, with no scaling', () => {
      expect(getMaterialRegionalBenchmark(material, 'Ogun')).toBe(12125);
    });

    it('returns the anchor region rate unscaled when queried directly', () => {
      expect(getMaterialRegionalBenchmark(material, 'Lagos')).toBe(12500);
      expect(getMaterialRegionalBenchmark(material, 'Abuja')).toBe(13200);
    });

    it('derives a state benchmark from its anchor region rate, scaled by the state factor', () => {
      // Osun -> South West -> anchor region Lagos, factor 0.95
      expect(getMaterialRegionalBenchmark(material, 'Osun')).toBeCloseTo(12500 * 0.95);
      // Akwa Ibom -> South South -> anchor region Port Harcourt, factor 1.01
      expect(getMaterialRegionalBenchmark(material, 'Akwa Ibom')).toBeCloseTo(12900 * 1.01);
    });

    it('resolves region aliases (e.g. FCT/PH) to the same rate as their canonical name', () => {
      expect(getMaterialRegionalBenchmark(material, 'FCT')).toBe(13200);
      expect(getMaterialRegionalBenchmark(material, 'Port_Harcourt')).toBe(12900);
    });

    it('falls back to material.benchmark when no region/state data matches at all', () => {
      const bare = { benchmark: 9000, regionRates: {}, stateRates: {} };
      expect(getMaterialRegionalBenchmark(bare, 'Lagos')).toBe(9000);
    });
  });

  describe('getExactMaterialRegionalBenchmark', () => {
    it('returns the stateRate directly when the exact state itself is covered', () => {
      const material = {
        stateRates: { Lagos: 12500, Osun: 11875 },
        exactStateCoverage: ['Lagos'],
        regionRates: { Lagos: 12500 },
      };
      expect(getExactMaterialRegionalBenchmark(material, 'Lagos')).toBe(12500);
    });

    it('falls back to the anchor region\'s exact rate for a state benchmarked against it', () => {
      // Osun itself isn't in exactStateCoverage, but Osun's anchor region (Lagos)
      // is -- the anchor's confirmed exact rate is the best exact data available.
      const material = {
        stateRates: { Lagos: 12500, Osun: 11875 },
        exactStateCoverage: ['Lagos'],
        regionRates: { Lagos: 12500 },
      };
      expect(getExactMaterialRegionalBenchmark(material, 'Osun')).toBe(12500);
    });

    it('returns 0 only when neither the state nor its anchor has any region/state rate at all', () => {
      // Note: the second lookup pass matches `regionRates` unconditionally, not
      // gated by `exactStateCoverage` — so as long as the anchor region has *any*
      // regionRates entry, that value is returned, whether or not it was ever
      // marked "exact". `exactStateCoverage` only affects whether a per-state
      // rate is preferred over the anchor's regionRates value.
      const material = { stateRates: {}, exactStateCoverage: [], regionRates: {} };
      expect(getExactMaterialRegionalBenchmark(material, 'Osun')).toBe(0);
    });

    it('returns 0 for a missing material', () => {
      expect(getExactMaterialRegionalBenchmark(null)).toBe(0);
    });
  });

  describe('normalizeMaterialBenchmarkRecord', () => {
    it('backfills a Lagos region rate from benchmark/price when none is supplied', () => {
      const normalized = normalizeMaterialBenchmarkRecord({ name: 'Rebar Y12', benchmark: 900 });
      expect(normalized.regionRates.Lagos).toBe(900);
    });

    it('derives state rates for every Nigerian state from the region rates', () => {
      const normalized = normalizeMaterialBenchmarkRecord({
        name: 'OPC Cement',
        benchmark: 12500,
        regionRates: { Lagos: 12500, Abuja: 13200 },
      });
      // Every state in NIGERIA_STATE_OPTIONS should get a derived rate
      expect(normalized.stateRates.Lagos).toBe(12500);
      expect(normalized.stateRates.Ogun).toBeGreaterThan(0);
      expect(Object.keys(normalized.stateRates).length).toBeGreaterThan(30);
    });

    it('defaults approvalStatus to "review" when there is no approvedAt', () => {
      const normalized = normalizeMaterialBenchmarkRecord({ name: 'Sand', benchmark: 5000 });
      expect(normalized.approvalStatus).toBe('review');
    });

    it('defaults approvalStatus to "approved" when approvedAt is set', () => {
      const normalized = normalizeMaterialBenchmarkRecord({
        name: 'Sand',
        benchmark: 5000,
        approvedAt: '2026-01-01T00:00:00.000Z',
      });
      expect(normalized.approvalStatus).toBe('approved');
    });

    it('is idempotent: normalizing an already-normalized record does not change its core values', () => {
      const once = normalizeMaterialBenchmarkRecord({
        name: 'OPC Cement',
        benchmark: 12500,
        regionRates: { Lagos: 12500, Abuja: 13200 },
      });
      const twice = normalizeMaterialBenchmarkRecord(once);
      expect(twice.benchmark).toBe(once.benchmark);
      expect(twice.regionRates).toEqual(once.regionRates);
      expect(twice.stateRates).toEqual(once.stateRates);
    });

    it('passes explicit null through unchanged rather than crashing', () => {
      expect(normalizeMaterialBenchmarkRecord(null)).toBe(null);
    });

    it('treats a missing/undefined argument as an empty material via the default parameter', () => {
      // `material = {}` is the function's own default, so calling with no argument
      // (unlike passing `null` explicitly) normalizes a blank record instead of
      // short-circuiting the `!material` guard.
      const normalized = normalizeMaterialBenchmarkRecord(undefined);
      expect(normalized).toEqual(expect.objectContaining({ benchmark: 0, price: 0 }));
    });
  });

  describe('getMaterialBenchmarkGovernance', () => {
    it('marks an approved, fresh, well-sourced benchmark as "ready"', () => {
      const gov = getMaterialBenchmarkGovernance({
        approvalStatus: 'approved',
        updatedAt: new Date().toISOString(),
        nextReviewAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        sourceCount: 3,
        confidence: 0.8,
      });
      expect(gov.healthTone).toBe('ready');
      expect(gov.approvalTone).toBe('approved');
      expect(gov.freshnessTone).toBe('fresh');
    });

    it('marks a material past its review date as stale', () => {
      const gov = getMaterialBenchmarkGovernance({
        approvalStatus: 'approved',
        updatedAt: '2020-01-01T00:00:00.000Z',
        nextReviewAt: '2020-01-15T00:00:00.000Z',
        sourceCount: 3,
        confidence: 0.8,
      });
      expect(gov.freshnessTone).toBe('stale');
    });

    it('marks a draft benchmark distinctly from approved', () => {
      const gov = getMaterialBenchmarkGovernance({ approvalStatus: 'draft' });
      expect(gov.approvalLabel).toBe('Draft benchmark');
      expect(gov.approvalTone).toBe('draft');
    });
  });

  describe('buildMaterialApprovedSnapshotEntry', () => {
    it('increments the version number from the previous snapshot', () => {
      const first = buildMaterialApprovedSnapshotEntry({
        previousSnapshot: null,
        material: { benchmark: 100 },
      });
      expect(first.version).toBe(1);

      const second = buildMaterialApprovedSnapshotEntry({
        previousSnapshot: first,
        material: { benchmark: 110 },
      });
      expect(second.version).toBe(2);
    });
  });

  describe('buildMaterialBenchmarkHistoryEntry', () => {
    it('classifies a brand new record as "create"', () => {
      const entry = buildMaterialBenchmarkHistoryEntry({
        previousMaterial: null,
        nextMaterial: { name: 'New Material', benchmark: 500 },
      });
      expect(entry.action).toBe('create');
    });

    it('classifies a benchmark value change as "recalibrated"', () => {
      const entry = buildMaterialBenchmarkHistoryEntry({
        previousMaterial: { id: 'a', name: 'Sand', benchmark: 500 },
        nextMaterial: { id: 'a', name: 'Sand', benchmark: 600 },
      });
      expect(entry.action).toBe('recalibrated');
    });

    it('classifies a region-only rate change as "regional-update"', () => {
      const entry = buildMaterialBenchmarkHistoryEntry({
        previousMaterial: { id: 'a', name: 'Sand', benchmark: 500, regionRates: { Lagos: 500 } },
        nextMaterial: { id: 'a', name: 'Sand', benchmark: 500, regionRates: { Lagos: 500, Abuja: 520 } },
      });
      expect(entry.action).toBe('regional-update');
    });

    it('classifies an approval-status-only change as "governance-update"', () => {
      const entry = buildMaterialBenchmarkHistoryEntry({
        previousMaterial: { id: 'a', name: 'Sand', benchmark: 500, approvalStatus: 'review' },
        nextMaterial: { id: 'a', name: 'Sand', benchmark: 500, approvalStatus: 'approved' },
      });
      expect(entry.action).toBe('governance-update');
    });
  });

  describe('getMaterialApprovalSnapshotComparison', () => {
    it('returns null when there is no approved snapshot', () => {
      expect(getMaterialApprovalSnapshotComparison({ regionRates: { Lagos: 100 } })).toBeNull();
    });

    it('reports "aligned" when the current benchmark matches the approved snapshot', () => {
      const material = {
        regionRates: { Lagos: 12500 },
        approvedSnapshot: { version: 1, regionRates: { Lagos: 12500 } },
      };
      const comparison = getMaterialApprovalSnapshotComparison(material, 'Lagos');
      expect(comparison.tone).toBe('aligned');
    });

    it('reports "high" when the current benchmark has moved well above the approved snapshot', () => {
      const material = {
        regionRates: { Lagos: 13500 },
        approvedSnapshot: { version: 1, regionRates: { Lagos: 12500 } },
      };
      const comparison = getMaterialApprovalSnapshotComparison(material, 'Lagos');
      expect(comparison.tone).toBe('high');
      expect(comparison.delta).toBeCloseTo(1000);
    });

    it('reports "low" when the current benchmark has dropped well below the approved snapshot', () => {
      const material = {
        regionRates: { Lagos: 11000 },
        approvedSnapshot: { version: 1, regionRates: { Lagos: 12500 } },
      };
      const comparison = getMaterialApprovalSnapshotComparison(material, 'Lagos');
      expect(comparison.tone).toBe('low');
    });
  });
});
