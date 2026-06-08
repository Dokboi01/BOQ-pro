import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  SlidersHorizontal,
  Package,
  HardHat,
  Wrench,
  Truck,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  Zap
} from 'lucide-react';
import { getRegionalModifier, generateAIRateBreakdown } from '../../utils/aiService';
import {
  buildSuggestedCustomPricingLists,
  buildSuggestedCustomPricingMix
} from '../../utils/customPricing';

const MONEY = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 2 });
const PERCENT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const WORK_TYPE_PROFILES = {
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

const QUICK_PRESETS = {
  backyardEntrance: {
    key: 'backyardEntrance',
    label: 'Backyard Entrance',
    copy: 'Load a ready-made custom build-up for a typical service gate or rear access entrance.',
    workType: 'entranceworks',
    fallbackReferenceRate: 185000,
    pricingReference: 'Backyard entrance preset',
    supplierQuote: 'Gate frame, fittings and installation allowance',
    notes: 'Allow for framed metal backyard entrance gate, hinges, latch set, holdfasts, fixing, touch-up painting, and minor concrete or blockwork to make good.'
  },
  concreteWork: {
    key: 'concreteWork',
    label: 'Reinforced Concrete',
    copy: 'Use a concrete-heavy build-up with labour, plant, transport, and commercial allowances suited to structural concrete work.',
    workType: 'concrete',
    fallbackReferenceRate: 75000,
    pricingReference: 'Concrete works preset',
    supplierQuote: 'Batching, placing and compaction allowance',
    notes: 'Allow for production, placement, vibration, curing, and incidental waste for reinforced concrete work.'
  },
  blockwork: {
    key: 'blockwork',
    label: 'Sandcrete Blockwork',
    copy: 'Set up a masonry-oriented pricing profile for walls, partitions, and block-based enclosures.',
    workType: 'masonry',
    fallbackReferenceRate: 18000,
    pricingReference: 'Blockwork preset',
    supplierQuote: 'Blocks, mortar materials and masonry labour allowance',
    notes: 'Allow for laying, jointing, line and level control, mortar waste, and making good around openings.'
  },
  roofing: {
    key: 'roofing',
    label: 'Roof Covering',
    copy: 'Start from a roof-focused mix with material-heavy pricing, access allowances, and weather exposure risk.',
    workType: 'roofing',
    fallbackReferenceRate: 28500,
    pricingReference: 'Roofing preset',
    supplierQuote: 'Roofing sheets, accessories and fixing labour allowance',
    notes: 'Allow for roof sheets, ridges, flashings, fasteners, laps, wastage, access scaffolds, and touch-up work.'
  },
  painting: {
    key: 'painting',
    label: 'Painting Finish',
    copy: 'Load a labour-sensitive pricing mix for interior or exterior painting and decorative finish work.',
    workType: 'painting',
    fallbackReferenceRate: 6500,
    pricingReference: 'Painting preset',
    supplierQuote: 'Paint system and surface preparation allowance',
    notes: 'Allow for surface prep, primer, finish coats, masking, touch-ups, and normal access requirements.'
  }
};

const WORK_TYPE_OPTIONS = [
  { value: 'general', label: 'General Building', helper: 'Balanced fallback for mixed building work and uncertain scope.' },
  { value: 'concrete', label: 'Concrete', helper: 'Structural or plain concrete work with batching, placing, and curing costs.' },
  { value: 'masonry', label: 'Masonry', helper: 'Block, brick, or stone walling and similar laid units.' },
  { value: 'plastering', label: 'Plastering / Rendering', helper: 'Cement-sand rendering, screeds, and other wet finishes.' },
  { value: 'tiling', label: 'Tiling', helper: 'Floor or wall tiles with adhesive, grout, and cutting waste.' },
  { value: 'painting', label: 'Painting', helper: 'Primer, finish coats, prep, and labour-led finishing work.' },
  { value: 'formwork', label: 'Formwork', helper: 'Temporary works, shuttering, and repeated carpentry systems.' },
  { value: 'reinforcement', label: 'Reinforcement', helper: 'Steel bar fixing, cutting, bending, and tying work.' },
  { value: 'roofing', label: 'Roofing', helper: 'Roof sheets, accessories, lifting, and access-related allowances.' },
  { value: 'pipework', label: 'Pipework', helper: 'External pipe runs, drainage, and buried service pipe installations.' },
  { value: 'plumbing', label: 'Plumbing', helper: 'Sanitary and water-service installations within buildings.' },
  { value: 'electrical', label: 'Electrical', helper: 'Cabling, conduits, fittings, and electrical installation work.' },
  { value: 'steelwork', label: 'Steelwork', helper: 'Fabrication, welding, erection, and protective finishing.' },
  { value: 'roadwork', label: 'Roadwork', helper: 'Road construction, paving, kerbs, and surfacing operations.' },
  { value: 'earthwork', label: 'Earthwork', helper: 'Excavation, filling, cart-away, and heavy plant-led operations.' },
  { value: 'entranceworks', label: 'Entrance / Gate Works', helper: 'Metal gates, access points, fittings, and making-good items.' }
];

const clamp = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value) => `NGN ${MONEY.format(clamp(value))}`;

const getWorkTypeMeta = (workType) => {
  return WORK_TYPE_OPTIONS.find((option) => option.value === workType)
    || WORK_TYPE_OPTIONS[0];
};

const inferWorkType = (description = '') => {
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

const getLineTotal = (category, row) => {
  if (category === 'materials') {
    return clamp(row.qty) * clamp(row.rate);
  }
  if (category === 'labour' || category === 'plant') {
    return (clamp(row.qty) * clamp(row.rate)) / Math.max(clamp(row.output) || 1, 0.001);
  }
  return clamp(row.qty) * clamp(row.rate);
};

const buildSummary = (pricing) => {
  const materialBase = clamp(pricing.materialsCost);
  const labourBase = clamp(pricing.labourCost);
  const plantBase = clamp(pricing.plantCost);
  const transportBase = clamp(pricing.transportCost);
  const directCost = materialBase + labourBase + plantBase + transportBase;
  const wasteValue = materialBase * (clamp(pricing.wastePercent) / 100);
  const siteValue = (directCost + wasteValue) * (clamp(pricing.siteAdjustmentPercent) / 100);
  const subtotalBeforeOverheads = directCost + wasteValue + siteValue;
  const overheadValue = subtotalBeforeOverheads * (clamp(pricing.overheadsPercent) / 100);
  const subtotalBeforeProfit = subtotalBeforeOverheads + overheadValue;
  const profitValue = subtotalBeforeProfit * (clamp(pricing.profitPercent) / 100);
  const rawRate = subtotalBeforeProfit + profitValue;
  const roundingStep = Math.max(clamp(pricing.roundingStep), 0);
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

const scaleSeedToReference = (seeded, referenceRate) => {
  if (!referenceRate) {
    return seeded;
  }

  let nextSeed = seeded;
  for (let idx = 0; idx < 6; idx += 1) {
    const current = buildSummary(nextSeed).finalRate || 1;
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

const seedFromReference = (referenceRate, profile, sharesOverride = null) => {
  const shares = sharesOverride || profile.shares;
  const defaults = {
    workType: 'general',
    wastePercent: profile.waste,
    siteAdjustmentPercent: profile.siteAdjustment,
    overheadsPercent: profile.overheads,
    profitPercent: profile.profit,
    roundingStep: profile.roundingStep,
    pricingReference: '',
    supplierQuote: '',
    notes: '',
    materialsUsed: '',
    labourUsed: '',
    plantUsed: '',
    transportUsed: '',
    otherAllowances: ''
  };

  const baseDirect = Math.max(referenceRate * 0.78, 0);
  let seeded = {
    ...defaults,
      materialsCost: baseDirect * (shares.materials ?? profile.shares.materials),
      labourCost: baseDirect * (shares.labour ?? profile.shares.labour),
      plantCost: baseDirect * (shares.plant ?? profile.shares.plant),
      transportCost: baseDirect * (shares.transport ?? profile.shares.transport)
  };

  return scaleSeedToReference(seeded, referenceRate);
};

const seedFromBreakdown = (item, profile) => {
  const breakdown = item?.breakdown || {};
  const materialRows = breakdown.materials || [];

  const materialBase = materialRows.reduce((sum, row) => sum + getLineTotal('materials', row), 0);
  const wastePercent = materialRows.length > 0
    ? materialRows.reduce((sum, row) => sum + clamp(row.waste), 0) / materialRows.length
    : profile.waste;

  return {
    workType: inferWorkType(item?.description),
    materialsCost: materialBase,
    labourCost: (breakdown.labor || []).reduce((sum, row) => sum + getLineTotal('labour', row), 0),
    plantCost: (breakdown.plant || []).reduce((sum, row) => sum + getLineTotal('plant', row), 0),
    transportCost: (breakdown.transport || []).reduce((sum, row) => sum + getLineTotal('transport', row), 0),
    wastePercent,
    siteAdjustmentPercent: profile.siteAdjustment,
    overheadsPercent: breakdown.overheads ?? profile.overheads,
    profitPercent: breakdown.profit ?? profile.profit,
    roundingStep: profile.roundingStep,
    pricingReference: 'Imported from detailed rate build-up',
    supplierQuote: '',
    notes: '',
    materialsUsed: '',
    labourUsed: '',
    plantUsed: '',
    transportUsed: '',
    otherAllowances: ''
  };
};

const seedFromPreset = (preset, referenceRate = 0) => {
  const profile = WORK_TYPE_PROFILES[preset.workType] || WORK_TYPE_PROFILES.general;
  const effectiveReference = referenceRate || preset.fallbackReferenceRate || 0;

  const seeded = seedFromReference(effectiveReference, profile);
  return {
    ...seeded,
    workType: preset.workType,
    pricingReference: preset.pricingReference,
    supplierQuote: preset.supplierQuote,
    notes: preset.notes
  };
};

const normalizeSavedPricing = (pricing, profile, suggestedLists = {}) => ({
  workType: pricing.workType || 'general',
  materialsCost: clamp(pricing.materialsCost),
  labourCost: clamp(pricing.labourCost),
  plantCost: clamp(pricing.plantCost),
  transportCost: clamp(pricing.transportCost),
  wastePercent: clamp(pricing.wastePercent ?? profile.waste),
  siteAdjustmentPercent: clamp(pricing.siteAdjustmentPercent ?? profile.siteAdjustment),
  overheadsPercent: clamp(pricing.overheadsPercent ?? profile.overheads),
  profitPercent: clamp(pricing.profitPercent ?? profile.profit),
  roundingStep: clamp(pricing.roundingStep ?? profile.roundingStep),
  pricingReference: pricing.pricingReference || '',
  supplierQuote: pricing.supplierQuote || '',
  notes: pricing.notes || '',
  materialsUsed: pricing.materialsUsed || suggestedLists.materialsUsed || '',
  labourUsed: pricing.labourUsed || suggestedLists.labourUsed || '',
  plantUsed: pricing.plantUsed || suggestedLists.plantUsed || '',
  transportUsed: pricing.transportUsed || suggestedLists.transportUsed || '',
  otherAllowances: pricing.otherAllowances || ''
});

const buildSeedState = (item, region, structureType) => {
  const workType = item?.customPricing?.workType || inferWorkType(item?.description);
  const profile = WORK_TYPE_PROFILES[workType] || WORK_TYPE_PROFILES.general;
  const benchmarkRate = clamp(item?.benchmark) * getRegionalModifier(region);
  const currentRate = !item?.useBenchmark ? clamp(item?.rate) : benchmarkRate;
  const referenceRate = currentRate || benchmarkRate || 0;
  const suggestedLists = buildSuggestedCustomPricingLists(item, { region, structureType });
  const suggestedMix = buildSuggestedCustomPricingMix(item, { region, structureType, workType });
  const directMixTotal = suggestedMix.directCost;
  const suggestedShares = directMixTotal > 0
    ? {
        materials: suggestedMix.materials / directMixTotal,
        labour: suggestedMix.labour / directMixTotal,
        plant: suggestedMix.plant / directMixTotal,
        transport: suggestedMix.transport / directMixTotal
      }
    : null;

  if (item?.customPricing) {
    return {
      workType,
      benchmarkRate,
      pricing: normalizeSavedPricing(item.customPricing, profile, suggestedLists)
    };
  }

  if (item?.breakdown) {
    return {
      workType,
      benchmarkRate,
      pricing: {
        ...seedFromBreakdown(item, profile),
        ...suggestedLists
      }
    };
  }

  return {
    workType,
    benchmarkRate,
    pricing: {
      ...seedFromReference(referenceRate, profile, suggestedShares),
      ...suggestedLists
    }
  };
};

const CustomPricingModal = ({ item, region, structureType, onClose, onSave, onOpenDetailedAnalysis }) => {
  const seeded = useMemo(() => buildSeedState(item, region, structureType), [item, region, structureType]);
  const [pricing, setPricing] = useState(seeded.pricing);
  const [isBuildingRate, setIsBuildingRate] = useState(false);
  const [aiBuildUpError, setAiBuildUpError] = useState(null);
  const [customConstraints, setCustomConstraints] = useState('');
  const modalRef = React.useRef(null);

  React.useEffect(() => {
    setPricing(seeded.pricing);
  }, [seeded]);

  const handleAIBuildUp = async () => {
    setIsBuildingRate(true);
    setAiBuildUpError(null);
    try {
      const result = await generateAIRateBreakdown(item, { region, customConstraints });
      if (result && typeof result === 'object') {
        const materialRows = result.materials || [];
        const materialBase = materialRows.reduce((sum, row) => sum + (Number(row.qty ?? 0) * Number(row.rate ?? 0)), 0);
        
        // Calculate average waste percent or fallback
        const wastePercent = materialRows.length > 0
          ? materialRows.reduce((sum, row) => sum + Number(row.waste ?? 0), 0) / materialRows.length
          : pricing.wastePercent;
          
        const labourBase = (result.labor || []).reduce((sum, row) => {
          return sum + ((Number(row.qty ?? 0) * Number(row.rate ?? 0)) / Math.max(Number(row.output ?? 1), 0.001));
        }, 0);
        
        const plantBase = (result.plant || []).reduce((sum, row) => {
          return sum + ((Number(row.qty ?? 0) * Number(row.rate ?? 0)) / Math.max(Number(row.output ?? 1), 0.001));
        }, 0);
        
        const transportBase = (result.transport || []).reduce((sum, row) => {
          return sum + (Number(row.qty ?? 0) * Number(row.rate ?? 0));
        }, 0);
        
        // Build names for records
        const materialsUsed = (result.materials || []).map(m => `${m.name} (${m.qty} ${m.unit})`).join(', ');
        const labourUsed = (result.labor || []).map(l => `${l.name} (Crew: ${l.qty}, Out: ${l.output})`).join(', ');
        const plantUsed = (result.plant || []).map(p => `${p.name} (Qty: ${p.qty}, Out: ${p.output})`).join(', ');
        const transportUsed = (result.transport || []).map(t => `${t.name}`).join(', ');

        setPricing((prev) => ({
          ...prev,
          materialsCost: materialBase,
          labourCost: labourBase,
          plantCost: plantBase,
          transportCost: transportBase,
          wastePercent: wastePercent,
          siteAdjustmentPercent: result.siteAdjustment ?? prev.siteAdjustmentPercent ?? 0,
          overheadsPercent: result.overheads ?? result.overhead ?? 15,
          profitPercent: result.profit ?? 10,
          materialsUsed: materialsUsed.slice(0, 500),
          labourUsed: labourUsed.slice(0, 500),
          plantUsed: plantUsed.slice(0, 500),
          transportUsed: transportUsed.slice(0, 500),
          pricingReference: 'AI First-Principles Build-Up',
          notes: `Generated by AI for region ${region}. Item: ${item?.description || ''}`
        }));
      } else {
        throw new Error('Invalid breakdown format received from AI.');
      }
    } catch (err) {
      console.error('[CustomPricing] AI build-up failed:', err);
      setAiBuildUpError(err.message || 'AI Build-Up failed. Please try again.');
    } finally {
      setIsBuildingRate(false);
    }
  };

  React.useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const frameId = window.requestAnimationFrame(() => {
      if (modalRef.current) {
        modalRef.current.scrollTop = 0;
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const quantity = Math.max(clamp(item?.qty), 0);
  const activeWorkType = pricing.workType || seeded.workType;
  const activeWorkTypeMeta = getWorkTypeMeta(activeWorkType);
  const currentRate = item?.useBenchmark ? seeded.benchmarkRate : clamp(item?.rate);
  const summary = useMemo(() => buildSummary(pricing), [pricing]);
  const totalAmount = summary.finalRate * quantity;
  const benchmarkDelta = seeded.benchmarkRate > 0 ? summary.finalRate - seeded.benchmarkRate : 0;
  const benchmarkDeltaPercent = seeded.benchmarkRate > 0
    ? (benchmarkDelta / seeded.benchmarkRate) * 100
    : null;

  const varianceTone = benchmarkDeltaPercent == null
    ? 'neutral'
    : Math.abs(benchmarkDeltaPercent) <= 8
      ? 'aligned'
      : benchmarkDeltaPercent > 0
        ? 'high'
        : 'low';
  const directMix = useMemo(() => {
    const rows = [
      { key: 'materials', label: 'Materials', unitValue: clamp(pricing.materialsCost) },
      { key: 'labour', label: 'Labour', unitValue: clamp(pricing.labourCost) },
      { key: 'plant', label: 'Plant', unitValue: clamp(pricing.plantCost) },
      { key: 'transport', label: 'Transport', unitValue: clamp(pricing.transportCost) }
    ];

    return rows.map((row) => ({
      ...row,
      percentOfDirect: summary.directCost > 0 ? (row.unitValue / summary.directCost) * 100 : 0,
      totalValue: row.unitValue * quantity
    }));
  }, [pricing, quantity, summary.directCost]);

  const updateNumber = (field, value) => {
    setPricing((prev) => ({ ...prev, [field]: value }));
  };

  const updateText = (field, value) => {
    setPricing((prev) => ({ ...prev, [field]: value }));
  };

  const applyWorkTypeDefaults = (nextWorkType) => {
    const profile = WORK_TYPE_PROFILES[nextWorkType] || WORK_TYPE_PROFILES.general;
    setPricing((prev) => ({
      ...prev,
      workType: nextWorkType,
      wastePercent: profile.waste,
      siteAdjustmentPercent: profile.siteAdjustment,
      overheadsPercent: profile.overheads,
      profitPercent: profile.profit,
      roundingStep: profile.roundingStep
    }));
  };

  const resetToReference = () => {
    const profile = WORK_TYPE_PROFILES[activeWorkType] || WORK_TYPE_PROFILES.general;
    const referenceRate = currentRate || seeded.benchmarkRate || 0;
    const suggestedMix = buildSuggestedCustomPricingMix(item, { region, structureType, workType: activeWorkType });
    const directMixTotal = suggestedMix.directCost;
    const suggestedShares = directMixTotal > 0
      ? {
          materials: suggestedMix.materials / directMixTotal,
          labour: suggestedMix.labour / directMixTotal,
          plant: suggestedMix.plant / directMixTotal,
          transport: suggestedMix.transport / directMixTotal
        }
      : null;
    setPricing({
      ...seedFromReference(referenceRate, profile, suggestedShares),
      workType: activeWorkType
    });
  };

  const importFromBreakdown = () => {
    const profile = WORK_TYPE_PROFILES[activeWorkType] || WORK_TYPE_PROFILES.general;
    setPricing({
      ...seedFromBreakdown(item, profile),
      workType: activeWorkType
    });
  };

  const applyPreset = (preset) => {
    const referenceRate = currentRate || seeded.benchmarkRate || 0;
    setPricing(seedFromPreset(preset, referenceRate));
  };

  const modalContent = (
    <div className="custom-pricing-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="custom-pricing-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="custom-pricing-header">
          <div>
            <div className="custom-pricing-badge">Custom Pricing Studio</div>
            <h3>{item.description}</h3>
            <p>
              Build a company-ready custom rate for {quantity.toLocaleString()} {item.unit}.
            </p>
          </div>
          <button className="custom-pricing-close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="custom-pricing-toolbar">
          <span className="custom-chip">
            <ShieldCheck size={14} />
            Work type: {activeWorkTypeMeta.label}
          </span>
          <span className="custom-chip">
            <FileText size={14} />
            Current rate: {formatMoney(currentRate)} / {item.unit}
          </span>
          <span className="custom-chip">
            <TrendingUp size={14} />
            Benchmark: {seeded.benchmarkRate ? `${formatMoney(seeded.benchmarkRate)} / ${item.unit}` : 'Not available yet'}
          </span>
        </div>

        <div className="custom-pricing-content">
          <section className="custom-pricing-form">
            <div className="custom-section-card preset-card">
              <div className="custom-section-head">
                <div>
                  <span className="section-kicker">Preset</span>
                  <h4>Quick Start</h4>
                </div>
                <FileText size={18} />
              </div>
              <div className="preset-grid">
                {Object.values(QUICK_PRESETS).map((preset) => (
                  <button key={preset.key} className="preset-btn" onClick={() => applyPreset(preset)}>
                    <span className="preset-label">{preset.label}</span>
                    <span className="preset-copy">{preset.copy}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="custom-section-card">
              <div className="custom-section-head">
                <div>
                  <span className="section-kicker">Step 1</span>
                  <h4>Work Type & Pricing Basis</h4>
                </div>
                <ShieldCheck size={18} />
              </div>
              <div className="custom-grid">
                <label className="custom-field custom-field-full">
                  <span>Pricing profile</span>
                  <select
                    className="custom-select"
                    value={activeWorkType}
                    onChange={(event) => applyWorkTypeDefaults(event.target.value)}
                  >
                    {WORK_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="profile-helper-card">
                  <strong>{activeWorkTypeMeta.label}</strong>
                  <p>{activeWorkTypeMeta.helper}</p>
                  <button className="profile-helper-btn" onClick={() => applyWorkTypeDefaults(activeWorkType)}>
                    Apply recommended percentages for this work type
                  </button>
                </div>
              </div>
            </div>

            <div className="custom-section-card">
              <div className="custom-section-head">
                <div>
                  <span className="section-kicker">Step 2</span>
                  <h4>Direct Cost Build</h4>
                </div>
                <SlidersHorizontal size={18} />
              </div>
              <div className="custom-grid two-up">
                <label className="custom-field">
                  <span><Package size={14} /> Materials per {item.unit}</span>
                  <input type="number" value={pricing.materialsCost ?? ''} onChange={(event) => updateNumber('materialsCost', event.target.value)} />
                </label>
                <label className="custom-field">
                  <span><HardHat size={14} /> Labour per {item.unit}</span>
                  <input type="number" value={pricing.labourCost ?? ''} onChange={(event) => updateNumber('labourCost', event.target.value)} />
                </label>
                <label className="custom-field">
                  <span><Wrench size={14} /> Plant per {item.unit}</span>
                  <input type="number" value={pricing.plantCost ?? ''} onChange={(event) => updateNumber('plantCost', event.target.value)} />
                </label>
                <label className="custom-field">
                  <span><Truck size={14} /> Transport per {item.unit}</span>
                  <input type="number" value={pricing.transportCost ?? ''} onChange={(event) => updateNumber('transportCost', event.target.value)} />
                </label>
              </div>
              <div className="custom-grid two-up detail-list-grid">
                <label className="custom-field">
                  <span>Materials used</span>
                  <textarea
                    value={pricing.materialsUsed || ''}
                    onChange={(event) => updateText('materialsUsed', event.target.value)}
                    rows={4}
                    placeholder={`Cement\nSharp sand\n12mm bars`}
                  />
                </label>
                <label className="custom-field">
                  <span>Labour used</span>
                  <textarea
                    value={pricing.labourUsed || ''}
                    onChange={(event) => updateText('labourUsed', event.target.value)}
                    rows={4}
                    placeholder={`Mason\nForeman\nLabourers`}
                  />
                </label>
                <label className="custom-field">
                  <span>Plant / equipment used</span>
                  <textarea
                    value={pricing.plantUsed || ''}
                    onChange={(event) => updateText('plantUsed', event.target.value)}
                    rows={4}
                    placeholder={`Concrete mixer\nPoker vibrator\nCutting machine`}
                  />
                </label>
                <label className="custom-field">
                  <span>Transport / logistics used</span>
                  <textarea
                    value={pricing.transportUsed || ''}
                    onChange={(event) => updateText('transportUsed', event.target.value)}
                    rows={4}
                    placeholder={`Material delivery\nSite haulage\nOffloading`}
                  />
                </label>
                <label className="custom-field custom-field-full">
                  <span>Other allowances to show in analysis</span>
                  <textarea
                    value={pricing.otherAllowances || ''}
                    onChange={(event) => updateText('otherAllowances', event.target.value)}
                    rows={3}
                    placeholder="Security, access control, scaffolding, temporary power, standby generator, supervision..."
                  />
                </label>
              </div>
            </div>

            <div className="custom-section-card">
              <div className="custom-section-head">
                <div>
                  <span className="section-kicker">Step 3</span>
                  <h4>Commercial Adjustments</h4>
                </div>
                <TrendingUp size={18} />
              </div>
              <div className="custom-grid two-up">
                <label className="custom-field">
                  <span>Material waste %</span>
                  <input type="number" value={pricing.wastePercent ?? ''} onChange={(event) => updateNumber('wastePercent', event.target.value)} />
                </label>
                <label className="custom-field">
                  <span>Site difficulty %</span>
                  <input type="number" value={pricing.siteAdjustmentPercent ?? ''} onChange={(event) => updateNumber('siteAdjustmentPercent', event.target.value)} />
                </label>
                <label className="custom-field">
                  <span>Overheads %</span>
                  <input type="number" value={pricing.overheadsPercent ?? ''} onChange={(event) => updateNumber('overheadsPercent', event.target.value)} />
                </label>
                <label className="custom-field">
                  <span>Profit %</span>
                  <input type="number" value={pricing.profitPercent ?? ''} onChange={(event) => updateNumber('profitPercent', event.target.value)} />
                </label>
                <label className="custom-field">
                  <span>Round up to nearest</span>
                  <input type="number" value={pricing.roundingStep ?? ''} onChange={(event) => updateNumber('roundingStep', event.target.value)} />
                </label>
              </div>
            </div>

            <div className="custom-section-card">
              <div className="custom-section-head">
                <div>
                  <span className="section-kicker">Step 4</span>
                  <h4>Reference & Notes</h4>
                </div>
                <FileText size={18} />
              </div>
              <div className="custom-grid">
                <label className="custom-field">
                  <span>Pricing reference</span>
                  <input type="text" value={pricing.pricingReference} onChange={(event) => updateText('pricingReference', event.target.value)} placeholder="Supplier quote, old job, market call..." />
                </label>
                <label className="custom-field">
                  <span>Supplier / quote ref</span>
                  <input type="text" value={pricing.supplierQuote} onChange={(event) => updateText('supplierQuote', event.target.value)} placeholder="Vendor name or quote number" />
                </label>
                <label className="custom-field custom-field-full">
                  <span>Pricing note</span>
                  <textarea value={pricing.notes} onChange={(event) => updateText('notes', event.target.value)} rows={4} placeholder="Explain the basis for this custom rate, special access constraints, wastage assumptions, or negotiated terms." />
                </label>
              </div>
            </div>
          </section>

          <aside className="custom-pricing-summary">
            <div className="summary-card spotlight">
              <span className="summary-eyebrow">Computed Custom Rate</span>
              <div className="summary-amount">{formatMoney(summary.finalRate)}</div>
              <div className="summary-subtext">
                {quantity.toLocaleString()} x {formatMoney(summary.finalRate)} = {formatMoney(totalAmount)}
              </div>
            </div>

            <div className={`summary-card variance-card ${varianceTone}`}>
              <span className="summary-eyebrow">Market Comparison</span>
              {benchmarkDeltaPercent == null ? (
                <div className="variance-copy">No benchmark has been assigned to this item yet.</div>
              ) : (
                <>
                  <div className="variance-value">
                    {benchmarkDelta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {benchmarkDelta >= 0 ? '+' : ''}{PERCENT.format(benchmarkDeltaPercent)}%
                  </div>
                  <div className="variance-copy">
                    {benchmarkDelta >= 0 ? 'Above' : 'Below'} market by {formatMoney(Math.abs(benchmarkDelta))} per {item.unit}
                  </div>
                </>
              )}
            </div>

            <div className="summary-card">
              <span className="summary-eyebrow">Direct Cost Mix</span>
              <div className="mix-list">
                {directMix.map((row) => (
                  <div key={row.key} className="mix-row">
                    <div>
                      <span>{row.label}</span>
                      <small>{PERCENT.format(row.percentOfDirect)}% of direct cost</small>
                    </div>
                    <div className="mix-values">
                      <strong>{formatMoney(row.unitValue)}</strong>
                      <small>Total: {formatMoney(row.totalValue)}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="summary-card">
              <span className="summary-eyebrow">Rate Formula</span>
              <div className="formula-list">
                <div><span>Direct cost</span><strong>{formatMoney(summary.directCost)}</strong></div>
                <div><span>Waste</span><strong>{formatMoney(summary.wasteValue)}</strong></div>
                <div><span>Site difficulty</span><strong>{formatMoney(summary.siteValue)}</strong></div>
                <div><span>Overheads</span><strong>{formatMoney(summary.overheadValue)}</strong></div>
                <div><span>Profit</span><strong>{formatMoney(summary.profitValue)}</strong></div>
                <div className="formula-total"><span>Raw rate</span><strong>{formatMoney(summary.rawRate)}</strong></div>
              </div>
            </div>

            <div className="summary-card">
              <span className="summary-eyebrow">Useful Actions</span>
              <div className="summary-actions">
                <div className="ai-constraints-wrapper">
                  <input
                    type="text"
                    className="constraints-input-sm"
                    value={customConstraints}
                    onChange={(e) => setCustomConstraints(e.target.value)}
                    placeholder="Constraints (e.g. use Dangote cement)"
                    disabled={isBuildingRate}
                  />
                </div>
                <button
                  className="summary-action-btn btn-ai-buildup-action"
                  disabled={isBuildingRate}
                  onClick={handleAIBuildUp}
                >
                  <Zap size={14} />
                  {isBuildingRate ? 'AI Build-Up Running...' : 'AI First-Principles Build-Up'}
                </button>
                {aiBuildUpError && (
                  <span className="ai-buildup-error-text">{aiBuildUpError}</span>
                )}
                <button className="summary-action-btn" onClick={resetToReference}>
                  Reset from current rate
                </button>
                {item?.breakdown && (
                  <button className="summary-action-btn" onClick={importFromBreakdown}>
                    Import from rate build-up
                  </button>
                )}
                <button
                  className="summary-action-btn summary-action-btn-primary"
                  onClick={() => onOpenDetailedAnalysis?.({
                    ...pricing,
                    workType: activeWorkType,
                    benchmarkRate: seeded.benchmarkRate,
                    rawRate: summary.rawRate,
                    finalRate: summary.finalRate,
                    pricingMode: 'custom-studio-draft',
                    region
                  })}
                >
                  <Calculator size={15} />
                  Open detailed rate analysis
                </button>
              </div>
            </div>
          </aside>
        </div>

        <footer className="custom-pricing-footer">
          <button className="custom-footer-btn secondary" onClick={onClose}>Cancel</button>
          <button
            className="custom-footer-btn primary"
            onClick={() => onSave(summary.finalRate, {
              ...pricing,
              workType: activeWorkType,
              benchmarkRate: seeded.benchmarkRate,
              rawRate: summary.rawRate,
              finalRate: summary.finalRate
            })}
          >
            Apply custom pricing
          </button>
        </footer>
      </div>

      <style jsx="true">{`
        .custom-pricing-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.68);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: clamp(0.75rem, 4vh, 2rem) 1rem;
          z-index: 1200;
        }
        .custom-pricing-modal {
          width: min(1180px, 100%);
          margin: 0 auto;
          max-height: calc(100vh - 2rem);
          overflow: auto;
          background: #f8fafc;
          border-radius: 24px;
          box-shadow: 0 32px 80px rgba(15, 23, 42, 0.35);
        }
        .custom-pricing-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.5rem 1.75rem 1rem;
          background: linear-gradient(135deg, #0f172a, #1d4ed8);
          color: white;
        }
        .custom-pricing-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 0.38rem 0.7rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
        }
        .custom-pricing-header h3 {
          margin: 0.55rem 0 0.35rem;
          font-size: 1.35rem;
          line-height: 1.3;
        }
        .custom-pricing-header p {
          margin: 0;
          color: rgba(255, 255, 255, 0.78);
          font-size: 0.92rem;
        }
        .custom-pricing-close {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: none;
          background: rgba(255, 255, 255, 0.14);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .custom-pricing-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          padding: 1rem 1.75rem 0;
        }
        .custom-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 0.8rem;
          border-radius: 999px;
          background: white;
          border: 1px solid #dbeafe;
          color: #1e3a8a;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .custom-pricing-content {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr);
          gap: 1rem;
          padding: 1rem 1.75rem 1.5rem;
        }
        .custom-pricing-form,
        .custom-pricing-summary {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .custom-section-card,
        .summary-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 1rem;
        }
        .custom-section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          color: #0f172a;
        }
        .section-kicker,
        .summary-eyebrow {
          display: block;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 0.3rem;
        }
        .custom-section-head h4 {
          margin: 0;
          font-size: 1rem;
        }
        .preset-card {
          background: linear-gradient(135deg, #fff7ed, #fffbeb);
          border-color: #fed7aa;
        }
        .preset-grid {
          display: grid;
          gap: 0.75rem;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .preset-btn {
          border: 1px solid #fdba74;
          background: rgba(255, 255, 255, 0.82);
          border-radius: 16px;
          padding: 1rem;
          text-align: left;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
        }
        .preset-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 26px rgba(194, 65, 12, 0.12);
          border-color: #ea580c;
        }
        .preset-label {
          font-size: 0.92rem;
          font-weight: 800;
          color: #9a3412;
        }
        .preset-copy {
          font-size: 0.8rem;
          color: #7c2d12;
          line-height: 1.5;
        }
        .custom-grid {
          display: grid;
          gap: 0.85rem;
        }
        .custom-grid.two-up {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .detail-list-grid {
          margin-top: 0.9rem;
          padding-top: 0.9rem;
          border-top: 1px dashed #cbd5e1;
        }
        .custom-field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .custom-field span {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: #334155;
        }
        .custom-field input,
        .custom-field select,
        .custom-field textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 0.78rem 0.9rem;
          font-size: 0.9rem;
          color: #0f172a;
          background: #f8fafc;
        }
        .custom-field input:focus,
        .custom-field select:focus,
        .custom-field textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
          background: white;
        }
        .custom-select {
          appearance: none;
        }
        .custom-field-full {
          grid-column: 1 / -1;
        }
        .profile-helper-card {
          border: 1px solid #dbeafe;
          border-radius: 16px;
          background: #eff6ff;
          padding: 0.95rem 1rem;
        }
        .profile-helper-card strong {
          display: block;
          color: #1e3a8a;
          font-size: 0.9rem;
        }
        .profile-helper-card p {
          margin: 0.35rem 0 0.8rem;
          color: #334155;
          font-size: 0.82rem;
          line-height: 1.55;
        }
        .profile-helper-btn {
          border: 1px solid #93c5fd;
          background: white;
          color: #1d4ed8;
          border-radius: 999px;
          padding: 0.55rem 0.85rem;
          font-size: 0.78rem;
          font-weight: 800;
          cursor: pointer;
        }
        .spotlight {
          background: linear-gradient(135deg, #0f172a, #1d4ed8);
          color: white;
        }
        .summary-amount {
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: -0.03em;
        }
        .summary-subtext {
          margin-top: 0.35rem;
          color: rgba(255, 255, 255, 0.76);
          font-size: 0.86rem;
        }
        .variance-card.aligned {
          border-color: #86efac;
          background: #f0fdf4;
        }
        .variance-card.high {
          border-color: #fdba74;
          background: #fff7ed;
        }
        .variance-card.low {
          border-color: #93c5fd;
          background: #eff6ff;
        }
        .variance-card.neutral {
          background: #f8fafc;
        }
        .variance-value {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 1.45rem;
          font-weight: 900;
          color: #0f172a;
        }
        .variance-copy {
          margin-top: 0.35rem;
          color: #475569;
          font-size: 0.84rem;
          line-height: 1.5;
        }
        .formula-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .mix-list {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }
        .mix-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 0.7rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .mix-row:last-child {
          padding-bottom: 0;
          border-bottom: none;
        }
        .mix-row span,
        .mix-row strong {
          color: #0f172a;
          font-size: 0.84rem;
        }
        .mix-row small {
          display: block;
          margin-top: 0.18rem;
          color: #64748b;
          font-size: 0.72rem;
        }
        .mix-values {
          text-align: right;
        }
        .formula-list div {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          font-size: 0.86rem;
          color: #334155;
        }
        .formula-list strong {
          color: #0f172a;
        }
        .formula-total {
          padding-top: 0.6rem;
          border-top: 1px dashed #cbd5e1;
          font-weight: 800;
        }
        .ai-constraints-wrapper {
          width: 100%;
        }
        .constraints-input-sm {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 0.65rem 0.8rem;
          font-size: 0.76rem;
          background: #f8fafc;
          color: #0f172a;
          outline: none;
          transition: all 0.2s ease;
        }
        .constraints-input-sm:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
          background: white;
        }
        .summary-actions {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .summary-action-btn {
          width: 100%;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #0f172a;
          border-radius: 12px;
          padding: 0.8rem 0.9rem;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
        }
        .btn-ai-buildup-action {
          width: 100%;
          border: none;
          background: linear-gradient(135deg, var(--quantra-blue-600) 0%, var(--quantra-blue-500) 100%);
          color: white;
          border-radius: 12px;
          padding: 0.8rem 0.9rem;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
        }
        .btn-ai-buildup-action:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
        }
        .btn-ai-buildup-action:disabled {
          background: #cbd5e1;
          color: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
        }
        .ai-buildup-error-text {
          font-size: 0.72rem;
          color: #dc2626;
          font-weight: 600;
          text-align: center;
        }
        .summary-action-btn-primary {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1d4ed8;
        }
        .custom-pricing-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.75rem 1.5rem;
          border-top: 1px solid #e2e8f0;
          background: rgba(255, 255, 255, 0.92);
        }
        .custom-footer-btn {
          border-radius: 999px;
          padding: 0.82rem 1.2rem;
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
          border: 1px solid transparent;
        }
        .custom-footer-btn.secondary {
          background: white;
          border-color: #cbd5e1;
          color: #334155;
        }
        .custom-footer-btn.primary {
          background: linear-gradient(135deg, #0f766e, #2563eb);
          color: white;
          box-shadow: 0 16px 30px rgba(37, 99, 235, 0.22);
        }
        :root[data-theme='dark'] .custom-pricing-overlay {
          background: rgba(2, 6, 23, 0.84);
        }
        :root[data-theme='dark'] .custom-pricing-modal {
          background: var(--bg-main);
          box-shadow: 0 32px 80px rgba(2, 6, 23, 0.7);
        }
        :root[data-theme='dark'] .custom-pricing-header {
          background: linear-gradient(135deg, #020617, #0f172a);
        }
        :root[data-theme='dark'] .custom-chip,
        :root[data-theme='dark'] .custom-section-card,
        :root[data-theme='dark'] .summary-card,
        :root[data-theme='dark'] .profile-helper-card {
          background: var(--bg-card);
          border-color: var(--border-light);
          color: var(--text-primary);
          box-shadow: none;
        }
        :root[data-theme='dark'] .preset-card {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(51, 65, 85, 0.92));
          border-color: rgba(251, 191, 36, 0.2);
        }
        :root[data-theme='dark'] .preset-btn {
          background: rgba(9, 17, 31, 0.88);
          border-color: rgba(148, 163, 184, 0.22);
        }
        :root[data-theme='dark'] .preset-label,
        :root[data-theme='dark'] .custom-section-head,
        :root[data-theme='dark'] .mix-row span,
        :root[data-theme='dark'] .mix-row strong,
        :root[data-theme='dark'] .formula-list strong,
        :root[data-theme='dark'] .variance-value {
          color: var(--text-primary);
        }
        :root[data-theme='dark'] .preset-copy,
        :root[data-theme='dark'] .profile-helper-card p,
        :root[data-theme='dark'] .custom-field span,
        :root[data-theme='dark'] .mix-row small,
        :root[data-theme='dark'] .formula-list div,
        :root[data-theme='dark'] .variance-copy {
          color: var(--text-secondary);
        }
        :root[data-theme='dark'] .custom-field input,
        :root[data-theme='dark'] .custom-field select,
        :root[data-theme='dark'] .custom-field textarea,
        :root[data-theme='dark'] .summary-action-btn {
          background: var(--bg-card-muted);
          border-color: var(--border-medium);
          color: var(--text-primary);
        }
        :root[data-theme='dark'] .custom-field input:focus,
        :root[data-theme='dark'] .custom-field select:focus,
        :root[data-theme='dark'] .custom-field textarea:focus {
          background: var(--bg-card);
        }
        :root[data-theme='dark'] .custom-pricing-footer {
          background: rgba(9, 17, 31, 0.94);
          border-color: var(--border-light);
        }
        :root[data-theme='dark'] .custom-footer-btn.secondary,
        :root[data-theme='dark'] .profile-helper-btn {
          background: var(--bg-card-muted);
          border-color: var(--border-medium);
          color: var(--text-primary);
        }
        :root[data-theme='dark'] .btn-ai-buildup-action {
          color: #0c0a09; /* Deep black text for gold contrast */
          box-shadow: 0 4px 12px rgba(212, 160, 23, 0.2);
        }
        :root[data-theme='dark'] .btn-ai-buildup-action:disabled {
          background: var(--bg-card-muted);
          color: var(--text-muted);
          box-shadow: none;
        }
        :root[data-theme='dark'] .btn-ai-buildup-action:hover:not(:disabled) {
          box-shadow: 0 6px 16px rgba(212, 160, 23, 0.4);
        }
        :root[data-theme='dark'] .ai-buildup-error-text {
          color: #fb7185;
        }
        :root[data-theme='dark'] .constraints-input-sm {
          background: var(--bg-card-muted);
          border-color: var(--border-medium);
          color: var(--text-primary);
        }
        :root[data-theme='dark'] .constraints-input-sm:focus {
          border-color: var(--quantra-blue-500);
          box-shadow: 0 0 0 2px rgba(212, 160, 23, 0.15);
          background: var(--bg-card);
        }
        :root[data-theme='dark'] .detail-list-grid {
          border-top: 1px dashed var(--border-medium);
        }
        @media (max-width: 960px) {
          .custom-pricing-content {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .custom-pricing-header,
          .custom-pricing-toolbar,
          .custom-pricing-content,
          .custom-pricing-footer {
            padding-left: 1rem;
            padding-right: 1rem;
          }
          .custom-grid.two-up {
            grid-template-columns: 1fr;
          }
          .preset-grid {
            grid-template-columns: 1fr;
          }
          .custom-pricing-footer {
            flex-direction: column;
          }
          .custom-footer-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
};

export default CustomPricingModal;
