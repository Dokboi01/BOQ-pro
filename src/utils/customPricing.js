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

export const buildRateAnalysisBreakdownFromCustomPricing = (item, customPricing) => {
  const normalized = normalizeCustomPricingRecord(
    customPricing,
    inferCustomPricingWorkType(item?.description)
  );
  const workTypeLabel = WORK_TYPE_LABELS[normalized.workType] || 'Custom Pricing';
  const rowUnit = item?.unit || 'unit';

  return {
    analysisMode: 'custom-pricing-linked',
    materials: [{
      id: `cp-material-${item?.id || 'item'}`,
      name: `${workTypeLabel} material allowance`,
      qty: 1,
      unit: rowUnit,
      rate: normalized.materialsCost,
      waste: normalized.wastePercent,
    }],
    labor: [{
      id: `cp-labour-${item?.id || 'item'}`,
      name: `${workTypeLabel} labour allowance`,
      qty: 1,
      unit: 'Allowance',
      rate: normalized.labourCost,
      output: 1,
    }],
    plant: [{
      id: `cp-plant-${item?.id || 'item'}`,
      name: `${workTypeLabel} plant allowance`,
      qty: 1,
      unit: 'Allowance',
      rate: normalized.plantCost,
      output: 1,
    }],
    transport: [{
      id: `cp-transport-${item?.id || 'item'}`,
      name: `${workTypeLabel} transport allowance`,
      qty: 1,
      unit: 'Allowance',
      rate: normalized.transportCost,
    }],
    siteAdjustment: normalized.siteAdjustmentPercent,
    overheads: normalized.overheadsPercent,
    profit: normalized.profitPercent,
    pricingReference: normalized.pricingReference,
    supplierQuote: normalized.supplierQuote,
    notes: normalized.notes,
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
