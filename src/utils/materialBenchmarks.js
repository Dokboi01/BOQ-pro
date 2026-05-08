const clampNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeRegionLookup = (value = '') => (
  String(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const resolveDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    const converted = value.toDate();
    return Number.isNaN(converted?.getTime?.()) ? null : converted;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCurrency = (value) => `N${Math.round(clampNumber(value)).toLocaleString()}`;

const formatAbsoluteDate = (value) => {
  const date = resolveDate(value);
  if (!date) return 'Not scheduled';

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const formatRelativeDate = (value) => {
  const date = resolveDate(value);
  if (!date) return 'Recently updated';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(Math.round(diffMs / 60000), 0);

  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }

  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) {
    return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
  }

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const normalizeRegionRates = (material = {}, benchmark = 0, marketRead = 0) => {
  const rawRegionRates = material.regionRates || material.regions || {};
  const regionRates = Object.entries(rawRegionRates).reduce((acc, [region, value]) => {
    const numericValue = clampNumber(value);
    if (!region || !numericValue) return acc;
    acc[region] = numericValue;
    return acc;
  }, {});

  if (!Object.keys(regionRates).length) {
    const lagosRate = clampNumber(benchmark || marketRead || material.price || material.rate);
    if (lagosRate) {
      regionRates.Lagos = lagosRate;
    }
  } else if (!regionRates.Lagos) {
    const lagosRate = clampNumber(benchmark || marketRead || material.price || material.rate);
    if (lagosRate) {
      regionRates.Lagos = lagosRate;
    }
  }

  return regionRates;
};

const normalizeSourceEntry = (source, index, material, context) => {
  const benchmarkRate = clampNumber(context.benchmark);
  const marketRead = clampNumber(context.marketRead);
  const fallbackRegion = Object.keys(context.regionRates || {})[0] || 'Lagos';
  const fallbackDate = context.updatedAt || new Date().toISOString();

  if (typeof source === 'string') {
    return {
      id: `${material.id || material.name || 'material'}-source-${index + 1}`,
      label: source,
      type: 'market-note',
      region: fallbackRegion,
      rate: benchmarkRate || marketRead || 0,
      capturedAt: fallbackDate,
      note: '',
      url: ''
    };
  }

  const label = source?.label || source?.name || source?.source || source?.note;
  if (!label) return null;

  return {
    id: source.id || `${material.id || material.name || 'material'}-source-${index + 1}`,
    label,
    type: source.type || 'market-note',
    region: source.region || fallbackRegion,
    rate: clampNumber(source.rate ?? source.price ?? benchmarkRate ?? marketRead),
    capturedAt: resolveDate(source.capturedAt || source.updatedAt || source.date)?.toISOString() || fallbackDate,
    note: source.note || '',
    url: source.url || source.href || ''
  };
};

const buildDefaultSources = (material, context) => {
  const benchmarkRate = clampNumber(context.benchmark);
  const marketRead = clampNumber(context.marketRead);
  const updatedAt = context.updatedAt || new Date().toISOString();
  const regionRates = context.regionRates || {};
  const primaryRegion = Object.keys(regionRates)[0] || 'Lagos';

  const sources = [
    {
      label: `${material.name} supplier read`,
      type: 'supplier-read',
      region: primaryRegion,
      rate: marketRead || benchmarkRate,
      capturedAt: updatedAt,
      note: material.delta ? `Current movement ${material.delta}` : '',
      url: ''
    },
    {
      label: `${primaryRegion} benchmark calibration`,
      type: 'benchmark-calibration',
      region: primaryRegion,
      rate: benchmarkRate || marketRead,
      capturedAt: updatedAt,
      note: material.range || material.benchmarkBand || '',
      url: ''
    }
  ];

  Object.entries(regionRates)
    .filter(([region]) => region !== primaryRegion)
    .slice(0, 2)
    .forEach(([region, rate]) => {
      sources.push({
        label: `${region} market spot check`,
        type: 'regional-spot-check',
        region,
        rate: clampNumber(rate),
        capturedAt: updatedAt,
        note: '',
        url: ''
      });
    });

  return sources;
};

const normalizeSources = (material, context) => {
  const explicitSources = Array.isArray(material.sources) ? material.sources : [];
  const normalized = explicitSources
    .map((source, index) => normalizeSourceEntry(source, index, material, context))
    .filter(Boolean);

  return normalized.length ? normalized : buildDefaultSources(material, context);
};

const normalizeHistoryRegionRates = (regionRates = {}) => (
  Object.entries(regionRates).reduce((acc, [region, value]) => {
    const numericValue = clampNumber(value);
    if (!region || !numericValue) return acc;
    acc[region] = numericValue;
    return acc;
  }, {})
);

const summarizeRegionChanges = (previousRates = {}, nextRates = {}) => {
  const regions = Array.from(new Set([
    ...Object.keys(previousRates || {}),
    ...Object.keys(nextRates || {})
  ]));

  return regions.reduce((changes, region) => {
    const previousValue = clampNumber(previousRates?.[region]);
    const nextValue = clampNumber(nextRates?.[region]);
    if (previousValue === nextValue) return changes;

    if (!previousValue && nextValue) {
      changes.push(`${region} set to ${formatCurrency(nextValue)}`);
    } else if (previousValue && !nextValue) {
      changes.push(`${region} cleared from ${formatCurrency(previousValue)}`);
    } else {
      changes.push(`${region} ${formatCurrency(previousValue)} to ${formatCurrency(nextValue)}`);
    }

    return changes;
  }, []);
};

const normalizeBenchmarkHistoryEntry = (entry, index, material, context) => {
  const changedAt = resolveDate(entry?.changedAt || entry?.updatedAt || entry?.capturedAt || context.updatedAt)?.toISOString()
    || context.updatedAt
    || new Date().toISOString();
  const title = String(entry?.title || entry?.label || 'Benchmark update').trim();
  const previousRegionRates = normalizeHistoryRegionRates(entry?.previousRegionRates || {});
  const regionRates = normalizeHistoryRegionRates(entry?.regionRates || entry?.regions || context.regionRates || {});
  const regionChanges = Array.isArray(entry?.regionChanges)
    ? entry.regionChanges.filter(Boolean)
    : summarizeRegionChanges(previousRegionRates, regionRates);

  return {
    id: entry?.id || `${material.id || material.name || 'material'}-benchmark-history-${index + 1}`,
    title,
    action: entry?.action || 'benchmark-update',
    actor: entry?.actor || entry?.updatedBy || context.verifiedBy || 'BOQ Pro Market Review',
    changedAt,
    benchmark: clampNumber(entry?.benchmark ?? context.benchmark),
    previousBenchmark: clampNumber(entry?.previousBenchmark),
    marketRead: clampNumber(entry?.marketRead ?? context.marketRead),
    approvalStatus: String(entry?.approvalStatus || context.approvalStatus || 'review').toLowerCase().trim(),
    approvedBy: entry?.approvedBy || context.approvedBy || '',
    sourceCount: clampNumber(entry?.sourceCount ?? context.sourceCount),
    confidence: clampNumber(entry?.confidence ?? context.confidence),
    activeRegion: entry?.activeRegion || Object.keys(regionRates)[0] || 'Lagos',
    regionRates,
    previousRegionRates,
    regionChanges,
    changeSummary: entry?.changeSummary || regionChanges.slice(0, 4).join(' | '),
    note: entry?.note || entry?.reason || context.benchmarkDeskNote || '',
  };
};

const buildDefaultBenchmarkHistory = (material, context) => {
  const defaultTimestamp = context.updatedAt || new Date().toISOString();

  return [{
    id: `${material.id || material.name || 'material'}-benchmark-history-baseline`,
    title: 'Benchmark baseline loaded',
    action: 'baseline',
    actor: context.verifiedBy || 'BOQ Pro Market Review',
    changedAt: defaultTimestamp,
    benchmark: clampNumber(context.benchmark),
    previousBenchmark: 0,
    marketRead: clampNumber(context.marketRead),
    approvalStatus: String(context.approvalStatus || 'review').toLowerCase().trim(),
    approvedBy: context.approvedBy || '',
    sourceCount: clampNumber(context.sourceCount),
    confidence: clampNumber(context.confidence),
    activeRegion: Object.keys(context.regionRates || {})[0] || 'Lagos',
    regionRates: normalizeHistoryRegionRates(context.regionRates || {}),
    previousRegionRates: {},
    regionChanges: summarizeRegionChanges({}, context.regionRates || {}),
    changeSummary: 'Initial benchmark baseline available in the library',
    note: context.benchmarkDeskNote || ''
  }];
};

const normalizeBenchmarkHistory = (material, context) => {
  const explicitHistory = Array.isArray(material.benchmarkHistory) ? material.benchmarkHistory : [];
  const normalizedHistory = explicitHistory
    .map((entry, index) => normalizeBenchmarkHistoryEntry(entry, index, material, context))
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = Date.parse(left.changedAt || 0) || 0;
      const rightTime = Date.parse(right.changedAt || 0) || 0;
      return rightTime - leftTime;
    });

  return normalizedHistory.length ? normalizedHistory : buildDefaultBenchmarkHistory(material, context);
};

const normalizeApprovalSnapshotEntry = (entry, index, material, context) => {
  const approvedAt = resolveDate(entry?.approvedAt || entry?.changedAt || context.approvedAt || context.updatedAt)?.toISOString()
    || context.updatedAt
    || new Date().toISOString();
  const regionRates = normalizeHistoryRegionRates(entry?.regionRates || entry?.regions || context.regionRates || {});
  const benchmark = clampNumber(entry?.benchmark ?? context.benchmark);

  return {
    id: entry?.id || `${material.id || material.name || 'material'}-approved-snapshot-${index + 1}`,
    version: clampNumber(entry?.version) || (index + 1),
    title: entry?.title || `Approved snapshot v${clampNumber(entry?.version) || (index + 1)}`,
    benchmark,
    marketRead: clampNumber(entry?.marketRead ?? context.marketRead),
    approvedAt,
    approvedBy: entry?.approvedBy || context.approvedBy || context.verifiedBy || 'BOQ Pro Market Review',
    actor: entry?.actor || entry?.approvedBy || context.approvedBy || context.verifiedBy || 'BOQ Pro Market Review',
    approvalStatus: 'approved',
    sourceCount: clampNumber(entry?.sourceCount ?? context.sourceCount),
    confidence: clampNumber(entry?.confidence ?? context.confidence),
    benchmarkBand: entry?.benchmarkBand || context.benchmarkBand || '',
    activeRegion: entry?.activeRegion || Object.keys(regionRates)[0] || 'Lagos',
    regionRates,
    note: entry?.note || context.benchmarkDeskNote || '',
  };
};

const buildDefaultApprovedSnapshot = (material, context) => {
  if (String(context.approvalStatus || '').toLowerCase().trim() !== 'approved') {
    return [];
  }

  return [normalizeApprovalSnapshotEntry({
    version: 1,
    title: 'Approved snapshot v1',
    benchmark: context.benchmark,
    marketRead: context.marketRead,
    approvedAt: context.approvedAt || context.updatedAt,
    approvedBy: context.approvedBy || context.verifiedBy || 'BOQ Pro Market Review',
    sourceCount: context.sourceCount,
    confidence: context.confidence,
    benchmarkBand: context.benchmarkBand,
    activeRegion: Object.keys(context.regionRates || {})[0] || 'Lagos',
    regionRates: context.regionRates || {},
    note: context.benchmarkDeskNote || '',
  }, 0, material, context)];
};

const normalizeApprovedSnapshots = (material, context) => {
  const explicitSnapshots = Array.isArray(material.approvedSnapshots)
    ? material.approvedSnapshots
    : (material.approvedSnapshot ? [material.approvedSnapshot] : []);

  const normalizedSnapshots = explicitSnapshots
    .map((entry, index) => normalizeApprovalSnapshotEntry(entry, index, material, context))
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = Date.parse(left.approvedAt || 0) || 0;
      const rightTime = Date.parse(right.approvedAt || 0) || 0;
      return rightTime - leftTime;
    })
    .map((entry, index) => ({
      ...entry,
      version: entry.version || Math.max(explicitSnapshots.length - index, index + 1),
      title: entry.title || `Approved snapshot v${entry.version || (index + 1)}`
    }));

  if (normalizedSnapshots.length) {
    return normalizedSnapshots;
  }

  return buildDefaultApprovedSnapshot(material, context);
};

const normalizeConfidenceValue = (value, sourceCount, updatedAt, regionCount, historyCount) => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'high') return 0.9;
    if (normalized === 'medium') return 0.72;
    if (normalized === 'low') return 0.52;
  }

  const explicit = clampNumber(value);
  if (explicit > 1) return Math.min(explicit / 100, 0.99);
  if (explicit > 0) return Math.min(explicit, 0.99);

  let score = 0.48;
  score += Math.min(sourceCount, 5) * 0.07;
  score += Math.min(regionCount, 4) * 0.04;
  score += Math.min(historyCount, 6) * 0.015;

  const updatedDate = resolveDate(updatedAt);
  if (updatedDate) {
    const ageDays = Math.max((Date.now() - updatedDate.getTime()) / 86400000, 0);
    if (ageDays <= 7) score += 0.12;
    else if (ageDays <= 30) score += 0.06;
    else if (ageDays > 90) score -= 0.06;
  }

  return Math.max(0.4, Math.min(score, 0.96));
};

export const getBenchmarkConfidenceLabel = (confidence) => {
  const normalized = clampNumber(confidence);
  if (normalized >= 0.82) return 'High';
  if (normalized >= 0.64) return 'Medium';
  return 'Low';
};

export const getMaterialBenchmarkGovernance = (material = {}) => {
  const updatedAt = resolveDate(
    material.updatedAt
    || material.updated_at
    || material.created_at
  );
  const approvedAt = resolveDate(material.approvedAt || material.approved_at);
  const reviewCycleDays = clampNumber(material.reviewCycleDays) || 14;
  const nextReviewAt = resolveDate(material.nextReviewAt || material.next_review_at)
    || (updatedAt ? new Date(updatedAt.getTime() + (reviewCycleDays * 86400000)) : null);
  const approvalStatus = String(material.approvalStatus || (approvedAt ? 'approved' : 'review'))
    .toLowerCase()
    .trim();
  const regionCoverage = Object.keys(material.regionRates || material.regions || {}).length;
  const sourceCount = clampNumber(material.sourceCount);
  const confidence = clampNumber(material.confidence);
  const hasCarryForwardEvidence = Array.isArray(material.sources)
    && material.sources.some((source) => String(source?.type || '').toLowerCase().trim() === 'carry-forward');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let approvalLabel = 'Review in progress';
  let approvalTone = 'review';
  if (approvalStatus === 'approved') {
    approvalLabel = 'Approved benchmark';
    approvalTone = 'approved';
  } else if (approvalStatus === 'draft') {
    approvalLabel = 'Draft benchmark';
    approvalTone = 'draft';
  } else if (approvalStatus === 'stale') {
    approvalLabel = 'Benchmark stale';
    approvalTone = 'stale';
  }

  let freshnessLabel = 'Review schedule pending';
  let freshnessTone = 'pending';
  let reviewWindowLabel = 'Next review not scheduled';

  if (nextReviewAt) {
    const reviewDate = new Date(nextReviewAt);
    reviewDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((reviewDate.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0 || approvalStatus === 'stale') {
      freshnessLabel = 'Benchmark stale';
      freshnessTone = 'stale';
    } else if (hasCarryForwardEvidence) {
      freshnessLabel = 'Carry-forward benchmark';
      freshnessTone = 'due';
    } else if (diffDays <= 7) {
      freshnessLabel = 'Review due soon';
      freshnessTone = 'due';
    } else {
      freshnessLabel = 'Fresh benchmark';
      freshnessTone = 'fresh';
    }

    reviewWindowLabel = `Next review ${formatAbsoluteDate(nextReviewAt)}`;
  } else if (updatedAt) {
    freshnessLabel = 'Freshly updated';
    freshnessTone = 'fresh';
    reviewWindowLabel = `Updated ${formatAbsoluteDate(updatedAt)}`;
  }

  let healthLabel = 'Benchmark watch';
  let healthTone = 'watch';
  if (approvalStatus === 'approved' && freshnessTone === 'fresh' && sourceCount >= 3 && confidence >= 0.72) {
    healthLabel = 'Benchmark ready';
    healthTone = 'ready';
  } else if (hasCarryForwardEvidence) {
    healthLabel = 'Needs reconfirmation';
    healthTone = 'watch';
  } else if (approvalStatus === 'draft' || sourceCount <= 1) {
    healthLabel = 'Evidence building';
    healthTone = 'building';
  }

  return {
    approvalStatus,
    approvalLabel,
    approvalTone,
    freshnessLabel,
    freshnessTone,
    reviewWindowLabel,
    healthLabel,
    healthTone,
    approvedAt: approvedAt ? approvedAt.toISOString() : null,
    nextReviewAt: nextReviewAt ? nextReviewAt.toISOString() : null,
    reviewCycleDays,
    regionCoverage,
    coverageLabel: `${regionCoverage} region${regionCoverage === 1 ? '' : 's'} benchmarked`
  };
};

export const buildMaterialApprovedSnapshotEntry = ({
  previousSnapshot = null,
  material = {},
  actor = 'BOQ Pro Market Review',
  activeRegion = 'Lagos',
  approvedAt = new Date().toISOString(),
  note = ''
} = {}) => {
  const previousVersion = clampNumber(previousSnapshot?.version) || 0;
  const regionRates = normalizeHistoryRegionRates(material?.regionRates || material?.regions || {});
  const nextVersion = previousVersion + 1;

  return {
    id: `${material?.id || material?.name || 'material'}-approved-snapshot-${nextVersion}-${approvedAt}`,
    version: nextVersion,
    title: `Approved snapshot v${nextVersion}`,
    benchmark: clampNumber(material?.benchmark),
    marketRead: clampNumber(material?.price ?? material?.currentRead),
    approvedAt,
    approvedBy: material?.approvedBy || actor,
    actor,
    approvalStatus: 'approved',
    sourceCount: clampNumber(material?.sourceCount),
    confidence: clampNumber(material?.confidence),
    benchmarkBand: material?.benchmarkBand || material?.range || '',
    activeRegion,
    regionRates,
    note: note || material?.benchmarkDeskNote || '',
  };
};

export const getMaterialApprovalSnapshotComparison = (material = {}, region = 'Lagos') => {
  const approvedSnapshot = material?.approvedSnapshot
    || (Array.isArray(material?.approvedSnapshots) ? material.approvedSnapshots[0] : null);
  if (!approvedSnapshot) return null;

  const currentBenchmark = getMaterialRegionalBenchmark(material, region);
  const approvedBenchmark = getMaterialRegionalBenchmark(approvedSnapshot, region);
  if (!approvedBenchmark) {
    return {
      snapshot: approvedSnapshot,
      version: clampNumber(approvedSnapshot.version) || 1,
      approvedBenchmark: 0,
      currentBenchmark,
      delta: 0,
      deltaPercent: 0,
      tone: 'pending',
      label: `Approved snapshot v${clampNumber(approvedSnapshot.version) || 1}`,
      summary: 'Approved snapshot exists but does not yet cover this region.'
    };
  }

  const delta = currentBenchmark - approvedBenchmark;
  const deltaPercent = approvedBenchmark > 0 ? (delta / approvedBenchmark) * 100 : 0;
  let tone = 'aligned';
  let summary = 'Current benchmark is aligned with the approved snapshot.';

  if (Math.abs(deltaPercent) >= 5) {
    tone = deltaPercent > 0 ? 'high' : 'low';
    summary = deltaPercent > 0
      ? 'Current benchmark is above the last approved snapshot.'
      : 'Current benchmark is below the last approved snapshot.';
  } else if (Math.abs(deltaPercent) >= 1) {
    tone = 'watch';
    summary = 'Current benchmark has moved slightly from the approved snapshot.';
  }

  return {
    snapshot: approvedSnapshot,
    version: clampNumber(approvedSnapshot.version) || 1,
    approvedBenchmark,
    currentBenchmark,
    delta,
    deltaPercent,
    tone,
    label: `Approved snapshot v${clampNumber(approvedSnapshot.version) || 1}`,
    summary
  };
};

export const buildMaterialBenchmarkHistoryEntry = ({
  previousMaterial = null,
  nextMaterial = {},
  actor = 'BOQ Pro Market Review',
  activeRegion = 'Lagos',
  changedAt = new Date().toISOString(),
  reason = ''
} = {}) => {
  const previousRegionRates = normalizeHistoryRegionRates(previousMaterial?.regionRates || previousMaterial?.regions || {});
  const nextRegionRates = normalizeHistoryRegionRates(nextMaterial?.regionRates || nextMaterial?.regions || {});
  const previousBenchmark = clampNumber(previousMaterial?.benchmark);
  const nextBenchmark = clampNumber(nextMaterial?.benchmark);
  const previousApproval = String(previousMaterial?.approvalStatus || (previousMaterial?.approvedAt ? 'approved' : 'review')).toLowerCase().trim();
  const nextApproval = String(nextMaterial?.approvalStatus || (nextMaterial?.approvedAt ? 'approved' : 'review')).toLowerCase().trim();
  const regionChanges = summarizeRegionChanges(previousRegionRates, nextRegionRates);

  let title = 'Benchmark evidence updated';
  let action = 'benchmark-update';

  if (!previousMaterial?.id && !previousMaterial?.name) {
    title = 'Benchmark record created';
    action = 'create';
  } else if (previousBenchmark !== nextBenchmark) {
    title = 'Benchmark recalibrated';
    action = 'recalibrated';
  } else if (regionChanges.length) {
    title = 'Regional benchmark matrix updated';
    action = 'regional-update';
  } else if (previousApproval !== nextApproval) {
    title = 'Benchmark governance updated';
    action = 'governance-update';
  }

  return {
    id: `${nextMaterial?.id || nextMaterial?.name || 'material'}-history-${changedAt}`,
    title,
    action,
    actor,
    changedAt,
    benchmark: nextBenchmark,
    previousBenchmark,
    marketRead: clampNumber(nextMaterial?.price ?? nextMaterial?.currentRead),
    approvalStatus: nextApproval,
    approvedBy: nextMaterial?.approvedBy || '',
    sourceCount: clampNumber(nextMaterial?.sourceCount),
    confidence: clampNumber(nextMaterial?.confidence),
    activeRegion,
    regionRates: nextRegionRates,
    previousRegionRates,
    regionChanges,
    changeSummary: regionChanges.slice(0, 4).join(' | '),
    note: reason || nextMaterial?.benchmarkDeskNote || ''
  };
};

export const getMaterialRegionalBenchmark = (material, region = 'Lagos') => {
  if (!material) return 0;

  const regionRates = material.regionRates || material.regions || {};
  const requestedRegionKey = normalizeRegionLookup(region);

  for (const [regionName, value] of Object.entries(regionRates)) {
    if (normalizeRegionLookup(regionName) === requestedRegionKey) {
      return clampNumber(value);
    }
  }

  return clampNumber(material.benchmark || material.price || material.rate);
};

export const getExactMaterialRegionalBenchmark = (material, region = 'Lagos') => {
  if (!material) return 0;

  const regionRates = material.regionRates || material.regions || {};
  const requestedRegionKey = normalizeRegionLookup(region);

  for (const [regionName, value] of Object.entries(regionRates)) {
    if (normalizeRegionLookup(regionName) === requestedRegionKey) {
      return clampNumber(value);
    }
  }

  return 0;
};

export const normalizeMaterialBenchmarkRecord = (material = {}) => {
  if (!material || typeof material !== 'object') return material;

  const benchmark = clampNumber(material.benchmark ?? material.price ?? material.rate);
  const marketRead = clampNumber(material.price ?? material.currentRead ?? material.rate ?? benchmark);
  const regionRates = normalizeRegionRates(material, benchmark, marketRead);
  const resolvedUpdatedAt = resolveDate(
    material.updatedAt
    || material.updated_at
    || material.created_at
  )?.toISOString() || null;
  const sources = normalizeSources(material, {
    benchmark,
    marketRead,
    regionRates,
    updatedAt: resolvedUpdatedAt
  });
  const sourceCount = Math.max(clampNumber(material.sourceCount), sources.length || 0);
  const confidence = normalizeConfidenceValue(
    material.confidence,
    sourceCount,
    resolvedUpdatedAt,
    Object.keys(regionRates).length,
    Array.isArray(material.history) ? material.history.length : 0
  );
  const confidenceLabel = material.confidenceLabel || getBenchmarkConfidenceLabel(confidence);
  const bandLow = benchmark > 0 ? benchmark * 0.94 : marketRead * 0.94;
  const bandHigh = marketRead > 0 ? marketRead * 1.06 : benchmark * 1.06;
  const benchmarkBand = material.benchmarkBand
    || material.range
    || `${formatCurrency(bandLow)} - ${formatCurrency(bandHigh)}`;
  const approvedAt = resolveDate(material.approvedAt || material.approved_at)?.toISOString() || null;
  const reviewCycleDays = clampNumber(material.reviewCycleDays) || 14;
  const nextReviewAt = resolveDate(material.nextReviewAt || material.next_review_at)?.toISOString()
    || (resolvedUpdatedAt
      ? new Date(new Date(resolvedUpdatedAt).getTime() + (reviewCycleDays * 86400000)).toISOString()
      : null);
  const approvalStatus = String(material.approvalStatus || (approvedAt ? 'approved' : 'review'))
    .toLowerCase()
    .trim() || 'review';
  const benchmarkHistory = normalizeBenchmarkHistory(material, {
    benchmark,
    marketRead,
    regionRates,
    updatedAt: resolvedUpdatedAt,
    verifiedBy: material.verifiedBy || 'BOQ Pro Market Review',
    approvalStatus,
    approvedBy: material.approvedBy || material.verifiedBy || 'BOQ Pro Market Review',
    sourceCount,
    confidence,
    benchmarkDeskNote: material.benchmarkDeskNote || material.marketDeskNote || ''
  });
  const approvedSnapshots = normalizeApprovedSnapshots(material, {
    benchmark,
    marketRead,
    regionRates,
    updatedAt: resolvedUpdatedAt,
    approvedAt,
    verifiedBy: material.verifiedBy || 'BOQ Pro Market Review',
    approvalStatus,
    approvedBy: material.approvedBy || material.verifiedBy || 'BOQ Pro Market Review',
    sourceCount,
    confidence,
    benchmarkBand,
    benchmarkDeskNote: material.benchmarkDeskNote || material.marketDeskNote || ''
  });
  const approvedSnapshot = approvedSnapshots[0] || null;

  return {
    ...material,
    price: marketRead || benchmark,
    currentRead: marketRead || benchmark,
    benchmark: benchmark || marketRead,
    regionRates,
    regions: { ...regionRates },
    sourceCount,
    sources,
    confidence,
    confidenceLabel,
    verifiedBy: material.verifiedBy || 'BOQ Pro Market Review',
    approvalStatus,
    approvedBy: material.approvedBy || material.verifiedBy || 'BOQ Pro Market Review',
    approvedAt,
    reviewCycleDays,
    nextReviewAt,
    benchmarkDeskNote: material.benchmarkDeskNote || material.marketDeskNote || '',
    benchmarkBand,
    range: material.range || benchmarkBand,
    approvedSnapshot,
    approvedSnapshots,
    benchmarkHistory,
    updatedAt: resolvedUpdatedAt,
    lastUpdated: resolvedUpdatedAt
      ? formatRelativeDate(resolvedUpdatedAt)
      : (material.lastUpdated || formatRelativeDate(material.updatedAt || material.updated_at))
  };
};

export const buildMaterialBenchmarkPayload = (material = {}) => {
  const normalized = normalizeMaterialBenchmarkRecord(material);
  const payload = {
    ...normalized,
    history: Array.isArray(normalized.history) ? [...normalized.history] : [],
    approvedSnapshot: normalized.approvedSnapshot
      ? {
        ...normalized.approvedSnapshot,
        regionRates: { ...(normalized.approvedSnapshot.regionRates || {}) }
      }
      : null,
    approvedSnapshots: Array.isArray(normalized.approvedSnapshots)
      ? normalized.approvedSnapshots.map((entry) => ({
        ...entry,
        regionRates: { ...(entry.regionRates || {}) }
      }))
      : [],
    benchmarkHistory: Array.isArray(normalized.benchmarkHistory)
      ? normalized.benchmarkHistory.map((entry) => ({
        ...entry,
        regionRates: { ...(entry.regionRates || {}) },
        previousRegionRates: { ...(entry.previousRegionRates || {}) },
        regionChanges: Array.isArray(entry.regionChanges) ? [...entry.regionChanges] : []
      }))
      : [],
    regionRates: { ...(normalized.regionRates || {}) },
    regions: { ...(normalized.regions || {}) },
    sources: Array.isArray(normalized.sources) ? normalized.sources.map((source) => ({ ...source })) : []
  };

  delete payload.id;
  delete payload.lastUpdated;

  return payload;
};
