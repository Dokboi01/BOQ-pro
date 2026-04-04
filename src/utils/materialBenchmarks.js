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
      note: ''
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
    note: source.note || ''
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
      note: material.delta ? `Current movement ${material.delta}` : ''
    },
    {
      label: `${primaryRegion} benchmark calibration`,
      type: 'benchmark-calibration',
      region: primaryRegion,
      rate: benchmarkRate || marketRead,
      capturedAt: updatedAt,
      note: material.range || material.benchmarkBand || ''
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
        note: ''
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
    benchmarkBand,
    range: material.range || benchmarkBand,
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
    regionRates: { ...(normalized.regionRates || {}) },
    regions: { ...(normalized.regions || {}) },
    sources: Array.isArray(normalized.sources) ? normalized.sources.map((source) => ({ ...source })) : []
  };

  delete payload.id;
  delete payload.lastUpdated;

  return payload;
};
