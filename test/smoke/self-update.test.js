import { describe, it, expect } from 'vitest';
import {
  selfUpdateMarketData,
  driftMarketIndices,
  getCategoryMarketIndexLabel,
} from '../../src/utils/materialMarketSync.js';
import { getSeedMaterials, getSeedMarketIndices } from '../../src/db/seed_materials.js';

describe('Benchmark Self-Updating Engine', () => {
  it('correctly maps categories to CMCI index labels', () => {
    expect(getCategoryMarketIndexLabel('Binder')).toBe('Binder Index');
    expect(getCategoryMarketIndexLabel('Metal')).toBe('Metal Index');
    expect(getCategoryMarketIndexLabel('Aggregates')).toBe('Aggregates');
    expect(getCategoryMarketIndexLabel('Masonry')).toBe('Masonry Index');
    expect(getCategoryMarketIndexLabel('Surface')).toBe('Surface & Roads');
    expect(getCategoryMarketIndexLabel('MEP')).toBe('MEP Index');
    expect(getCategoryMarketIndexLabel('Finishes')).toBe('Finishes Index');
    expect(getCategoryMarketIndexLabel('Waterproofing')).toBe('Overall CMCI');
  });

  it('drifts indices upward when trend is up', () => {
    const seedIndices = getSeedMarketIndices();
    const binderIndex = seedIndices.find((idx) => idx.label === 'Binder Index');
    expect(binderIndex).toBeDefined();

    const captureDate = new Date('2026-05-08T08:00:00.000Z');
    const futureDate = new Date(captureDate.getTime() + 4 * 7 * 24 * 60 * 60 * 1000);

    const drifted = driftMarketIndices(seedIndices, futureDate);
    const driftedBinder = drifted.find((idx) => idx.label === 'Binder Index');

    expect(driftedBinder.val).toBeGreaterThan(binderIndex.val);
    expect(driftedBinder.trend).toBe('up');
    expect(driftedBinder.delta).toContain('+');
  });

  it('automatically updates stale materials past review window', () => {
    const seedMaterials = getSeedMaterials();
    const seedIndices = getSeedMarketIndices();

    const testMaterial = {
      ...seedMaterials[0],
      updatedAt: '2026-05-08T08:00:00.000Z',
      benchmarkHistory: null,
      nextReviewAt: '2026-05-15T08:00:00.000Z',
      reviewCycleDays: 7,
      price: 1000,
      benchmark: 1000,
      regionRates: { Lagos: 1000, Abuja: 1040 },
    };

    const currentDate = new Date('2026-05-29T08:00:00.000Z');

    const result = selfUpdateMarketData({
      materials: [testMaterial],
      indices: seedIndices,
      asOfDate: currentDate,
    });

    expect(result.updatedCount).toBe(1);
    const updatedMat = result.materials[0];

    expect(updatedMat.price).not.toBe(1000);
    expect(updatedMat.benchmark).not.toBe(1000);
    expect(updatedMat.regionRates.Lagos).toBe(updatedMat.benchmark);
    expect(updatedMat.regionRates.Abuja).toBeGreaterThan(1040 * 0.95);
    
    expect(new Date(updatedMat.nextReviewAt).getTime()).toBeGreaterThan(currentDate.getTime());

    expect(updatedMat.history.length).toBeGreaterThan(testMaterial.history.length);
    expect(updatedMat.sources[0].label).toContain('auto-reconfirmation');
    expect(updatedMat.benchmarkHistory[0].title).toBe('Benchmark automatically calibrated');
    expect(updatedMat.benchmarkHistory[0].actor).toBe('Quantra Market Bot');
  });

  it('ignores fresh materials within review window', () => {
    const seedMaterials = getSeedMaterials();
    const seedIndices = getSeedMarketIndices();

    const testMaterial = {
      ...seedMaterials[0],
      nextReviewAt: '2026-06-15T08:00:00.000Z',
    };

    const currentDate = new Date('2026-06-05T08:00:00.000Z');

    const result = selfUpdateMarketData({
      materials: [testMaterial],
      indices: seedIndices,
      asOfDate: currentDate,
    });

    expect(result.updatedCount).toBe(0);
    expect(result.materials[0].price).toBe(testMaterial.price);
  });
});
