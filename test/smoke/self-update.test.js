import { describe, it, expect } from 'vitest';
import {
  selfUpdateMarketData,
  driftMarketIndices,
  getCategoryMarketIndexLabel,
  syncMaterialsFromMarketFeed,
  syncMarketIndicesFromFeed,
} from '../../src/utils/materialMarketSync.js';
import { getSeedMaterials, getSeedMarketIndices } from '../../src/db/seed_materials.js';
import { SEED_MATERIAL_MARKET_LIBRARY } from '../../src/data/materialMarketFeed.js';

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
    // Indices without an explicit `updatedAt` anchor to the global
    // MARKET_SYNC_CAPTURED_AT snapshot date (see materialMarketFeed.js), not to
    // whatever date this test picks. Setting it explicitly here decouples the
    // test from that constant, so it verifies the drift math itself rather than
    // incidentally depending on the snapshot date being in the past relative to
    // the chosen capture/future dates.
    const captureDate = new Date('2026-05-08T08:00:00.000Z');
    const seedIndices = getSeedMarketIndices().map((idx) => ({
      ...idx,
      updatedAt: captureDate.toISOString(),
    }));
    const binderIndex = seedIndices.find((idx) => idx.label === 'Binder Index');
    expect(binderIndex).toBeDefined();

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

  it('never drops price/benchmark to zero or below, even with adverse random variance', () => {
    const seedMaterials = getSeedMaterials();
    const seedIndices = getSeedMarketIndices();

    // Run many times since the self-update engine deliberately injects small
    // random variance (+/-0.3-0.4%) on top of the index drift — a floor of 1
    // must hold across the whole random range, not just the expected case.
    for (let i = 0; i < 25; i += 1) {
      const testMaterial = {
        ...seedMaterials[0],
        updatedAt: '2026-05-08T08:00:00.000Z',
        nextReviewAt: '2026-05-15T08:00:00.000Z',
        reviewCycleDays: 7,
        price: 5,
        benchmark: 5,
        regionRates: { Lagos: 5 },
      };

      const result = selfUpdateMarketData({
        materials: [testMaterial],
        indices: seedIndices,
        asOfDate: new Date('2026-05-29T08:00:00.000Z'),
      });

      expect(result.materials[0].price).toBeGreaterThanOrEqual(1);
      expect(result.materials[0].benchmark).toBeGreaterThanOrEqual(1);
    }
  });

  it('caps history, sources, and benchmarkHistory length after repeated updates', () => {
    const seedMaterials = getSeedMaterials();
    const seedIndices = getSeedMarketIndices();

    let material = {
      ...seedMaterials[0],
      reviewCycleDays: 1,
      price: 1000,
      benchmark: 1000,
      regionRates: { Lagos: 1000 },
    };

    let asOfDate = new Date('2026-05-08T08:00:00.000Z');
    for (let cycle = 0; cycle < 10; cycle += 1) {
      material = { ...material, nextReviewAt: asOfDate.toISOString() };
      asOfDate = new Date(asOfDate.getTime() + 2 * 86400000);
      const result = selfUpdateMarketData({
        materials: [material],
        indices: seedIndices,
        asOfDate,
      });
      material = result.materials[0];
    }

    expect(material.history.length).toBeLessThanOrEqual(6);
    expect(material.sources.length).toBeLessThanOrEqual(6);
    expect(material.benchmarkHistory.length).toBeLessThanOrEqual(18);
  });

  it('pushes nextReviewAt forward by exactly reviewCycleDays from the update date', () => {
    const seedMaterials = getSeedMaterials();
    const seedIndices = getSeedMarketIndices();

    const testMaterial = {
      ...seedMaterials[0],
      nextReviewAt: '2026-05-15T08:00:00.000Z',
      reviewCycleDays: 10,
      price: 1000,
      benchmark: 1000,
      regionRates: { Lagos: 1000 },
    };

    const asOfDate = new Date('2026-05-29T08:00:00.000Z');
    const result = selfUpdateMarketData({
      materials: [testMaterial],
      indices: seedIndices,
      asOfDate,
    });

    const expectedNextReview = new Date(asOfDate.getTime() + 10 * 86400000).getTime();
    expect(new Date(result.materials[0].nextReviewAt).getTime()).toBe(expectedNextReview);
  });

  it('increments the approved snapshot version when an already-approved material is auto-updated', () => {
    const seedMaterials = getSeedMaterials();
    const seedIndices = getSeedMarketIndices();

    const testMaterial = {
      ...seedMaterials[0],
      approvalStatus: 'approved',
      nextReviewAt: '2026-05-15T08:00:00.000Z',
      reviewCycleDays: 7,
      price: 1000,
      benchmark: 1000,
      regionRates: { Lagos: 1000 },
      approvedSnapshots: [{ version: 3, approvedAt: '2026-04-01T08:00:00.000Z' }],
      approvedSnapshot: { version: 3, approvedAt: '2026-04-01T08:00:00.000Z' },
    };

    const result = selfUpdateMarketData({
      materials: [testMaterial],
      indices: seedIndices,
      asOfDate: new Date('2026-05-29T08:00:00.000Z'),
    });

    expect(result.materials[0].approvedSnapshot.version).toBe(4);
    expect(result.materials[0].approvalStatus).toBe('approved');
  });

  it('does not mutate the input materials/indices arrays or objects', () => {
    const seedMaterials = getSeedMaterials();
    const seedIndices = getSeedMarketIndices();

    const testMaterial = {
      ...seedMaterials[0],
      nextReviewAt: '2026-05-15T08:00:00.000Z',
      reviewCycleDays: 7,
      price: 1000,
      benchmark: 1000,
      regionRates: { Lagos: 1000 },
    };
    const snapshotBefore = JSON.stringify(testMaterial);

    selfUpdateMarketData({
      materials: [testMaterial],
      indices: seedIndices,
      asOfDate: new Date('2026-05-29T08:00:00.000Z'),
    });

    expect(JSON.stringify(testMaterial)).toBe(snapshotBefore);
  });
});

describe('Material market feed sync', () => {
  it('marks every material as created when there are no existing materials', () => {
    const { summary } = syncMaterialsFromMarketFeed({ existingMaterials: [] });
    expect(summary.createdCount).toBe(SEED_MATERIAL_MARKET_LIBRARY.length);
    expect(summary.updatedCount).toBe(0);
    expect(summary.totalCount).toBe(SEED_MATERIAL_MARKET_LIBRARY.length);
  });

  it('reports materials as unchanged on a second sync against the same snapshot', () => {
    const first = syncMaterialsFromMarketFeed({ existingMaterials: [] });
    const second = syncMaterialsFromMarketFeed({ existingMaterials: first.materials });

    expect(second.summary.createdCount).toBe(0);
    expect(second.summary.updatedCount).toBe(0);
    expect(second.summary.unchangedCount).toBe(SEED_MATERIAL_MARKET_LIBRARY.length);
  });

  it('preserves custom materials that are not part of the curated feed', () => {
    const { materials } = syncMaterialsFromMarketFeed({
      existingMaterials: [{ name: 'Custom Bespoke Fitting', price: 999, benchmark: 999 }],
    });
    expect(materials.some((m) => m.name === 'Custom Bespoke Fitting')).toBe(true);
  });

  it('syncs every seed market index and reports creation counts', () => {
    const { indices, summary } = syncMarketIndicesFromFeed([]);
    expect(indices.length).toBe(summary.totalCount);
    expect(summary.createdCount).toBe(indices.length);
  });
});
