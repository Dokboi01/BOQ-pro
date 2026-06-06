import {
  MARKET_SYNC_ACTOR,
  MARKET_SYNC_CAPTURED_AT,
  MARKET_SYNC_SNAPSHOT_ID,
  SEED_MARKET_INDICES,
  SEED_MATERIAL_MARKET_LIBRARY,
} from '../data/materialMarketFeed.js';
import {
  buildMaterialApprovedSnapshotEntry,
  buildMaterialBenchmarkHistoryEntry,
  normalizeMaterialBenchmarkRecord,
} from './materialBenchmarks.js';

const clampNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const slugify = (value = '') => (
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
);

const buildIsoReviewDate = (cycleDays = 14, capturedAt = MARKET_SYNC_CAPTURED_AT) => {
  const base = new Date(capturedAt);
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + Math.max(clampNumber(cycleDays), 1));
  return base.toISOString();
};

const buildHistory = (previousHistory = [], nextPrice = 0, nextBenchmark = 0) => {
  const trailingHistory = Array.isArray(previousHistory)
    ? previousHistory.map((entry) => clampNumber(entry)).filter((entry) => entry > 0).slice(-5)
    : [];

  const merged = [...trailingHistory];
  if (nextBenchmark > 0) merged.push(nextBenchmark);
  if (nextPrice > 0) merged.push(nextPrice);

  return Array.from(new Set(merged)).slice(-6);
};

const toDeltaLabel = (previousPrice = 0, nextPrice = 0, fallbackDelta = '0.0%') => {
  if (previousPrice <= 0 || nextPrice <= 0) return fallbackDelta;

  const deltaPercent = ((nextPrice - previousPrice) / previousPrice) * 100;
  return `${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}%`;
};

const toTrend = (previousPrice = 0, nextPrice = 0, fallbackTrend = 'stable') => {
  if (previousPrice <= 0 || nextPrice <= 0) return fallbackTrend;

  const deltaPercent = ((nextPrice - previousPrice) / previousPrice) * 100;
  if (deltaPercent >= 0.5) return 'up';
  if (deltaPercent <= -0.5) return 'down';
  return 'stable';
};

export const createMarketMaterialDocId = (name = '') => slugify(name);
export const createMarketIndexDocId = (label = '') => slugify(label);

const buildApprovedSnapshots = ({
  previousMaterial = null,
  nextMaterial,
  actor,
}) => {
  const previousSnapshots = Array.isArray(previousMaterial?.approvedSnapshots)
    ? previousMaterial.approvedSnapshots
    : [];
  const previousSnapshot = previousMaterial?.approvedSnapshot || previousSnapshots[0] || null;
  const shouldApprove = String(nextMaterial.approvalStatus || '').toLowerCase() === 'approved';

  if (!shouldApprove) {
    return {
      approvedSnapshots: previousSnapshots,
      approvedSnapshot: previousSnapshot,
    };
  }

  const regionChanged = JSON.stringify(previousSnapshot?.regionRates || {}) !== JSON.stringify(nextMaterial.regionRates || {});
  const benchmarkChanged = clampNumber(previousSnapshot?.benchmark) !== clampNumber(nextMaterial.benchmark);
  const snapshotChanged = previousMaterial?.marketSyncSnapshotId !== MARKET_SYNC_SNAPSHOT_ID;

  if (!previousSnapshot || regionChanged || benchmarkChanged || snapshotChanged) {
    const approvedSnapshotEntry = buildMaterialApprovedSnapshotEntry({
      previousSnapshot,
      material: nextMaterial,
      actor,
      activeRegion: 'Lagos',
      approvedAt: nextMaterial.approvedAt || MARKET_SYNC_CAPTURED_AT,
      note: nextMaterial.benchmarkDeskNote || 'Approved during material market sync.',
    });

    const approvedSnapshots = [approvedSnapshotEntry, ...previousSnapshots].slice(0, 12);
    return {
      approvedSnapshots,
      approvedSnapshot: approvedSnapshots[0] || null,
    };
  }

  return {
    approvedSnapshots: previousSnapshots,
    approvedSnapshot: previousSnapshot,
  };
};

const buildMaterialFromFeed = (feedMaterial, previousMaterial = null, actor = MARKET_SYNC_ACTOR) => {
  const previousPrice = clampNumber(previousMaterial?.price);
  const nextPrice = clampNumber(feedMaterial.price);
  const nextBenchmark = clampNumber(feedMaterial.benchmark || nextPrice);
  const reviewCycleDays = clampNumber(feedMaterial.reviewCycleDays) || clampNumber(previousMaterial?.reviewCycleDays) || 14;
  const trend = toTrend(previousPrice, nextPrice, feedMaterial.trend || previousMaterial?.trend || 'stable');
  const delta = toDeltaLabel(previousPrice, nextPrice, feedMaterial.delta || previousMaterial?.delta || '0.0%');

  const draftMaterial = normalizeMaterialBenchmarkRecord({
    ...previousMaterial,
    ...feedMaterial,
    id: previousMaterial?.id || createMarketMaterialDocId(feedMaterial.name),
    price: nextPrice,
    currentRead: nextPrice,
    benchmark: nextBenchmark,
    history: buildHistory(previousMaterial?.history, nextPrice, nextBenchmark),
    trend,
    delta,
    sources: Array.isArray(feedMaterial.sources) && feedMaterial.sources.length > 0
      ? feedMaterial.sources
      : (Array.isArray(previousMaterial?.sources) ? previousMaterial.sources : []),
    sourceCount: Math.max(clampNumber(feedMaterial.sourceCount), Array.isArray(feedMaterial.sources) ? feedMaterial.sources.length : 0, clampNumber(previousMaterial?.sourceCount)),
    approvalStatus: feedMaterial.approvalStatus || previousMaterial?.approvalStatus || 'review',
    approvedBy: String(feedMaterial.approvalStatus || '').toLowerCase() === 'approved'
      ? (previousMaterial?.approvedBy || actor)
      : (previousMaterial?.approvedBy || ''),
    approvedAt: String(feedMaterial.approvalStatus || '').toLowerCase() === 'approved'
      ? (previousMaterial?.approvedAt || MARKET_SYNC_CAPTURED_AT)
      : null,
    reviewCycleDays,
    nextReviewAt: buildIsoReviewDate(reviewCycleDays),
    updatedAt: MARKET_SYNC_CAPTURED_AT,
    verifiedBy: actor,
    marketSyncSnapshotId: MARKET_SYNC_SNAPSHOT_ID,
    marketSyncCapturedAt: MARKET_SYNC_CAPTURED_AT,
    marketSyncSource: 'curated-nigeria-market-feed',
  });

  const snapshotBundle = buildApprovedSnapshots({
    previousMaterial,
    nextMaterial: draftMaterial,
    actor,
  });

  const benchmarkHistoryEntry = buildMaterialBenchmarkHistoryEntry({
    previousMaterial,
    nextMaterial: draftMaterial,
    actor,
    activeRegion: 'Lagos',
    changedAt: MARKET_SYNC_CAPTURED_AT,
    reason: draftMaterial.benchmarkDeskNote || 'Material rates refreshed from the current market feed.',
  });

  return normalizeMaterialBenchmarkRecord({
    ...draftMaterial,
    approvedSnapshots: snapshotBundle.approvedSnapshots,
    approvedSnapshot: snapshotBundle.approvedSnapshot,
    benchmarkHistory: [
      benchmarkHistoryEntry,
      ...(Array.isArray(previousMaterial?.benchmarkHistory) ? previousMaterial.benchmarkHistory : []),
    ].slice(0, 18),
  });
};

export const syncMaterialsFromMarketFeed = ({
  existingMaterials = [],
  actor = MARKET_SYNC_ACTOR,
} = {}) => {
  const existingByName = new Map(
    (existingMaterials || [])
      .filter((material) => material?.name)
      .map((material) => [slugify(material.name), normalizeMaterialBenchmarkRecord(material)])
  );

  let createdCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;

  const syncedFeedMaterials = SEED_MATERIAL_MARKET_LIBRARY.map((feedMaterial) => {
    const previousMaterial = existingByName.get(slugify(feedMaterial.name)) || null;
    const nextMaterial = buildMaterialFromFeed(feedMaterial, previousMaterial, actor);
    const isSameSnapshot = previousMaterial?.marketSyncSnapshotId === MARKET_SYNC_SNAPSHOT_ID;
    const priceChanged = clampNumber(previousMaterial?.price) !== clampNumber(nextMaterial.price);
    const benchmarkChanged = clampNumber(previousMaterial?.benchmark) !== clampNumber(nextMaterial.benchmark);
    const regionChanged = JSON.stringify(previousMaterial?.regionRates || previousMaterial?.regions || {})
      !== JSON.stringify(nextMaterial.regionRates || nextMaterial.regions || {});

    if (!previousMaterial) {
      createdCount += 1;
    } else if (!isSameSnapshot || priceChanged || benchmarkChanged || regionChanged) {
      updatedCount += 1;
    } else {
      unchangedCount += 1;
    }

    return nextMaterial;
  });

  const preservedCustomMaterials = (existingMaterials || [])
    .filter((material) => material?.name)
    .filter((material) => !existingByName.has(slugify(material.name)) || !SEED_MATERIAL_MARKET_LIBRARY.some((entry) => slugify(entry.name) === slugify(material.name)))
    .map((material) => normalizeMaterialBenchmarkRecord(material));

  return {
    materials: [...syncedFeedMaterials, ...preservedCustomMaterials],
    summary: {
      createdCount,
      updatedCount,
      unchangedCount,
      totalCount: syncedFeedMaterials.length + preservedCustomMaterials.length,
      snapshotId: MARKET_SYNC_SNAPSHOT_ID,
      capturedAt: MARKET_SYNC_CAPTURED_AT,
    },
  };
};

export const syncMarketIndicesFromFeed = (existingIndices = []) => {
  const previousByLabel = new Map(
    (existingIndices || [])
      .filter((entry) => entry?.label)
      .map((entry) => [entry.label, entry])
  );

  let updatedCount = 0;
  let createdCount = 0;

  const indices = SEED_MARKET_INDICES.map((feedIndex) => {
    const previous = previousByLabel.get(feedIndex.label);
    if (previous) {
      if (clampNumber(previous.val) !== clampNumber(feedIndex.val) || previous.delta !== feedIndex.delta || previous.trend !== feedIndex.trend) {
        updatedCount += 1;
      }
    } else {
      createdCount += 1;
    }

    return {
      id: previous?.id || createMarketIndexDocId(feedIndex.label),
      ...previous,
      ...feedIndex,
      updatedAt: MARKET_SYNC_CAPTURED_AT,
      snapshotId: MARKET_SYNC_SNAPSHOT_ID,
    };
  });

  return {
    indices,
    summary: {
      createdCount,
      updatedCount,
      totalCount: indices.length,
      snapshotId: MARKET_SYNC_SNAPSHOT_ID,
      capturedAt: MARKET_SYNC_CAPTURED_AT,
    },
  };
};

/**
 * Maps a material category to its corresponding CMCI index label.
 */
export const getCategoryMarketIndexLabel = (category = '') => {
  const normalized = String(category).trim().toLowerCase();
  if (normalized === 'binder') return 'Binder Index';
  if (normalized === 'metal') return 'Metal Index';
  if (normalized === 'aggregates') return 'Aggregates';
  if (normalized === 'masonry') return 'Masonry Index';
  if (normalized === 'surface') return 'Surface & Roads';
  if (normalized === 'mep') return 'MEP Index';
  if (normalized === 'finishes') return 'Finishes Index';
  return 'Overall CMCI';
};

/**
 * Calculates the realistic weekly drift percentage for a given index based on its trend.
 */
export const getIndexWeeklyDrift = (label = '') => {
  const cleanLabel = String(label).trim();
  if (cleanLabel === 'Binder Index') return 0.0075;     // +0.75% per week
  if (cleanLabel === 'Metal Index') return -0.002;       // -0.20% per week
  if (cleanLabel === 'Aggregates') return 0.0005;        // +0.05% per week
  if (cleanLabel === 'Masonry Index') return 0.01375;    // +1.375% per week
  if (cleanLabel === 'Surface & Roads') return 0.017;    // +1.70% per week
  if (cleanLabel === 'MEP Index') return 0.00925;        // +0.925% per week
  if (cleanLabel === 'Finishes Index') return 0.00475;   // +0.475% per week
  return 0.00525;                                        // +0.525% per week (Overall CMCI)
};

/**
 * Drifts the market indices based on elapsed time since their last update.
 */
export const driftMarketIndices = (indices = [], asOfDate = new Date()) => {
  const baseIndices = indices.length > 0 ? indices : SEED_MARKET_INDICES;
  const currentTimestamp = asOfDate.getTime();

  return baseIndices.map((index) => {
    const lastUpdateStr = index.updatedAt || MARKET_SYNC_CAPTURED_AT;
    const lastUpdateTime = new Date(lastUpdateStr).getTime();
    
    if (currentTimestamp <= lastUpdateTime) {
      return { ...index };
    }

    const elapsedMs = currentTimestamp - lastUpdateTime;
    const elapsedWeeks = elapsedMs / (7 * 86400000);
    const weeklyDrift = getIndexWeeklyDrift(index.label);

    const multiplier = Math.pow(1 + weeklyDrift, elapsedWeeks);
    const newValue = Number((index.val * multiplier).toFixed(1));
    const previousVal = index.val;

    const deltaPercent = ((newValue - index.val) / index.val) * 100;
    const delta = `${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}%`;
    const trend = deltaPercent >= 0.1 ? 'up' : (deltaPercent <= -0.1 ? 'down' : 'stable');

    return {
      ...index,
      val: newValue,
      previousVal,
      delta,
      trend,
      updatedAt: asOfDate.toISOString(),
    };
  });
};

/**
 * Automatically updates stale material rates and corresponding audit histories.
 */
export const selfUpdateMarketData = ({ materials = [], indices = [], asOfDate = new Date() } = {}) => {
  const driftedIndices = driftMarketIndices(indices, asOfDate);
  const driftedIndicesMap = new Map(driftedIndices.map((idx) => [idx.label, idx]));

  let updatedCount = 0;
  const currentTimestamp = asOfDate.getTime();

  const updatedMaterials = materials.map((material) => {
    const normMaterial = normalizeMaterialBenchmarkRecord(material);
    const nextReviewStr = normMaterial.nextReviewAt;
    const nextReviewTime = nextReviewStr ? new Date(nextReviewStr).getTime() : 0;
    
    if (!nextReviewTime || currentTimestamp <= nextReviewTime) {
      return normMaterial;
    }

    const reviewCycleDays = normMaterial.reviewCycleDays || 14;
    const elapsedMs = currentTimestamp - nextReviewTime;
    const elapsedCycles = Math.floor(elapsedMs / (reviewCycleDays * 86400000)) + 1;

    const indexLabel = getCategoryMarketIndexLabel(normMaterial.category);
    const driftedIndex = driftedIndicesMap.get(indexLabel);
    
    let indexRatio = 1;
    if (driftedIndex) {
      const weeklyDrift = getIndexWeeklyDrift(indexLabel);
      const cycleDrift = Math.pow(1 + weeklyDrift, reviewCycleDays / 7) - 1;
      indexRatio = Math.pow(1 + cycleDrift, elapsedCycles);
    }

    const randomVariance = (Math.random() * 0.007) - 0.003; 
    const priceMultiplier = indexRatio * (1 + randomVariance);

    const oldPrice = clampNumber(normMaterial.price);
    const newPrice = Math.round(oldPrice * priceMultiplier);
    
    const finalNewPrice = newPrice === oldPrice && priceMultiplier !== 1
      ? Math.max(Math.round(oldPrice * (priceMultiplier > 1 ? 1.01 : 0.99)), 1)
      : Math.max(newPrice, 1);

    const oldBenchmark = clampNumber(normMaterial.benchmark);
    const newBenchmark = Math.round(oldBenchmark * priceMultiplier);
    const finalNewBenchmark = newBenchmark === oldBenchmark && priceMultiplier !== 1
      ? Math.max(Math.round(oldBenchmark * (priceMultiplier > 1 ? 1.01 : 0.99)), 1)
      : Math.max(newBenchmark, 1);

    const oldRegionRates = normMaterial.regionRates || normMaterial.regions || {};
    const newRegionRates = Object.entries(oldRegionRates).reduce((acc, [region, rate]) => {
      acc[region] = Math.round(clampNumber(rate) * priceMultiplier);
      return acc;
    }, {});

    if (newRegionRates.Lagos) {
      newRegionRates.Lagos = finalNewBenchmark;
    }

    const oldHistory = Array.isArray(normMaterial.history) ? normMaterial.history : [];
    const history = Array.from(new Set([...oldHistory, finalNewPrice])).slice(-6);

    const deltaPercent = oldPrice > 0 ? ((finalNewPrice - oldPrice) / oldPrice) * 100 : 0;
    const delta = `${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}%`;
    const trend = deltaPercent >= 0.5 ? 'up' : (deltaPercent <= -0.5 ? 'down' : 'stable');

    const newSource = {
      id: `auto-reconfirmation-${asOfDate.getTime()}-${Math.floor(Math.random() * 1000)}`,
      label: 'Quantra market desk auto-reconfirmation',
      type: 'supplier-read',
      region: 'Lagos',
      rate: finalNewBenchmark,
      capturedAt: asOfDate.toISOString(),
      note: `Automatically calibrated based on ${indexLabel} movement of ${delta}.`,
      url: '',
    };
    const sources = [newSource, ...(normMaterial.sources || [])].slice(0, 6);

    const newHistoryEntry = {
      id: `history-${normMaterial.id || normMaterial.name}-${asOfDate.getTime()}`,
      title: 'Benchmark automatically calibrated',
      action: 'recalibrated',
      actor: 'Quantra Market Bot',
      changedAt: asOfDate.toISOString(),
      benchmark: finalNewBenchmark,
      previousBenchmark: oldBenchmark,
      marketRead: finalNewPrice,
      approvalStatus: normMaterial.approvalStatus || 'review',
      approvedBy: normMaterial.approvedBy || '',
      sourceCount: sources.length,
      confidence: normMaterial.confidence,
      activeRegion: 'Lagos',
      regionRates: newRegionRates,
      stateRates: {}, 
      previousRegionRates: oldRegionRates,
      regionChanges: [
        `Lagos updated from ₦${oldBenchmark.toLocaleString()} to ₦${finalNewBenchmark.toLocaleString()}`
      ],
      changeSummary: `Price adjusted by ${delta} due to index drift.`,
      note: 'Benchmark automatically adjusted and re-approved by the self-updating engine.',
    };
    const benchmarkHistory = [newHistoryEntry, ...(normMaterial.benchmarkHistory || [])].slice(0, 18);

    const nextReviewAt = new Date(asOfDate.getTime() + (reviewCycleDays * 86400000)).toISOString();

    const rawUpdatedMaterial = {
      ...normMaterial,
      price: finalNewPrice,
      currentRead: finalNewPrice,
      benchmark: finalNewBenchmark,
      regionRates: newRegionRates,
      regions: newRegionRates,
      history,
      trend,
      delta,
      sources,
      sourceCount: Math.max(normMaterial.sourceCount, sources.length),
      benchmarkHistory,
      nextReviewAt,
      updatedAt: asOfDate.toISOString(),
      verifiedBy: 'Quantra Market Bot',
    };

    if (normMaterial.approvalStatus === 'approved') {
      rawUpdatedMaterial.approvedAt = asOfDate.toISOString();
      rawUpdatedMaterial.approvedBy = 'Quantra Market Bot';
      
      const previousSnapshots = Array.isArray(normMaterial.approvedSnapshots)
        ? normMaterial.approvedSnapshots
        : [];
      const previousSnapshot = normMaterial.approvedSnapshot || previousSnapshots[0] || null;
      const nextVersion = (previousSnapshot?.version || 0) + 1;

      const approvedSnapshotEntry = {
        id: `approved-snapshot-${normMaterial.id || normMaterial.name}-${nextVersion}-${asOfDate.getTime()}`,
        version: nextVersion,
        title: `Approved snapshot v${nextVersion}`,
        benchmark: finalNewBenchmark,
        marketRead: finalNewPrice,
        approvedAt: asOfDate.toISOString(),
        approvedBy: 'Quantra Market Bot',
        actor: 'Quantra Market Bot',
        approvalStatus: 'approved',
        sourceCount: sources.length,
        confidence: normMaterial.confidence,
        benchmarkBand: normMaterial.benchmarkBand || '',
        activeRegion: 'Lagos',
        regionRates: newRegionRates,
        stateRates: {}, 
        note: 'Snapshot generated by automatic review cycle.',
      };

      rawUpdatedMaterial.approvedSnapshots = [approvedSnapshotEntry, ...previousSnapshots].slice(0, 12);
      rawUpdatedMaterial.approvedSnapshot = approvedSnapshotEntry;
    }

    updatedCount++;
    return normalizeMaterialBenchmarkRecord(rawUpdatedMaterial);
  });

  return {
    materials: updatedMaterials,
    indices: driftedIndices,
    updatedCount,
  };
};

