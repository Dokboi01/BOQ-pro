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
