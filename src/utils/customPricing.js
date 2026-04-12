import { getBreakdownForItem } from '../data/rateBreakdowns';
import { applyRegionCostProfileToBreakdown } from './pricing';

export const WORK_TYPE_LABELS = {
  general: 'General Building',
  concrete: 'Concrete',
  masonry: 'Masonry',
  plastering: 'Plastering',
  tiling: 'Tiling',
  painting: 'Painting',
  formwork: 'Formwork',
  reinforcement: 'Reinforcement',
  roofing: 'Roofing',
  pipework: 'Pipework',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  steelwork: 'Steelwork',
  roadwork: 'Roadwork',
  earthwork: 'Earthwork',
  entranceworks: 'Entrance / Gate Works',
};

export const WORK_TYPE_PROFILES = {
  concrete: { waste: 2.5, siteAdjustment: 3, overheads: 12, profit: 10, roundingStep: 100 },
  masonry: { waste: 3, siteAdjustment: 2, overheads: 12, profit: 12, roundingStep: 50 },
  plastering: { waste: 5, siteAdjustment: 2, overheads: 10, profit: 15, roundingStep: 50 },
  tiling: { waste: 7, siteAdjustment: 3, overheads: 10, profit: 15, roundingStep: 50 },
  painting: { waste: 3, siteAdjustment: 2, overheads: 10, profit: 15, roundingStep: 50 },
  formwork: { waste: 5, siteAdjustment: 3, overheads: 12, profit: 10, roundingStep: 100 },
  reinforcement: { waste: 5, siteAdjustment: 3, overheads: 12, profit: 10, roundingStep: 100 },
  roofing: { waste: 7, siteAdjustment: 4, overheads: 12, profit: 12, roundingStep: 100 },
  pipework: { waste: 4, siteAdjustment: 3, overheads: 12, profit: 12, roundingStep: 100 },
  plumbing: { waste: 4, siteAdjustment: 3, overheads: 10, profit: 12, roundingStep: 100 },
  electrical: { waste: 4, siteAdjustment: 2, overheads: 10, profit: 12, roundingStep: 100 },
  steelwork: { waste: 4, siteAdjustment: 4, overheads: 12, profit: 10, roundingStep: 100 },
  roadwork: { waste: 5, siteAdjustment: 5, overheads: 15, profit: 10, roundingStep: 100 },
  earthwork: { waste: 3, siteAdjustment: 5, overheads: 12, profit: 10, roundingStep: 100 },
  entranceworks: { waste: 4, siteAdjustment: 4, overheads: 12, profit: 12, roundingStep: 100 },
  general: { waste: 3, siteAdjustment: 3, overheads: 12, profit: 10, roundingStep: 100 },
};

export const clampPricingValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const inferCustomPricingWorkType = (description = '') => {
  const text = String(description).toLowerCase();
  if (/paint|emulsion|satin/.test(text)) return 'painting';
  if (/tile|terrazzo|granite tile|ceramic/.test(text)) return 'tiling';
  if (/plaster|render|screed/.test(text)) return 'plastering';
  if (/block|masonry|sandcrete|brick/.test(text)) return 'masonry';
  if (/formwork|shuttering|falsework/.test(text)) return 'formwork';
  if (/rebar|reinforcement|brc mesh|high yield/.test(text)) return 'reinforcement';
  if (/roof|sheet|truss|purlin/.test(text)) return 'roofing';
  if (/pipe|drain|culvert|sewer/.test(text)) return 'pipework';
  if (/plumb|sanitary|water supply/.test(text)) return 'plumbing';
  if (/electrical|cable|conduit|lighting/.test(text)) return 'electrical';
  if (/steel|fabricat|weld|portal frame|i-beam/.test(text)) return 'steelwork';
  if (/road|asphalt|kerb|paving/.test(text)) return 'roadwork';
  if (/excavat|backfill|earthwork/.test(text)) return 'earthwork';
  if (/backyard|gate|entrance|wicket|fence gate|service gate/.test(text)) return 'entranceworks';
  if (/concrete|slab|beam|column|foundation|pile|abutment/.test(text)) return 'concrete';
  return 'general';
};

export const normalizeCustomPricingRecord = (pricing = {}, fallbackWorkType = 'general') => {
  const workType = pricing.workType || fallbackWorkType || 'general';
  const profile = WORK_TYPE_PROFILES[workType] || WORK_TYPE_PROFILES.general;
  const normalized = {
    workType,
    materialsCost: clampPricingValue(pricing.materialsCost),
    labourCost: clampPricingValue(pricing.labourCost),
    plantCost: clampPricingValue(pricing.plantCost),
    transportCost: clampPricingValue(pricing.transportCost),
    wastePercent: clampPricingValue(pricing.wastePercent ?? profile.waste),
    siteAdjustmentPercent: clampPricingValue(pricing.siteAdjustmentPercent ?? profile.siteAdjustment),
    overheadsPercent: clampPricingValue(pricing.overheadsPercent ?? pricing.overheads ?? profile.overheads),
    profitPercent: clampPricingValue(pricing.profitPercent ?? pricing.profit ?? profile.profit),
    roundingStep: clampPricingValue(pricing.roundingStep ?? profile.roundingStep),
    pricingReference: pricing.pricingReference || '',
    supplierQuote: pricing.supplierQuote || '',
    notes: pricing.notes || '',
    materialsUsed: pricing.materialsUsed || '',
    labourUsed: pricing.labourUsed || '',
    plantUsed: pricing.plantUsed || '',
    transportUsed: pricing.transportUsed || '',
    otherAllowances: pricing.otherAllowances || '',
    benchmarkRate: clampPricingValue(pricing.benchmarkRate),
    pricingMode: pricing.pricingMode || null,
    region: pricing.region || null,
    savedAt: pricing.savedAt || null,
  };

  const summary = buildCustomPricingSummary(normalized);
  return {
    ...normalized,
    rawRate: pricing.rawRate ?? summary.rawRate,
    finalRate: pricing.finalRate ?? summary.finalRate,
  };
};

export const buildCustomPricingSummary = (pricing = {}) => {
  const materialBase = clampPricingValue(pricing.materialsCost);
  const labourBase = clampPricingValue(pricing.labourCost);
  const plantBase = clampPricingValue(pricing.plantCost);
  const transportBase = clampPricingValue(pricing.transportCost);
  const directCost = materialBase + labourBase + plantBase + transportBase;
  const wasteValue = materialBase * (clampPricingValue(pricing.wastePercent) / 100);
  const siteValue = (directCost + wasteValue) * (clampPricingValue(pricing.siteAdjustmentPercent) / 100);
  const subtotalBeforeOverheads = directCost + wasteValue + siteValue;
  const overheadValue = subtotalBeforeOverheads * (clampPricingValue(pricing.overheadsPercent) / 100);
  const subtotalBeforeProfit = subtotalBeforeOverheads + overheadValue;
  const profitValue = subtotalBeforeProfit * (clampPricingValue(pricing.profitPercent) / 100);
  const rawRate = subtotalBeforeProfit + profitValue;
  const roundingStep = Math.max(clampPricingValue(pricing.roundingStep), 0);
  const finalRate = roundingStep > 0 ? Math.ceil(rawRate / roundingStep) * roundingStep : rawRate;

  return {
    directCost,
    wasteValue,
    siteValue,
    overheadValue,
    profitValue,
    rawRate,
    finalRate,
  };
};

const getRateAnalysisLineTotal = (category, row) => {
  const qty = clampPricingValue(row?.qty);
  const rate = clampPricingValue(row?.rate);
  if (category === 'materials') {
    return qty * rate;
  }
  if (category === 'labor' || category === 'plant') {
    return (qty * rate) / Math.max(clampPricingValue(row?.output) || 1, 0.001);
  }
  return qty * rate;
};

const splitCustomPricingEntries = (value) => String(value || '')
  .split(/\r?\n|;|,/)
  .map((entry) => entry.trim())
  .filter(Boolean);

const buildDescriptionSummary = (item, fallbackLabel = 'Item') => {
  const cleaned = String(item?.description || fallbackLabel)
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return fallbackLabel;
  return cleaned.length > 64 ? `${cleaned.slice(0, 61).trim()}...` : cleaned;
};

const buildContextualFallbackLabel = (item, category, workTypeLabel = 'Custom Pricing') => {
  const descriptionLabel = buildDescriptionSummary(item, workTypeLabel);

  if (category === 'materials') return `${descriptionLabel} materials`;
  if (category === 'labor') return `${descriptionLabel} labour`;
  if (category === 'plant') return `${descriptionLabel} plant / equipment`;
  return `${descriptionLabel} delivery / logistics`;
};

const getTemplateCategoryRows = (item = {}, category, options = {}) => {
  const canReuseExistingBreakdown = item?.breakdown
    && item.breakdown.analysisMode !== 'custom-pricing-linked'
    && (
    (item.breakdown.materials || []).length
    || (item.breakdown.labor || []).length
    || (item.breakdown.plant || []).length
    || (item.breakdown.transport || []).length
  )
  ;

  const existingBreakdown = canReuseExistingBreakdown
    ? item.breakdown
    : getBreakdownForItem(item?.description, options.structureType || item?.structureType);

  const regionalized = applyRegionCostProfileToBreakdown({
    ...existingBreakdown,
    transport: existingBreakdown?.transport || [],
  }, options.region || item?.region || 'Lagos', item);

  return regionalized?.[category] || [];
};

const buildNamedListFromRows = (rows = []) => {
  const names = rows
    .map((row) => String(row?.name || '').trim())
    .filter(Boolean);

  return [...new Set(names)].join('\n');
};

const joinCustomPricingEntries = (rows = [], fallbackLabel = '') => {
  const names = rows
    .map((row) => String(row?.name || '').trim())
    .filter(Boolean);

  const uniqueNames = [...new Set(names)];
  if (uniqueNames.length === 0) return fallbackLabel;
  return uniqueNames.join('\n');
};

const buildRowsFromTemplate = ({ category, item, totalCost, templateRows = [], wastePercent = 0 }) => {
  const normalizedCategory = category === 'labor' ? 'labor' : category;
  const templateTotal = templateRows.reduce(
    (sum, row) => sum + getRateAnalysisLineTotal(normalizedCategory, row),
    0
  );
  const scale = templateTotal > 0 ? totalCost / templateTotal : 0;

  return templateRows.map((row, index) => ({
    ...row,
    id: `cp-${category}-${item?.id || 'item'}-${index}`,
    rate: clampPricingValue(row?.rate) * scale,
    waste: category === 'materials'
      ? clampPricingValue(row?.waste ?? wastePercent)
      : row?.waste,
    output: category === 'labor' || category === 'plant'
      ? Math.max(clampPricingValue(row?.output) || 1, 0.001)
      : row?.output,
  }));
};

const buildAllowanceRows = ({
  category,
  item,
  totalCost,
  listText,
  fallbackLabel,
  unit,
  wastePercent = 0,
  templateRows = [],
}) => {
  const names = splitCustomPricingEntries(listText);

  if (names.length === 0 && templateRows.length > 0) {
    return buildRowsFromTemplate({
      category,
      item,
      totalCost,
      templateRows,
      wastePercent,
    });
  }

  const entryNames = names.length > 0 ? names : [fallbackLabel];
  const evenRate = entryNames.length > 0 ? totalCost / entryNames.length : totalCost;

  return entryNames.map((name, index) => {
    const baseRow = {
      id: `cp-${category}-${item?.id || 'item'}-${index}`,
      name,
      qty: 1,
      unit,
      rate: evenRate,
    };

    if (category === 'materials') {
      return {
        ...baseRow,
        waste: wastePercent,
      };
    }

    if (category === 'labor' || category === 'plant') {
      return {
        ...baseRow,
        output: 1,
      };
    }

    return baseRow;
  });
};

export const buildSuggestedCustomPricingLists = (item = {}, options = {}) => ({
  materialsUsed: buildNamedListFromRows(getTemplateCategoryRows(item, 'materials', options)),
  labourUsed: buildNamedListFromRows(getTemplateCategoryRows(item, 'labor', options)),
  plantUsed: buildNamedListFromRows(getTemplateCategoryRows(item, 'plant', options)),
  transportUsed: buildNamedListFromRows(getTemplateCategoryRows(item, 'transport', options)),
});

export const buildRateAnalysisBreakdownFromCustomPricing = (item, customPricing, options = {}) => {
  const normalized = normalizeCustomPricingRecord(
    customPricing,
    inferCustomPricingWorkType(item?.description)
  );
  const workTypeLabel = WORK_TYPE_LABELS[normalized.workType] || 'Custom Pricing';
  const rowUnit = item?.unit || 'unit';
  const contextualLabels = {
    materials: buildContextualFallbackLabel(item, 'materials', workTypeLabel),
    labor: buildContextualFallbackLabel(item, 'labor', workTypeLabel),
    plant: buildContextualFallbackLabel(item, 'plant', workTypeLabel),
    transport: buildContextualFallbackLabel(item, 'transport', workTypeLabel),
  };
  const templateRows = {
    materials: getTemplateCategoryRows(item, 'materials', options),
    labor: getTemplateCategoryRows(item, 'labor', options),
    plant: getTemplateCategoryRows(item, 'plant', options),
    transport: getTemplateCategoryRows(item, 'transport', options),
  };

  return {
    analysisMode: 'custom-pricing-linked',
    materials: buildAllowanceRows({
      category: 'materials',
      item,
      totalCost: normalized.materialsCost,
      listText: normalized.materialsUsed,
      fallbackLabel: contextualLabels.materials,
      unit: rowUnit,
      wastePercent: normalized.wastePercent,
      templateRows: templateRows.materials,
    }),
    labor: buildAllowanceRows({
      category: 'labor',
      item,
      totalCost: normalized.labourCost,
      listText: normalized.labourUsed,
      fallbackLabel: contextualLabels.labor,
      unit: 'Allowance',
      templateRows: templateRows.labor,
    }),
    plant: buildAllowanceRows({
      category: 'plant',
      item,
      totalCost: normalized.plantCost,
      listText: normalized.plantUsed,
      fallbackLabel: contextualLabels.plant,
      unit: 'Allowance',
      templateRows: templateRows.plant,
    }),
    transport: buildAllowanceRows({
      category: 'transport',
      item,
      totalCost: normalized.transportCost,
      listText: normalized.transportUsed,
      fallbackLabel: contextualLabels.transport,
      unit: 'Allowance',
      templateRows: templateRows.transport,
    }),
    siteAdjustment: normalized.siteAdjustmentPercent,
    overheads: normalized.overheadsPercent,
    profit: normalized.profitPercent,
    pricingReference: normalized.pricingReference,
    supplierQuote: normalized.supplierQuote,
    notes: normalized.notes,
    otherAllowances: normalized.otherAllowances,
    linkedCustomPricing: normalized,
  };
};

export const buildCustomPricingFromRateAnalysis = (item, breakdown = {}, fallbackCustomPricing = null) => {
  const fallbackWorkType = fallbackCustomPricing?.workType || inferCustomPricingWorkType(item?.description);
  const materialBase = (breakdown.materials || []).reduce((sum, row) => sum + getRateAnalysisLineTotal('materials', row), 0);
  const materialWaste = (breakdown.materials || []).reduce((sum, row) => {
    const rowBase = clampPricingValue(row?.qty) * clampPricingValue(row?.rate);
    return sum + (rowBase * (clampPricingValue(row?.waste) / 100));
  }, 0);

  const normalized = normalizeCustomPricingRecord({
    workType: breakdown?.linkedCustomPricing?.workType || fallbackWorkType,
    materialsCost: materialBase,
    labourCost: (breakdown.labor || []).reduce((sum, row) => sum + getRateAnalysisLineTotal('labor', row), 0),
    plantCost: (breakdown.plant || []).reduce((sum, row) => sum + getRateAnalysisLineTotal('plant', row), 0),
    transportCost: (breakdown.transport || []).reduce((sum, row) => sum + getRateAnalysisLineTotal('transport', row), 0),
    wastePercent: materialBase > 0
      ? (materialWaste / materialBase) * 100
      : fallbackCustomPricing?.wastePercent,
    siteAdjustmentPercent: breakdown.siteAdjustment ?? fallbackCustomPricing?.siteAdjustmentPercent,
    overheadsPercent: breakdown.overheads ?? fallbackCustomPricing?.overheadsPercent,
    profitPercent: breakdown.profit ?? fallbackCustomPricing?.profitPercent,
    roundingStep: fallbackCustomPricing?.roundingStep,
    pricingReference: breakdown.pricingReference || fallbackCustomPricing?.pricingReference,
    supplierQuote: breakdown.supplierQuote || fallbackCustomPricing?.supplierQuote,
    notes: breakdown.notes || fallbackCustomPricing?.notes,
    materialsUsed: joinCustomPricingEntries(
      breakdown.materials,
      fallbackCustomPricing?.materialsUsed || ''
    ),
    labourUsed: joinCustomPricingEntries(
      breakdown.labor,
      fallbackCustomPricing?.labourUsed || ''
    ),
    plantUsed: joinCustomPricingEntries(
      breakdown.plant,
      fallbackCustomPricing?.plantUsed || ''
    ),
    transportUsed: joinCustomPricingEntries(
      breakdown.transport,
      fallbackCustomPricing?.transportUsed || ''
    ),
    otherAllowances: breakdown.otherAllowances || fallbackCustomPricing?.otherAllowances || '',
    benchmarkRate: fallbackCustomPricing?.benchmarkRate,
    pricingMode: fallbackCustomPricing?.pricingMode || 'custom-rate-analysis',
    region: fallbackCustomPricing?.region || null,
    savedAt: fallbackCustomPricing?.savedAt || null,
  }, fallbackWorkType);

  const summary = buildCustomPricingSummary(normalized);
  return {
    ...normalized,
    rawRate: summary.rawRate,
    finalRate: summary.finalRate,
  };
};

export const getCustomPricingDescriptor = (customPricing) => {
  if (!customPricing) return '';

  const segments = [];
  const workTypeLabel = WORK_TYPE_LABELS[customPricing.workType];
  if (workTypeLabel) {
    segments.push(workTypeLabel);
  }
  if (customPricing.pricingReference) {
    segments.push(customPricing.pricingReference);
  }
  if (customPricing.supplierQuote) {
    segments.push(customPricing.supplierQuote);
  }

  return segments.join(' • ');
};
