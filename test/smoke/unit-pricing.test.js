import { describe, it, expect } from 'vitest';
import {
  getUnitScaleFactor,
  getBaseUnitForWorkType,
  getEffectiveBenchmarkRate,
  normalizeBreakdownForItem,
  calculateBreakdownSummary,
  buildAutoRateResult
} from '../../src/utils/pricing.js';

describe('Unit Pricing Calibration', () => {
  describe('getUnitScaleFactor', () => {
    it('handles identical units', () => {
      expect(getUnitScaleFactor('Slab', 'concrete', 'm3', 'm3')).toBe(1);
    });

    it('concrete m3 to m2: default thickness', () => {
      expect(getUnitScaleFactor('Concrete blinding', 'concrete', 'm3', 'm2')).toBe(0.15);
    });

    it('concrete m3 to m2: parsed mm thickness', () => {
      expect(getUnitScaleFactor('Concrete 150mm slab', 'concrete', 'm3', 'm2')).toBe(0.15);
      expect(getUnitScaleFactor('Concrete 200 mm slab', 'concrete', 'm3', 'm2')).toBe(0.20);
      expect(getUnitScaleFactor('Concrete 75mm blinding', 'concrete', 'm3', 'm2')).toBe(0.075);
    });

    it('concrete m3 to m2: parsed cm thickness', () => {
      expect(getUnitScaleFactor('Concrete 10cm slab', 'concrete', 'm3', 'm2')).toBe(0.10);
      expect(getUnitScaleFactor('Concrete 15 cm blinding', 'concrete', 'm3', 'm2')).toBe(0.15);
    });

    it('masonry m2 to m3: default thickness', () => {
      expect(getUnitScaleFactor('Blockwork', 'masonry', 'm2', 'm3')).toBe(1 / 0.225);
    });

    it('masonry m2 to m3: parsed thickness', () => {
      expect(getUnitScaleFactor('150mm block wall', 'masonry', 'm2', 'm3')).toBe(1 / 0.15);
      expect(getUnitScaleFactor('6-inch block wall', 'masonry', 'm2', 'm3')).toBe(1 / 0.15);
      expect(getUnitScaleFactor('225mm wall', 'masonry', 'm2', 'm3')).toBe(1 / 0.225);
      expect(getUnitScaleFactor('9 inch blockwork', 'masonry', 'm2', 'm3')).toBe(1 / 0.225);
    });

    it('reinforcement kg to ton', () => {
      expect(getUnitScaleFactor('Y12 reinforcement', 'reinforcement', 'kg', 'ton')).toBe(1000);
      expect(getUnitScaleFactor('Y16 reinforcement', 'reinforcement', 'ton', 'kg')).toBe(0.001);
    });

    it('daily to monthly preliminaries', () => {
      expect(getUnitScaleFactor('Office hire', 'general', 'day', 'month')).toBe(30);
      expect(getUnitScaleFactor('Site supervision', 'general', 'nr', 'month')).toBe(22);
    });
  });

  describe('getEffectiveBenchmarkRate with scaling', () => {
    it('scales concrete benchmark rate from m3 to m2', () => {
      const item = {
        description: 'Concrete 150mm slab',
        unit: 'm2',
        catalogUnit: 'm3',
        benchmark: 100000,
        benchmarkMetadata: { calibrationFactor: 1 }
      };
      // 100000 * regionalFactor(1) * calibration(1) * scaleFactor(0.15) = 15000
      expect(getEffectiveBenchmarkRate(item, 'Lagos')).toBe(15000);
    });

    it('scales masonry benchmark rate from m2 to m3', () => {
      const item = {
        description: '150mm block wall',
        unit: 'm3',
        catalogUnit: 'm2',
        benchmark: 15000,
        benchmarkMetadata: { calibrationFactor: 1 }
      };
      // 15000 * regionalFactor(1) * calibration(1) * scaleFactor(1 / 0.15) = 100000
      expect(getEffectiveBenchmarkRate(item, 'Lagos')).toBeCloseTo(100000);
    });
  });

  describe('normalizeBreakdownForItem with scaling', () => {
    it('scales breakdown quantities and daily outputs', () => {
      const breakdown = {
        materials: [{ name: 'Cement', qty: 6, rate: 5000, waste: 0 }],
        labor: [{ name: 'Mason', qty: 1, rate: 8000, output: 5 }],
        plant: [],
        transport: [],
        overheads: 0,
        profit: 0
      };
      const item = {
        description: 'Concrete 150mm slab',
        unit: 'm2',
        catalogUnit: 'm3'
      };

      const normalized = normalizeBreakdownForItem(breakdown, item);
      // scaleFactor is 0.15
      // material qty: 6 * 0.15 = 0.9
      expect(normalized.materials[0].qty).toBeCloseTo(0.9);
      // labor output: 5 / 0.15 = 33.333
      expect(normalized.labor[0].output).toBeCloseTo(33.333333333333336);

      const summary = calculateBreakdownSummary(normalized);
      // material total: 0.9 * 5000 = 4500
      // labor total: (1 * 8000) / 33.3333 = 240
      // total unit rate: 4740
      expect(summary.unitRate).toBeCloseTo(4740);
    });
  });
});
