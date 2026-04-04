import { getRegionalModifier } from './aiService';
import { getBreakdownForItem } from '../data/rateBreakdowns';
import {
  getExactMaterialRegionalBenchmark,
  getMaterialRegionalBenchmark,
  normalizeMaterialBenchmarkRecord
} from './materialBenchmarks';

export const WORK_TYPE_PROFILES = {
  concrete: { shares: { materials: 0.58, labour: 0.18, plant: 0.14, transport: 0.10 }, waste: 2.5, siteAdjustment: 3, overheads: 12, profit: 10, roundingStep: 100 },
  masonry: { shares: { materials: 0.61, labour: 0.22, plant: 0.05, transport: 0.12 }, waste: 3, siteAdjustment: 2, overheads: 12, profit: 12, roundingStep: 50 },
  plastering: { shares: { materials: 0.55, labour: 0.27, plant: 0.04, transport: 0.14 }, waste: 5, siteAdjustment: 2, overheads: 10, profit: 15, roundingStep: 50 },
  tiling: { shares: { materials: 0.64, labour: 0.22, plant: 0.02, transport: 0.12 }, waste: 7, siteAdjustment: 3, overheads: 10, profit: 15, roundingStep: 50 },
  painting: { shares: { materials: 0.52, labour: 0.30, plant: 0.03, transport: 0.15 }, waste: 3, siteAdjustment: 2, overheads: 10, profit: 15, roundingStep: 50 },
  formwork: { shares: { materials: 0.49, labour: 0.25, plant: 0.12, transport: 0.14 }, waste: 5, siteAdjustment: 3, overheads: 12, profit: 10, roundingStep: 100 },
  reinforcement: { shares: { materials: 0.71, labour: 0.15, plant: 0.05, transport: 0.09 }, waste: 5, siteAdjustment: 3, overheads: 12, profit: 10, roundingStep: 100 },
  roofing: { shares: { materials: 0.63, labour: 0.18, plant: 0.04, transport: 0.15 }, waste: 7, siteAdjustment: 4, overheads: 12, profit: 12, roundingStep: 100 },
  pipework: { shares: { materials: 0.59, labour: 0.22, plant: 0.05, transport: 0.14 }, waste: 4, siteAdjustment: 3, overheads: 12, profit: 12, roundingStep: 100 },
  plumbing: { shares: { materials: 0.61, labour: 0.20, plant: 0.04, transport: 0.15 }, waste: 4, siteAdjustment: 3, overheads: 10, profit: 12, roundingStep: 100 },
  electrical: { shares: { materials: 0.68, labour: 0.18, plant: 0.03, transport: 0.11 }, waste: 4, siteAdjustment: 2, overheads: 10, profit: 12, roundingStep: 100 },
  steelwork: { shares: { materials: 0.69, labour: 0.16, plant: 0.05, transport: 0.10 }, waste: 4, siteAdjustment: 4, overheads: 12, profit: 10, roundingStep: 100 },
  roadwork: { shares: { materials: 0.47, labour: 0.14, plant: 0.23, transport: 0.16 }, waste: 5, siteAdjustment: 5, overheads: 15, profit: 10, roundingStep: 100 },
  earthwork: { shares: { materials: 0.26, labour: 0.18, plant: 0.39, transport: 0.17 }, waste: 3, siteAdjustment: 5, overheads: 12, profit: 10, roundingStep: 100 },
  entranceworks: { shares: { materials: 0.66, labour: 0.16, plant: 0.04, transport: 0.14 }, waste: 4, siteAdjustment: 4, overheads: 12, profit: 12, roundingStep: 100 },
  general: { shares: { materials: 0.56, labour: 0.21, plant: 0.08, transport: 0.15 }, waste: 3, siteAdjustment: 3, overheads: 12, profit: 10, roundingStep: 100 }
};

const REGION_COST_PROFILES = {
  Lagos: { materials: 1, labour: 1, plant: 1, transport: 1, site: 1 },
  Abuja: { materials: 1.07, labour: 1.15, plant: 1.1, transport: 1.14, site: 1.05 },
  Port_Harcourt: { materials: 1.05, labour: 1.11, plant: 1.08, transport: 1.15, site: 1.06 },
  Ibadan: { materials: 0.93, labour: 0.91, plant: 0.94, transport: 0.91, site: 0.96 },
  Kano: { materials: 0.95, labour: 0.93, plant: 0.96, transport: 0.95, site: 0.98 }
};

const STOP_WORDS = new Set([
  'mm',
  'kg',
  'bag',
  'bags',
  'sheet',
  'sheets',
  'block',
  'blocks',
  'unit',
  'units',
  'size',
  'dia',
  'with',
  'for',
  'and',
  'the',
  'of',
  'in',
  'by',
  'per',
  'high',
  'yield',
  'grade',
  'coated',
  'drilling'
]);

const SYNONYM_GROUPS = [
  ['cement', 'opc'],
  ['sand', 'sharp', 'river'],
  ['granite', 'aggregate', 'stone'],
  ['steel', 'rebar', 'reinforcement', 'bar'],
  ['tile', 'tiles', 'ceramic', 'porcelain', 'granite'],
  ['paint', 'emulsion', 'primer', 'satin'],
  ['roofing', 'aluminium', 'aluminum', 'sheet'],
  ['block', 'blocks', 'sandcrete', 'hollow'],
  ['wire', 'binding'],
  ['pipe', 'pvc', 'hdpe', 'culvert'],
  ['timber', 'wood', 'hardwood', 'purlin', 'rafter'],
  ['waterproofing', 'waterproof', 'membrane', 'admixture']
];

export const DEFAULT_OUTLIER_TOLERANCE = 0.25;
/** @deprecated use DEFAULT_OUTLIER_TOLERANCE */
export const OUTLIER_TOLERANCE = DEFAULT_OUTLIER_TOLERANCE;

export const clampNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeRegionKey = (value = '') => (
  String(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const parseIsoTimestamp = (value) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizeUnit = (unit = '') => {
  const value = String(unit).toLowerCase().replace(/\s+/g, '');
  if (/(mÂ³|m3|cum|cubic)/.test(value)) return 'm3';
  if (/(mÂ²|m2|sqm|sq\.m|square)/.test(value)) return 'm2';
  if (/^(m|lm|rm|linm|mtr|meter|metre)$/.test(value)) return 'm';
  if (/^(kg|kilogram)$/.test(value)) return 'kg';
  if (/^(ton|t|tonne)$/.test(value)) return 'ton';
  if (/^(nr|no|nos|pcs|pc|item|sum)$/.test(String(unit).trim().toLowerCase())) return 'nr';
  return 'm3';
};

export const inferWorkType = (description = '') => {
  const text = String(description).toLowerCase();
  if (/paint|emulsion|satin|texcote|acrylic|weather.?shield/.test(text)) return 'painting';
  if (/tile|terrazzo|granolithicterraz|ceramic|porcelain|granite tile/.test(text)) return 'tiling';
  if (/plaster|render|screed|sand.?and.?cement|bonding coat/.test(text)) return 'plastering';
  if (/block|masonry|sandcrete|brick|block.?wall|225mm|150mm/.test(text)) return 'masonry';
  if (/formwork|shuttering|falsework/.test(text)) return 'formwork';
  if (/rebar|reinforcement|brc mesh|high yield|y12|y16|y20|y25|r10/.test(text)) return 'reinforcement';
  if (/roof|sheet|truss|purlin|rafter|stone.?coated|long.?span|corrugated|ridge/.test(text)) return 'roofing';
  if (/pipe|drain|culvert|sewer|u.?drain|drainage channel|manhole|catch pit|septic|soakaway|soak.?away|biodigester/.test(text)) return 'pipework';
  if (/plumb|sanitary|water supply|wc|toilet|basin|shower|borehole|sump|overhead tank/.test(text)) return 'plumbing';
  if (/electrical|cable|conduit|lighting|street light|distribution board|power point/.test(text)) return 'electrical';
  if (/steel|fabricat|weld|portal frame|i.?beam|h.?section|hollow section|steel gate|gate/.test(text)) return 'steelwork';
  if (/road|asphalt|kerb|paving|base course|sub.?base|prime coat|tack coat|wearing course/.test(text)) return 'roadwork';
  if (/excavat|backfill|earthwork|topsoil|strip|clearance|vegetation|filling|compaction|borrow/.test(text)) return 'earthwork';
  if (/backyard|entrance gate|wicket|fence gate|service gate/.test(text)) return 'entranceworks';
  if (/ironmongery|door hardware|door lock|mortice|butt hinge|door closer|flush bolt|door handle|door furniture/.test(text)) return 'general'; // hardware — use general profile
  if (/suspended ceiling|pop ceiling|gypsum|false ceiling|ceiling tile/.test(text)) return 'general';
  if (/terrazzo|granolithic/.test(text)) return 'tiling';
  if (/concrete|slab|beam|column|foundation|pile|abutment|raft|blinding|strip found|ground beam/.test(text)) return 'concrete';
  return 'general';
};

export const getWorkTypeProfile = (workType = 'general') => {
  return WORK_TYPE_PROFILES[workType] || WORK_TYPE_PROFILES.general;
};

export const getRegionalCostProfile = (region = 'Lagos') => {
  const fallback = Math.max(getRegionalModifier(region), 0.001);
  return REGION_COST_PROFILES[region] || {
    materials: fallback,
    labour: fallback,
    plant: fallback,
    transport: fallback,
    site: fallback
  };
};

export const cloneBreakdown = (breakdown) => {
  if (!breakdown) return null;

  return {
    ...breakdown,
    materials: Array.isArray(breakdown.materials) ? breakdown.materials.map((row) => ({ ...row })) : [],
    labor: Array.isArray(breakdown.labor) ? breakdown.labor.map((row) => ({ ...row })) : [],
    labour: Array.isArray(breakdown.labour) ? breakdown.labour.map((row) => ({ ...row })) : [],
    plant: Array.isArray(breakdown.plant) ? breakdown.plant.map((row) => ({ ...row })) : [],
    transport: Array.isArray(breakdown.transport) ? breakdown.transport.map((row) => ({ ...row })) : []
  };
};

export const getSuggestedOutput = ({ category, rowName, workType, unit }) => {
  const name = String(rowName || '').toLowerCase();

  if (category === 'labor' || category === 'labour') {
    if (workType === 'concrete') return unit === 'm3' ? 5 : 4;
    if (workType === 'masonry') return unit === 'm2' ? (name.includes('general') ? 18 : 9) : 5;
    if (workType === 'plastering') return unit === 'm2' ? (name.includes('general') ? 25 : 14) : 10;
    if (workType === 'tiling') return unit === 'm2' ? 10 : 6;
    if (workType === 'painting') return unit === 'm2' ? 28 : 18;
    if (workType === 'formwork') return unit === 'm2' ? 8 : 5;
    if (workType === 'reinforcement') return unit === 'kg' ? 350 : unit === 'ton' ? 0.35 : 1;
    if (workType === 'roofing') return unit === 'm2' ? 18 : 10;
    if (workType === 'pipework' || workType === 'plumbing') return unit === 'm' ? 12 : 4;
    if (workType === 'electrical') return unit === 'm' ? 25 : 6;
    if (workType === 'steelwork') return unit === 'kg' ? 250 : unit === 'ton' ? 0.25 : 3;
    if (workType === 'roadwork') return unit === 'm2' ? 120 : unit === 'm3' ? 25 : 15;
    if (workType === 'earthwork') return unit === 'm3' ? 12 : 20;
  }

  if (category === 'plant') {
    if (name.includes('excavator')) return unit === 'm3' ? 80 : 40;
    if (name.includes('mixer')) return unit === 'm3' ? 6 : 4;
    if (name.includes('vibrator')) return unit === 'm3' ? 12 : 6;
    if (name.includes('roller')) return unit === 'm2' ? 400 : 200;
    if (name.includes('grader')) return unit === 'm2' ? 800 : 250;
    if (name.includes('compactor')) return unit === 'm2' ? 150 : 30;
    if (name.includes('pump')) return unit === 'm3' ? 30 : 10;
    if (name.includes('formwork')) return unit === 'm2' ? 12 : 8;
    if (name.includes('crane')) return unit === 'ton' ? 8 : unit === 'nr' ? 6 : 4;
    if (name.includes('generator')) return unit === 'm2' ? 80 : unit === 'm3' ? 15 : 20;
    if (name.includes('truck')) return unit === 'm3' ? 30 : 15;
  }

  if (unit === 'm3') return category === 'plant' ? 20 : 5;
  if (unit === 'm2') return category === 'plant' ? 80 : 12;
  if (unit === 'm') return category === 'plant' ? 100 : 15;
  if (unit === 'kg') return category === 'plant' ? 600 : 300;
  if (unit === 'ton') return category === 'plant' ? 0.8 : 0.3;
  return 1;
};

export const normalizeBreakdownForItem = (breakdown, item = {}) => {
  const unit = normalizeUnit(item?.unit);
  const workType = inferWorkType(item?.description);
  const defaults = getWorkTypeProfile(workType);
  const safe = cloneBreakdown(breakdown) || {};
  const laborRows = safe.labor || safe.labour || [];

  return {
    ...safe,
    materials: (safe.materials || []).map((row) => ({ ...row, waste: row.waste ?? defaults.waste })),
    labor: laborRows.map((row) => ({
      ...row,
      output: row.output ?? getSuggestedOutput({ category: 'labor', rowName: row.name || '', workType, unit })
    })),
    plant: (safe.plant || []).map((row) => ({
      ...row,
      output: row.output ?? getSuggestedOutput({ category: 'plant', rowName: row.name || '', workType, unit })
    })),
    transport: safe.transport || [],
    overheads: safe.overheads ?? defaults.overheads,
    profit: safe.profit ?? defaults.profit
  };
};

export const getLineTotal = (category, row) => {
  if (category === 'materials') {
    return clampNumber(row.qty) * clampNumber(row.rate) * (1 + (clampNumber(row.waste) / 100));
  }

  if (category === 'labor' || category === 'labour' || category === 'plant') {
    return (clampNumber(row.qty) * clampNumber(row.rate)) / Math.max(clampNumber(row.output) || 1, 0.001);
  }

  return clampNumber(row.qty) * clampNumber(row.rate);
};

export const calculateBreakdownSummary = (breakdown = {}) => {
  const materials = breakdown.materials || [];
  const laborRows = breakdown.labor || breakdown.labour || [];
  const plantRows = breakdown.plant || [];
  const transportRows = breakdown.transport || [];

  const materialBase = materials.reduce((sum, row) => sum + (clampNumber(row.qty) * clampNumber(row.rate)), 0);
  const materialsTotal = materials.reduce((sum, row) => sum + getLineTotal('materials', row), 0);
  const labourTotal = laborRows.reduce((sum, row) => sum + getLineTotal('labor', row), 0);
  const plantTotal = plantRows.reduce((sum, row) => sum + getLineTotal('plant', row), 0);
  const transportTotal = transportRows.reduce((sum, row) => sum + getLineTotal('transport', row), 0);
  const wasteValue = materialsTotal - materialBase;
  const primeCost = materialsTotal + labourTotal + plantTotal + transportTotal;
  const overheadValue = primeCost * (clampNumber(breakdown.overheads) / 100);
  const profitValue = (primeCost + overheadValue) * (clampNumber(breakdown.profit) / 100);
  const unitRate = primeCost + overheadValue + profitValue;

  return {
    materialBase,
    materialsTotal,
    labourTotal,
    plantTotal,
    transportTotal,
    wasteValue,
    primeCost,
    overheadValue,
    profitValue,
    unitRate
  };
};

export const calculateCustomPricingSummary = (pricing = {}) => {
  const materialBase = clampNumber(pricing.materialsCost);
  const labourBase = clampNumber(pricing.labourCost);
  const plantBase = clampNumber(pricing.plantCost);
  const transportBase = clampNumber(pricing.transportCost);
  const directCost = materialBase + labourBase + plantBase + transportBase;
  const wasteValue = materialBase * (clampNumber(pricing.wastePercent) / 100);
  const siteValue = (directCost + wasteValue) * (clampNumber(pricing.siteAdjustmentPercent) / 100);
  const subtotalBeforeOverheads = directCost + wasteValue + siteValue;
  const overheadValue = subtotalBeforeOverheads * (clampNumber(pricing.overheadsPercent) / 100);
  const subtotalBeforeProfit = subtotalBeforeOverheads + overheadValue;
  const profitValue = subtotalBeforeProfit * (clampNumber(pricing.profitPercent) / 100);
  const rawRate = subtotalBeforeProfit + profitValue;
  const roundingStep = Math.max(clampNumber(pricing.roundingStep), 0);
  const finalRate = roundingStep > 0 ? Math.ceil(rawRate / roundingStep) * roundingStep : rawRate;

  return {
    directCost,
    wasteValue,
    siteValue,
    overheadValue,
    profitValue,
    rawRate,
    finalRate
  };
};

export const scalePricingSeedToReference = (seeded, referenceRate) => {
  if (!referenceRate) return seeded;

  let nextSeed = { ...seeded };
  for (let idx = 0; idx < 6; idx += 1) {
    const current = calculateCustomPricingSummary(nextSeed).finalRate || 1;
    const scale = referenceRate / current;
    nextSeed = {
      ...nextSeed,
      materialsCost: nextSeed.materialsCost * scale,
      labourCost: nextSeed.labourCost * scale,
      plantCost: nextSeed.plantCost * scale,
      transportCost: nextSeed.transportCost * scale
    };
  }

  return nextSeed;
};

export const seedCustomPricingFromReference = (referenceRate, workType = 'general') => {
  const profile = getWorkTypeProfile(workType);
  const baseDirect = Math.max(referenceRate * 0.78, 0);

  return scalePricingSeedToReference({
    workType,
    materialsCost: baseDirect * profile.shares.materials,
    labourCost: baseDirect * profile.shares.labour,
    plantCost: baseDirect * profile.shares.plant,
    transportCost: baseDirect * profile.shares.transport,
    wastePercent: profile.waste,
    siteAdjustmentPercent: profile.siteAdjustment,
    overheadsPercent: profile.overheads,
    profitPercent: profile.profit,
    roundingStep: profile.roundingStep,
    pricingReference: '',
    supplierQuote: '',
    notes: ''
  }, referenceRate);
};

export const seedCustomPricingFromBreakdown = (item, workType = inferWorkType(item?.description)) => {
  const profile = getWorkTypeProfile(workType);
  const breakdown = normalizeBreakdownForItem(item?.breakdown || {}, item);
  const materialRows = breakdown.materials || [];

  return {
    workType,
    materialsCost: materialRows.reduce((sum, row) => sum + getLineTotal('materials', { ...row, waste: 0 }), 0),
    labourCost: (breakdown.labor || []).reduce((sum, row) => sum + getLineTotal('labor', row), 0),
    plantCost: (breakdown.plant || []).reduce((sum, row) => sum + getLineTotal('plant', row), 0),
    transportCost: (breakdown.transport || []).reduce((sum, row) => sum + getLineTotal('transport', row), 0),
    wastePercent: materialRows.length > 0
      ? materialRows.reduce((sum, row) => sum + clampNumber(row.waste), 0) / materialRows.length
      : profile.waste,
    siteAdjustmentPercent: profile.siteAdjustment,
    overheadsPercent: breakdown.overheads ?? profile.overheads,
    profitPercent: breakdown.profit ?? profile.profit,
    roundingStep: profile.roundingStep,
    pricingReference: 'Imported from detailed rate build-up',
    supplierQuote: '',
    notes: ''
  };
};

export const normalizeSavedCustomPricing = (pricing = {}, workType = pricing?.workType || 'general') => {
  const profile = getWorkTypeProfile(workType);

  return {
    workType: pricing.workType || workType,
    materialsCost: clampNumber(pricing.materialsCost),
    labourCost: clampNumber(pricing.labourCost),
    plantCost: clampNumber(pricing.plantCost),
    transportCost: clampNumber(pricing.transportCost),
    wastePercent: clampNumber(pricing.wastePercent ?? profile.waste),
    siteAdjustmentPercent: clampNumber(pricing.siteAdjustmentPercent ?? profile.siteAdjustment),
    overheadsPercent: clampNumber(pricing.overheadsPercent ?? profile.overheads),
    profitPercent: clampNumber(pricing.profitPercent ?? profile.profit),
    roundingStep: clampNumber(pricing.roundingStep ?? profile.roundingStep),
    pricingReference: pricing.pricingReference || '',
    supplierQuote: pricing.supplierQuote || '',
    notes: pricing.notes || ''
  };
};

const normalizeText = (value = '') => {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

const tokenize = (value = '') => {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token && token.length > 1 && !STOP_WORDS.has(token));
};

const expandTokens = (tokens) => {
  const expanded = new Set(tokens);

  tokens.forEach((token) => {
    SYNONYM_GROUPS.forEach((group) => {
      if (group.includes(token)) {
        group.forEach((entry) => expanded.add(entry));
      }
    });
  });

  return expanded;
};

export const buildMaterialRateIndex = (materials = []) => {
  return materials
    .map((material) => {
      const normalizedMaterial = normalizeMaterialBenchmarkRecord(material);
      const rate = clampNumber(
        getMaterialRegionalBenchmark(normalizedMaterial, 'Lagos')
        || normalizedMaterial?.price
        || normalizedMaterial?.rate
      );
      if (!rate || !normalizedMaterial?.name) return null;

      const baseTokens = tokenize(normalizedMaterial.name);
      return {
        name: normalizedMaterial.name,
        normalizedName: normalizeText(normalizedMaterial.name),
        tokens: expandTokens(baseTokens),
        rate,
        sourceCount: normalizedMaterial.sourceCount || 0,
        confidence: normalizedMaterial.confidence || 0,
        confidenceLabel: normalizedMaterial.confidenceLabel || 'Medium',
        verifiedBy: normalizedMaterial.verifiedBy || '',
        updatedAt: normalizedMaterial.updatedAt || null,
        regionRates: { ...(normalizedMaterial.regionRates || normalizedMaterial.regions || {}) },
        sources: Array.isArray(normalizedMaterial.sources) ? normalizedMaterial.sources.map((source) => ({ ...source })) : [],
        benchmarkBand: normalizedMaterial.benchmarkBand || normalizedMaterial.range || ''
      };
    })
    .filter(Boolean);
};

export const findMarketMaterialMatch = (row, materialIndex = []) => {
  if (!row?.name || !materialIndex.length) return null;

  const normalizedRow = normalizeText(row.name);
  const rowTokens = Array.from(expandTokens(tokenize(row.name)));
  let bestMatch = null;

  materialIndex.forEach((candidate) => {
    let score = 0;

    if (candidate.normalizedName === normalizedRow) {
      score += 100;
    } else if (candidate.normalizedName.includes(normalizedRow) || normalizedRow.includes(candidate.normalizedName)) {
      score += 35;
    }

    rowTokens.forEach((token) => {
      if (candidate.tokens.has(token)) {
        score += token.length > 4 ? 9 : 5;
      }
    });

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { ...candidate, score };
    }
  });

  if (!bestMatch) return null;
  if (bestMatch.score >= 12) return bestMatch;
  if (rowTokens.length <= 2 && bestMatch.score >= 5) return bestMatch;
  return null;
};

export const findMarketRateForMaterial = (row, materialIndex = []) => {
  return findMarketMaterialMatch(row, materialIndex)?.rate || 0;
};

export const applyMarketRatesToBreakdown = (breakdown, materialIndex = []) => {
  if (!breakdown) return breakdown;

  return {
    ...cloneBreakdown(breakdown),
    materials: (breakdown.materials || []).map((row) => {
      const match = findMarketMaterialMatch(row, materialIndex);
      if (!match) return { ...row };

      return {
        ...row,
        rate: match.rate,
        benchmarkSource: match.name,
        benchmarkSourceCount: match.sourceCount || 0,
        benchmarkSources: Array.isArray(match.sources) ? match.sources.slice(0, 3).map((source) => source.label) : [],
        benchmarkConfidence: match.confidence || 0,
        benchmarkConfidenceLabel: match.confidenceLabel || 'Medium',
        benchmarkVerifiedBy: match.verifiedBy || '',
        benchmarkUpdatedAt: match.updatedAt || null,
        benchmarkBand: match.benchmarkBand || '',
        benchmarkBaseRate: match.rate,
        benchmarkRegionRates: { ...(match.regionRates || {}) }
      };
    })
  };
};

export const applyRegionCostProfileToBreakdown = (breakdown, region = 'Lagos', item = {}) => {
  if (!breakdown) return breakdown;

  const profile = getRegionalCostProfile(region);
  const normalized = normalizeBreakdownForItem(breakdown, item);

  return {
    ...cloneBreakdown(normalized),
    materials: (normalized.materials || []).map((row) => {
      const exactRegionalRate = getExactMaterialRegionalBenchmark({
        benchmark: row.benchmarkBaseRate ?? row.rate,
        regionRates: row.benchmarkRegionRates || {}
      }, region);

      return {
        ...row,
        rate: exactRegionalRate || (clampNumber(row.rate) * profile.materials)
      };
    }),
    labor: (normalized.labor || []).map((row) => ({ ...row, rate: clampNumber(row.rate) * profile.labour })),
    plant: (normalized.plant || []).map((row) => ({ ...row, rate: clampNumber(row.rate) * profile.plant })),
    transport: (normalized.transport || []).map((row) => ({ ...row, rate: clampNumber(row.rate) * profile.transport }))
  };
};

export const applyRegionCostProfileToPricing = (pricing, region = 'Lagos') => {
  const profile = getRegionalCostProfile(region);

  return {
    ...pricing,
    materialsCost: clampNumber(pricing.materialsCost) * profile.materials,
    labourCost: clampNumber(pricing.labourCost) * profile.labour,
    plantCost: clampNumber(pricing.plantCost) * profile.plant,
    transportCost: clampNumber(pricing.transportCost) * profile.transport,
    siteAdjustmentPercent: clampNumber(pricing.siteAdjustmentPercent) * profile.site
  };
};

const summarizeBenchmarkEvidence = (breakdown, region = 'Lagos', matchSource = 'keyword', benchmarkRegionalRates = {}) => {
  const materialRows = (breakdown?.materials || []).filter((row) => (
    row?.benchmarkSource
    || row?.benchmarkSourceCount
    || row?.benchmarkVerifiedBy
    || row?.benchmarkUpdatedAt
    || row?.benchmarkBand
    || Object.keys(row?.benchmarkRegionRates || {}).length
  ));

  const sourceLabels = Array.from(new Set(
    materialRows.flatMap((row) => (
      Array.isArray(row?.benchmarkSources) && row.benchmarkSources.length
        ? row.benchmarkSources
        : row?.benchmarkSource
          ? [row.benchmarkSource]
          : []
    ))
  )).slice(0, 4);

  const sourceCount = materialRows.reduce((sum, row) => sum + clampNumber(row?.benchmarkSourceCount), 0)
    || sourceLabels.length
    || 0;
  const verifiedBy = Array.from(new Set(
    materialRows.map((row) => row?.benchmarkVerifiedBy).filter(Boolean)
  )).join(', ') || 'BOQ Pro Market Review';
  const exactRegions = Array.from(new Set(
    materialRows.flatMap((row) => Object.keys(row?.benchmarkRegionRates || {}))
  ));
  const latestUpdatedAt = materialRows.reduce((latest, row) => {
    const current = parseIsoTimestamp(row?.benchmarkUpdatedAt);
    return current > latest ? current : latest;
  }, 0);
  const benchmarkBand = materialRows.find((row) => row?.benchmarkBand)?.benchmarkBand || '';
  const normalizedRequestedRegion = normalizeRegionKey(region);
  const hasExactRegionalData = normalizedRequestedRegion === 'lagos'
    || exactRegions.some((entry) => normalizeRegionKey(entry) === normalizedRequestedRegion);

  let mode = 'modeled';
  if (!materialRows.length && matchSource === 'fallback') {
    mode = 'fallback';
  } else if (region === 'Lagos' && materialRows.length) {
    mode = 'lagos-exact';
  } else if (hasExactRegionalData && materialRows.length) {
    mode = 'exact-region';
  } else if (materialRows.length || Object.keys(benchmarkRegionalRates || {}).length > 1) {
    mode = 'regional-adjusted';
  }

  return {
    mode,
    sourceCount,
    sources: sourceLabels,
    verifiedBy,
    updatedAt: latestUpdatedAt ? new Date(latestUpdatedAt).toISOString() : null,
    benchmarkBand,
    exactRegions,
    matchSource,
    matchedMaterialCount: materialRows.length,
  };
};

export const getItemBenchmarkEvidence = (item, region = 'Lagos') => {
  if (!item) return null;

  const baseEvidence = item.benchmarkEvidence && typeof item.benchmarkEvidence === 'object'
    ? item.benchmarkEvidence
    : {};
  const normalizedRequestedRegion = normalizeRegionKey(region);
  const exactRegionalRate = getExactMaterialRegionalBenchmark({
    benchmark: item?.benchmark,
    regionRates: item?.benchmarkRegionalRates || {}
  }, region);
  const exactRegions = Array.isArray(baseEvidence.exactRegions)
    ? baseEvidence.exactRegions
    : [];
  const hasExactRegionalData = normalizedRequestedRegion === 'lagos'
    || exactRegionalRate > 0
    || exactRegions.some((entry) => normalizeRegionKey(entry) === normalizedRequestedRegion);

  let mode = baseEvidence.mode || 'modeled';
  if (baseEvidence.overrideRegion && normalizeRegionKey(baseEvidence.overrideRegion) === normalizedRequestedRegion) {
    mode = 'manual-override';
  } else if (normalizedRequestedRegion === 'lagos' && (item?.benchmark || exactRegionalRate)) {
    mode = 'lagos-exact';
  } else if (hasExactRegionalData) {
    mode = 'exact-region';
  } else if (Object.keys(item?.benchmarkRegionalRates || {}).length > 1 || item?.benchmark) {
    mode = 'regional-adjusted';
  }

  return {
    ...baseEvidence,
    mode,
    hasExactRegionalData,
    exactRegionalRate: exactRegionalRate || 0,
    sourceCount: clampNumber(baseEvidence.sourceCount),
    sources: Array.isArray(baseEvidence.sources) ? baseEvidence.sources : [],
    verifiedBy: baseEvidence.verifiedBy || '',
    updatedAt: baseEvidence.updatedAt || null,
    benchmarkBand: baseEvidence.benchmarkBand || '',
    exactRegions,
  };
};

// Cache for regional benchmark factors: key = "workType|region"
const _regionalFactorCache = new Map();

export const getBenchmarkRegionalFactor = (item, region = 'Lagos') => {
  if (!region || region === 'Lagos') return 1;

  const exactRegionalRate = getExactMaterialRegionalBenchmark({
    benchmark: item?.benchmark,
    regionRates: item?.benchmarkRegionalRates || {}
  }, region);
  const lagosRate = getExactMaterialRegionalBenchmark({
    benchmark: item?.benchmark,
    regionRates: item?.benchmarkRegionalRates || {}
  }, 'Lagos') || clampNumber(item?.benchmark);

  if (exactRegionalRate > 0 && lagosRate > 0) {
    return exactRegionalRate / lagosRate;
  }

  const workType = item?.customPricing?.workType || inferWorkType(item?.description);
  const cacheKey = `${workType}|${region}`;

  if (_regionalFactorCache.has(cacheKey)) return _regionalFactorCache.get(cacheKey);

  const seed = seedCustomPricingFromReference(100, workType);
  const baseRate = calculateCustomPricingSummary(seed).finalRate || 100;
  const regionalRate = calculateCustomPricingSummary(applyRegionCostProfileToPricing(seed, region)).finalRate || baseRate;
  const factor = regionalRate / baseRate;
  const resolved = Number.isFinite(factor) && factor > 0 ? factor : Math.max(getRegionalModifier(region), 0.001);

  _regionalFactorCache.set(cacheKey, resolved);
  return resolved;
};

export const getEffectiveBenchmarkRate = (item, region = 'Lagos') => {
  const exactRegionalRate = getExactMaterialRegionalBenchmark({
    benchmark: item?.benchmark,
    regionRates: item?.benchmarkRegionalRates || {}
  }, region);
  if (exactRegionalRate > 0) return exactRegionalRate;

  const benchmark = clampNumber(item?.benchmark);
  if (!benchmark) return 0;
  return benchmark * getBenchmarkRegionalFactor(item, region);
};

export const getItemUnitRate = (item, region = 'Lagos') => {
  return item?.useBenchmark ? getEffectiveBenchmarkRate(item, region) : clampNumber(item?.rate);
};

export const getItemTotal = (item, region = 'Lagos') => {
  return Math.max(clampNumber(item?.qty), 0) * getItemUnitRate(item, region);
};

export const isBenchmarkOutlier = (rate, benchmark, tolerance = DEFAULT_OUTLIER_TOLERANCE) => {
  if (!benchmark || !rate) return false;
  const delta = Math.abs(rate - benchmark) / benchmark;
  return delta > tolerance;
};

/**
 * Returns a human-readable benchmark confidence label based on how the breakdown was matched.
 * 'keyword'          => 'High'   (exact description match in rateBreakdowns)
 * 'structure-default'=> 'Medium' (structure-type fallback)
 * 'fallback'         => 'Low'    (generic concrete mix fallback)
 * undefined          => 'Medium' (legacy items without matchSource)
 */
export const getBenchmarkConfidenceLabel = (matchSource) => {
  if (matchSource === 'keyword') return 'High';
  if (matchSource === 'fallback') return 'Low';
  return 'Medium';
};

export const buildAutoRateResult = (item, { structureType, region = 'Lagos', materialIndex = [] } = {}) => {
  const rawBreakdown = item?.breakdown
    ? normalizeBreakdownForItem(item.breakdown, item)
    : null;

  // getBreakdownForItem now returns matchSource too
  const breakdownResult = rawBreakdown
    ? { ...normalizeBreakdownForItem(rawBreakdown, item), matchSource: item.breakdownMatchSource || 'keyword' }
    : getBreakdownForItem(item?.description, structureType);

  const sourceBreakdown = normalizeBreakdownForItem(breakdownResult, item);
  const matchSource = breakdownResult.matchSource || 'keyword';

  const marketAligned = applyMarketRatesToBreakdown(sourceBreakdown, materialIndex);
  const regionalized = applyRegionCostProfileToBreakdown(marketAligned, region, item);
  const summary = calculateBreakdownSummary(regionalized);
  const supportedRegions = Array.from(new Set([
    'Lagos',
    region,
    ...Object.keys(REGION_COST_PROFILES),
    ...(marketAligned.materials || []).flatMap((row) => Object.keys(row.benchmarkRegionRates || {}))
  ]));
  const benchmarkRegionalRates = supportedRegions.reduce((acc, regionName) => {
    const regionalSummary = calculateBreakdownSummary(
      applyRegionCostProfileToBreakdown(marketAligned, regionName, item)
    );

    if (regionalSummary.unitRate > 0) {
      acc[regionName] = regionalSummary.unitRate;
    }

    return acc;
  }, {});

  const benchmark = benchmarkRegionalRates.Lagos
    || summary.unitRate
    || clampNumber(item?.benchmark);

  return {
    benchmark,
    rate: benchmarkRegionalRates[region] || summary.unitRate,
    breakdown: regionalized,
    summary,
    matchSource,
    benchmarkEvidence: summarizeBenchmarkEvidence(marketAligned, region, matchSource, benchmarkRegionalRates),
    benchmarkRegionalRates,
  };
};

export const repriceSectionsForRegion = (sections = [], region = 'Lagos') => {
  return sections.map((section) => ({
    ...section,
    items: (section.items || []).map((item) => ({
      ...item,
      total: getItemTotal(item, region)
    }))
  }));
};

export const getItemPricingMode = (item) => {
  const manualRate = clampNumber(item?.rate);

  if (item?.useBenchmark) return 'benchmark';
  if (item?.customPricing) return 'custom';
  if (item?.breakdown || item?.rateSource === 'calculated') return 'calculated';
  if (manualRate > 0) return 'manual';
  return 'unpriced';
};

const getItemComposition = (item, region) => {
  const unitRate = getItemUnitRate(item, region);
  if (!unitRate) {
    return { materials: 0, labour: 0, plant: 0, transport: 0, commercial: 0 };
  }

  if (item?.customPricing) {
    const normalizedPricing = normalizeSavedCustomPricing(item.customPricing, item.customPricing.workType || inferWorkType(item?.description));
    const summary = calculateCustomPricingSummary(normalizedPricing);
    const scale = summary.finalRate > 0 ? unitRate / summary.finalRate : 1;

    return {
      materials: (clampNumber(normalizedPricing.materialsCost) + summary.wasteValue) * scale,
      labour: clampNumber(normalizedPricing.labourCost) * scale,
      plant: clampNumber(normalizedPricing.plantCost) * scale,
      transport: clampNumber(normalizedPricing.transportCost) * scale,
      commercial: (summary.siteValue + summary.overheadValue + summary.profitValue) * scale
    };
  }

  if (item?.breakdown) {
    const summary = calculateBreakdownSummary(normalizeBreakdownForItem(item.breakdown, item));
    const scale = summary.unitRate > 0 ? unitRate / summary.unitRate : 1;

    return {
      materials: summary.materialsTotal * scale,
      labour: summary.labourTotal * scale,
      plant: summary.plantTotal * scale,
      transport: summary.transportTotal * scale,
      commercial: (summary.overheadValue + summary.profitValue) * scale
    };
  }

  const workType = inferWorkType(item?.description);
  const seeded = seedCustomPricingFromReference(unitRate, workType);
  const summary = calculateCustomPricingSummary(seeded);

  return {
    materials: clampNumber(seeded.materialsCost) + summary.wasteValue,
    labour: clampNumber(seeded.labourCost),
    plant: clampNumber(seeded.plantCost),
    transport: clampNumber(seeded.transportCost),
    commercial: summary.siteValue + summary.overheadValue + summary.profitValue
  };
};

export const getProjectPricingAnalytics = (project = {}) => {
  const region = project?.region || 'Lagos';
  const sectionEntries = (project?.sections || []).map((section) => {
    const itemEntries = (section.items || []).map((item) => {
      const unitRate = getItemUnitRate(item, region);
      const total = getItemTotal(item, region);
      const benchmarkRate = getEffectiveBenchmarkRate(item, region);
      const pricingMode = getItemPricingMode(item);
      const composition = getItemComposition(item, region);

      return {
        sectionId: section.id,
        sectionTitle: section.title,
        item,
        unitRate,
        total,
        benchmarkRate,
        pricingMode,
        outlier: !item.useBenchmark && isBenchmarkOutlier(unitRate, benchmarkRate),
        composition
      };
    });

    return {
      section,
      total: itemEntries.reduce((sum, entry) => sum + entry.total, 0),
      quantity: (section.items || []).reduce((sum, item) => sum + Math.max(clampNumber(item.qty), 0), 0),
      items: itemEntries
    };
  });

  const items = sectionEntries.flatMap((entry) => entry.items);
  const totalSections = sectionEntries.length;
  const totalItems = items.length;
  const pricedItems = items.filter((entry) => entry.unitRate > 0).length;
  const unpricedItems = totalItems - pricedItems;
  const benchmarkItems = items.filter((entry) => entry.pricingMode === 'benchmark').length;
  const customItems = items.filter((entry) => entry.pricingMode === 'custom').length;
  const calculatedItems = items.filter((entry) => entry.pricingMode === 'calculated').length;
  const manualItems = items.filter((entry) => entry.pricingMode === 'manual').length;
  const benchmarkReferencedItems = items.filter((entry) => entry.benchmarkRate > 0).length;
  const outlierCount = items.filter((entry) => entry.outlier).length;
  const totalValue = items.reduce((sum, entry) => sum + entry.total, 0);
  const totalQuantity = items.reduce((sum, entry) => sum + Math.max(clampNumber(entry.item.qty), 0), 0);
  const pricingCoveragePercent = totalItems > 0 ? (pricedItems / totalItems) * 100 : 0;
  const benchmarkCoveragePercent = totalItems > 0 ? (benchmarkReferencedItems / totalItems) * 100 : 0;

  const composition = items.reduce((acc, entry) => {
    const quantity = Math.max(clampNumber(entry.item.qty), 0);
    acc.materials += entry.composition.materials * quantity;
    acc.labour += entry.composition.labour * quantity;
    acc.plant += entry.composition.plant * quantity;
    acc.transport += entry.composition.transport * quantity;
    acc.commercial += entry.composition.commercial * quantity;
    return acc;
  }, { materials: 0, labour: 0, plant: 0, transport: 0, commercial: 0 });

  const compositionRows = Object.entries(composition)
    .map(([key, amount]) => ({
      key,
      label: key === 'labour' ? 'Labour' : key.charAt(0).toUpperCase() + key.slice(1),
      amount,
      percent: totalValue > 0 ? (amount / totalValue) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const sectionSummaries = sectionEntries
    .map((entry) => ({
      id: entry.section.id,
      title: entry.section.title,
      total: entry.total,
      quantity: entry.quantity,
      itemCount: entry.items.length,
      unpricedItems: entry.items.filter((itemEntry) => itemEntry.pricingMode === 'unpriced').length,
      percentOfTotal: totalValue > 0 ? (entry.total / totalValue) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total);

  const topDrivers = [...items]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((entry) => ({
      description: entry.item.description,
      section: entry.sectionTitle,
      total: entry.total,
      percentOfTotal: totalValue > 0 ? (entry.total / totalValue) * 100 : 0
    }));

  const benchmarkDeltas = items
    .filter((entry) => !entry.item.useBenchmark && entry.benchmarkRate > 0 && entry.unitRate > 0)
    .map((entry) => ((entry.unitRate - entry.benchmarkRate) / entry.benchmarkRate) * 100);

  const averageBenchmarkDelta = benchmarkDeltas.length > 0
    ? benchmarkDeltas.reduce((sum, value) => sum + value, 0) / benchmarkDeltas.length
    : 0;

  const manualRatio = pricedItems > 0 ? manualItems / pricedItems : 0;
  const customRatio = pricedItems > 0 ? customItems / pricedItems : 0;
  const outlierRatio = pricedItems > 0 ? outlierCount / pricedItems : 0;
  const confidenceScore = Math.max(0, Math.min(100,
    40
    + (pricingCoveragePercent * 0.32)
    + (benchmarkCoveragePercent * 0.2)
    + (customRatio * 12)
    - (manualRatio * 18)
    - (outlierRatio * 28)
  ));

  const riskFlags = [];
  if (unpricedItems > 0) {
    riskFlags.push({
      level: 'high',
      message: `${unpricedItems} BOQ item${unpricedItems === 1 ? '' : 's'} still need a defendable rate before submission.`
    });
  }
  if (outlierCount > 0) {
    riskFlags.push({
      level: 'medium',
      message: `${outlierCount} priced item${outlierCount === 1 ? '' : 's'} sit outside the benchmark tolerance and should be reviewed.`
    });
  }
  if (sectionSummaries[0] && sectionSummaries[0].percentOfTotal >= 45) {
    riskFlags.push({
      level: 'medium',
      message: `${sectionSummaries[0].title} is carrying ${sectionSummaries[0].percentOfTotal.toFixed(1)}% of the contract value, so it deserves early commercial review.`
    });
  }
  if (benchmarkCoveragePercent < 50 && totalItems > 0) {
    riskFlags.push({
      level: 'low',
      message: `Only ${benchmarkCoveragePercent.toFixed(0)}% of items have benchmark references, so market alignment is still thin.`
    });
  }
  if (riskFlags.length === 0 && totalItems > 0) {
    riskFlags.push({
      level: 'low',
      message: 'Pricing coverage is strong and no major benchmark drift is showing on this project.'
    });
  }

  return {
    totalSections,
    totalItems,
    totalValue,
    totalQuantity,
    pricedItems,
    unpricedItems,
    benchmarkItems,
    customItems,
    calculatedItems,
    manualItems,
    benchmarkReferencedItems,
    pricingCoveragePercent,
    benchmarkCoveragePercent,
    outlierCount,
    confidenceScore,
    averageBenchmarkDelta,
    composition,
    compositionRows,
    sectionSummaries,
    topDrivers,
    riskFlags,
    dominantSection: sectionSummaries[0] || null
  };
};
