import {
  buildWorkedExampleText,
  evaluateBoqFormulaRate,
  normalizeEditableInputs,
} from '../utils/boqFormulas';
import { getBreakdownForItem } from './rateBreakdowns';
import { ROAD_DRAINAGE_ITEMS } from './catalog/roadDrainage';
import { ROAD_EARTHWORK_ITEMS } from './catalog/roadEarthworks';
import {
  ROAD_EXTERNAL_FINISHING_ITEMS,
  ROAD_FURNITURE_ITEMS,
} from './catalog/roadFurnitureFinishing';
import {
  ROAD_BASE_COURSE_ITEMS,
} from './catalog/roadPavementLayers';
import * as BuildingCatalog from './catalog/building';
import { ROAD_SUB_BASE_ITEMS } from './catalog/roadSubBase';
import { ROAD_SUBGRADE_ITEMS } from './catalog/roadSubgrade';
import { ROAD_SURFACING_ITEMS } from './catalog/roadSurfacing';

export const STRUCTURE_TYPES = {
  BUILDING: 'Building',
  ROAD: 'Road',
  BRIDGE: 'Bridge',
  DRAINAGE: 'Drainage',
  CULVERT: 'Culvert',
  COASTAL: 'Coastal / Marine',
  FOUNDATION: 'Foundation Works',
  WATER_UTILITY: 'Water / Utility Works',
};

export const STRUCTURE_OPTIONS = [
  {
    id: STRUCTURE_TYPES.BUILDING,
    label: STRUCTURE_TYPES.BUILDING,
    description: 'Vertical building works with coordinated architectural, structural, and MEP bills.',
    icon: '🏢',
  },
  {
    id: STRUCTURE_TYPES.ROAD,
    label: STRUCTURE_TYPES.ROAD,
    description: 'Flexible or rigid pavement projects with drainage and road furniture bills.',
    icon: '🛣️',
  },
  {
    id: STRUCTURE_TYPES.BRIDGE,
    label: STRUCTURE_TYPES.BRIDGE,
    description: 'Bridge and flyover works with piling, deck, bearing, and protection bills.',
    icon: '🌉',
  },
  {
    id: STRUCTURE_TYPES.DRAINAGE,
    label: STRUCTURE_TYPES.DRAINAGE,
    description: 'Open or covered drainage systems with excavation, concrete, and finishing bills.',
    icon: '🚰',
  },
  {
    id: STRUCTURE_TYPES.CULVERT,
    label: STRUCTURE_TYPES.CULVERT,
    description: 'Pipe and box culvert works with headwalls, wing walls, bedding, and protection.',
    icon: '🧱',
  },
  {
    id: STRUCTURE_TYPES.COASTAL,
    label: STRUCTURE_TYPES.COASTAL,
    description: 'Marine and shoreline works including revetment, dredging, and outfall structures.',
    icon: '🌊',
  },
  {
    id: STRUCTURE_TYPES.FOUNDATION,
    label: STRUCTURE_TYPES.FOUNDATION,
    description: 'Specialized foundation packages covering raft, pile cap, and ground beam works.',
    icon: '🏗️',
  },
  {
    id: STRUCTURE_TYPES.WATER_UTILITY,
    label: STRUCTURE_TYPES.WATER_UTILITY,
    description: 'Water supply and buried utility projects with trenching, pipes, chambers, and tests.',
    icon: '💧',
  },
];

const makeItemCode = (structureCode, sectionCode, index) => (
  `${structureCode}-${sectionCode}-${String(index + 1).padStart(3, '0')}`
);

const makeSectionCode = (value = '') => (
  String(value)
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
);

const numericInput = (id, label, value, unit = '', helpText = '') => ({
  id,
  label,
  type: 'number',
  value,
  defaultValue: value,
  unit,
  helpText,
});

const buildRateInputs = ({
  materials = 0,
  labour = 0,
  plant = 0,
  transport = 0,
  overhead = 0,
}) => (
  [
    numericInput('materials', 'Materials', materials, '₦/unit'),
    numericInput('labour', 'Labour', labour, '₦/unit'),
    numericInput('plant', 'Plant', plant, '₦/unit'),
    numericInput('transport', 'Transport', transport, '₦/unit'),
    numericInput('overhead', 'Overheads', overhead, '₦/unit'),
  ].filter((input) => input.value > 0)
);

const expressionText = 'Unit rate = Materials + Labour + Plant + Transport + Overheads';
const expressionFormula = 'materials + labour + plant + transport + overhead';
const DEFAULT_RATE_SOURCE_OPTIONS = ['benchmark', 'formula', 'manual'];
const SEED_BENCHMARK_DATE = '2026-04-18';
const DEFAULT_CATALOG_BENCHMARK_NOTE = 'Catalog seed benchmark. Replace with verified Nigerian market rate.';
const MARKET_LIBRARY_BENCHMARK_DATE = '2026-05-08';
const MARKET_LIBRARY_BENCHMARK_NOTE = 'Benchmark derived from the current Quantra market library and rate breakdown reference for Nigeria. Validate with supplier quotes and project-specific logistics before tender use.';
const MARKET_LIBRARY_BENCHMARK_FACTOR = 0.85;
const MARKET_LIBRARY_FALLBACK_FACTOR = 0.78;
const CATALOG_REGIONAL_FACTORS = {
  Lagos: 1,
  Abuja: 1.1,
  'Port Harcourt': 1.08,
  Ibadan: 0.93,
  Kano: 0.96,
  Enugu: 1.02,
};

const normalizeKeywords = (keywords = []) => (
  (Array.isArray(keywords) ? keywords : [])
    .map((keyword) => String(keyword || '').trim())
    .filter(Boolean)
);

const normalizeFormulaBasis = (formulaBasis = []) => (
  (Array.isArray(formulaBasis)
    ? formulaBasis
    : String(formulaBasis || '').split('\n')
  )
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
);

const buildBenchmarkMetadata = ({
  rate = 0,
  currency = 'NGN',
  region = 'Lagos',
  sourceType = 'catalog',
  sourceNote = '',
  dateCaptured = null,
  confidenceLevel = rate > 0 ? 'medium' : 'low',
  calibrationFactor = null,
} = {}) => ({
  rate: Number(rate) || 0,
  currency,
  region,
  sourceType,
  sourceNote,
  dateCaptured,
  confidenceLevel,
  ...(calibrationFactor ? { calibrationFactor: Number(calibrationFactor) } : {}),
});

const buildSeedBenchmarkMetadata = ({
  rate = 0,
  region = 'Lagos',
  sourceNote = 'Seed benchmark placeholder for BOQ-Pro. Replace with current market data.',
  dateCaptured = SEED_BENCHMARK_DATE,
  confidenceLevel = 'low',
  calibrationFactor = 0.72,
  sourceType = 'seed',
} = {}) => buildBenchmarkMetadata({
  rate,
  region,
  sourceType,
  sourceNote,
  dateCaptured,
  confidenceLevel,
  calibrationFactor,
});

const clampCatalogNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildCatalogRegionalBenchmarkRates = (baseRate = 0) => {
  const benchmark = clampCatalogNumber(baseRate);
  if (!benchmark) return {};

  return Object.entries(CATALOG_REGIONAL_FACTORS).reduce((acc, [region, factor]) => {
    acc[region] = Math.round(benchmark * factor);
    return acc;
  }, {});
};

const buildCatalogBenchmarkEvidence = ({
  structureType = '',
  item = {},
  sourceType = '',
  matchSource = '',
  benchmarkRate = 0,
  benchmarkRegionalRates = {},
}) => {
  const exactRegions = Object.keys(benchmarkRegionalRates || {});
  const componentCount = Array.isArray(item.editableInputs)
    ? item.editableInputs.length
    : (Array.isArray(item.exampleInputs) ? item.exampleInputs.length : 0);

  const summary = sourceType === 'formula-market-derived'
    ? `Benchmark built from ${componentCount} formula inputs for ${item.name || item.description || 'this item'}.`
    : `Benchmark derived from the ${matchSource || 'library'} market reference for ${item.name || item.description || 'this item'}.`;

  return {
    mode: sourceType === 'formula-market-derived' ? 'formula-derived' : 'catalog-derived',
    summary,
    structureType,
    matchSource: matchSource || (sourceType === 'formula-market-derived' ? 'formula-build' : 'catalog'),
    exactRegions,
    benchmarkRate: clampCatalogNumber(benchmarkRate),
  };
};

const getCatalogBreakdownLineTotal = (category, row = {}) => {
  if (category === 'materials') {
    const wasteFactor = 1 + (clampCatalogNumber(row.waste) / 100);
    return clampCatalogNumber(row.qty) * clampCatalogNumber(row.rate) * wasteFactor;
  }

  if (category === 'labor' || category === 'labour' || category === 'plant') {
    return (clampCatalogNumber(row.qty) * clampCatalogNumber(row.rate))
      / Math.max(clampCatalogNumber(row.output) || 1, 0.001);
  }

  return clampCatalogNumber(row.qty) * clampCatalogNumber(row.rate);
};

const calculateCatalogBreakdownBenchmark = (breakdown = {}) => {
  const materials = Array.isArray(breakdown.materials) ? breakdown.materials : [];
  const labourRows = Array.isArray(breakdown.labor)
    ? breakdown.labor
    : (Array.isArray(breakdown.labour) ? breakdown.labour : []);
  const plantRows = Array.isArray(breakdown.plant) ? breakdown.plant : [];
  const transportRows = Array.isArray(breakdown.transport) ? breakdown.transport : [];

  const materialsTotal = materials.reduce((sum, row) => sum + getCatalogBreakdownLineTotal('materials', row), 0);
  const labourTotal = labourRows.reduce((sum, row) => sum + getCatalogBreakdownLineTotal('labor', row), 0);
  const plantTotal = plantRows.reduce((sum, row) => sum + getCatalogBreakdownLineTotal('plant', row), 0);
  const transportTotal = transportRows.reduce((sum, row) => sum + getCatalogBreakdownLineTotal('transport', row), 0);
  const primeCost = materialsTotal + labourTotal + plantTotal + transportTotal;
  const overheadValue = primeCost * (clampCatalogNumber(breakdown.overheads) / 100);
  const profitValue = (primeCost + overheadValue) * (clampCatalogNumber(breakdown.profit) / 100);

  return primeCost + overheadValue + profitValue;
};

const getCatalogFormulaBenchmarkRate = (item = {}) => {
  const editableInputs = Array.isArray(item.editableInputs) && item.editableInputs.length > 0
    ? item.editableInputs
    : (Array.isArray(item.exampleInputs) ? item.exampleInputs : []);

  if (!editableInputs.length) return 0;
  if (!item.defaultFormulaType && !item.formulaExpression) return 0;

  return clampCatalogNumber(evaluateBoqFormulaRate({
    ...item,
    editableInputs,
  }));
};

const deriveCatalogBenchmark = (item = {}, structureType = '') => {
  const formulaRate = getCatalogFormulaBenchmarkRate(item);
  if (formulaRate > 0) {
    return {
      rate: formulaRate,
      sourceType: 'formula-market-derived',
      sourceNote: 'Benchmark resolved from the catalog formula build-up using current Quantra benchmark inputs.',
      confidenceLevel: 'medium',
      calibrationFactor: MARKET_LIBRARY_BENCHMARK_FACTOR,
      matchSource: 'formula-build',
    };
  }

  const breakdown = getBreakdownForItem(item.description || item.name || '', structureType);
  const breakdownRate = clampCatalogNumber(calculateCatalogBreakdownBenchmark(breakdown));
  if (breakdownRate > 0) {
    const matchSource = String(breakdown?.matchSource || '').toLowerCase();
    const isSpecificMatch = matchSource === 'keyword' || matchSource === 'trade-default';

    return {
      rate: breakdownRate,
      sourceType: 'market-library-derived',
      sourceNote: MARKET_LIBRARY_BENCHMARK_NOTE,
      confidenceLevel: isSpecificMatch ? 'medium' : 'low',
      calibrationFactor: isSpecificMatch ? MARKET_LIBRARY_BENCHMARK_FACTOR : MARKET_LIBRARY_FALLBACK_FACTOR,
      matchSource,
    };
  }

  return null;
};

const ensureCatalogItemBenchmark = (item = {}, structureType = '') => {
  const explicitBenchmarkRate = clampCatalogNumber(
    item.benchmarkRate
    ?? item.benchmarkMetadata?.rate
    ?? item.benchmark
  );

  if (explicitBenchmarkRate > 0) {
    const hasFormulaBenchmark = getCatalogFormulaBenchmarkRate(item) > 0;
    const currentMetadata = item.benchmarkMetadata || {};
    const currentSourceType = String(currentMetadata.sourceType || '').toLowerCase();
    const useFormulaDerivedMetadata = hasFormulaBenchmark
      && (!currentSourceType || currentSourceType === 'seed' || currentSourceType === 'seed-placeholder' || currentSourceType === 'catalog');
    const benchmarkRegionalRates = Object.keys(item.benchmarkRegionalRates || {}).length > 0
      ? item.benchmarkRegionalRates
      : buildCatalogRegionalBenchmarkRates(explicitBenchmarkRate);
    const benchmarkSourceType = useFormulaDerivedMetadata
      ? 'formula-market-derived'
      : (currentMetadata.sourceType || 'catalog');
    const benchmarkMatchSource = item.benchmarkMatchSource
      || (useFormulaDerivedMetadata ? 'formula-build' : 'catalog');

    return {
      ...item,
      benchmarkRate: explicitBenchmarkRate,
      benchmark: explicitBenchmarkRate,
      benchmarkRegionalRates,
      benchmarkMatchSource,
      benchmarkEvidence: item.benchmarkEvidence || buildCatalogBenchmarkEvidence({
        structureType,
        item,
        sourceType: benchmarkSourceType,
        matchSource: benchmarkMatchSource,
        benchmarkRate: explicitBenchmarkRate,
        benchmarkRegionalRates,
      }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: explicitBenchmarkRate,
        currency: currentMetadata.currency || 'NGN',
        region: currentMetadata.region || 'Nigeria',
        sourceType: benchmarkSourceType,
        sourceNote: useFormulaDerivedMetadata
          ? 'Benchmark resolved from the catalog formula build-up using current Quantra benchmark inputs.'
          : (currentMetadata.sourceNote || DEFAULT_CATALOG_BENCHMARK_NOTE),
        dateCaptured: currentMetadata.dateCaptured || MARKET_LIBRARY_BENCHMARK_DATE,
        confidenceLevel: useFormulaDerivedMetadata
          ? 'medium'
          : (currentMetadata.confidenceLevel || 'medium'),
        calibrationFactor: useFormulaDerivedMetadata
          ? MARKET_LIBRARY_BENCHMARK_FACTOR
          : (currentMetadata.calibrationFactor || null),
      }),
    };
  }

  const derivedBenchmark = deriveCatalogBenchmark(item, structureType);
  if (!derivedBenchmark?.rate) return item;
  const benchmarkRegionalRates = buildCatalogRegionalBenchmarkRates(derivedBenchmark.rate);

  return {
    ...item,
    benchmarkRate: derivedBenchmark.rate,
    benchmark: derivedBenchmark.rate,
    benchmarkRegionalRates,
    benchmarkMatchSource: derivedBenchmark.matchSource,
    benchmarkEvidence: buildCatalogBenchmarkEvidence({
      structureType,
      item,
      sourceType: derivedBenchmark.sourceType,
      matchSource: derivedBenchmark.matchSource,
      benchmarkRate: derivedBenchmark.rate,
      benchmarkRegionalRates,
    }),
    benchmarkMetadata: buildBenchmarkMetadata({
      rate: derivedBenchmark.rate,
      currency: item.benchmarkMetadata?.currency || 'NGN',
      region: item.benchmarkMetadata?.region || 'Nigeria',
      sourceType: derivedBenchmark.sourceType,
      sourceNote: derivedBenchmark.sourceNote,
      dateCaptured: MARKET_LIBRARY_BENCHMARK_DATE,
      confidenceLevel: derivedBenchmark.confidenceLevel,
      calibrationFactor: derivedBenchmark.calibrationFactor,
    }),
  };
};

const buildSectionMeta = (id, title, description, metadata = {}) => {
  const isPreliminaries = metadata.isPreliminaries ?? id === 'preliminaries';
  const defaultPickerPrompt = isPreliminaries
    ? 'Pick only the preliminaries that genuinely apply to this project, then enter the project-specific quantity or duration for each one.'
    : `Select the bill items that apply to ${title.toLowerCase()} and add only the lines you intend to measure.`;
  const defaultEmptyTitle = isPreliminaries
    ? 'No preliminaries selected yet.'
    : `No items selected for ${title}.`;
  const defaultEmptyMessage = isPreliminaries
    ? 'Start with mobilization, temporary facilities, HSE, supervision, permits, and only the preliminaries required by the contract.'
    : 'Use the item library to bring in standard BOQ lines for this bill, or add a custom line where the project needs something outside the library.';

  return {
    isPreliminaries,
    trade: metadata.trade || title,
    pickerPrompt: metadata.pickerPrompt || defaultPickerPrompt,
    emptyStateTitle: metadata.emptyStateTitle || defaultEmptyTitle,
    emptyStateMessage: metadata.emptyStateMessage || defaultEmptyMessage,
    keywords: normalizeKeywords([
      id,
      title,
      description,
      ...(metadata.keywords || []),
    ]),
  };
};

const baseCatalogItem = ({
  id,
  code,
  name,
  description,
  unit,
  structureType = '',
  billSection = '',
  benchmarkRate = 0,
  benchmarkMetadata = null,
  defaultFormulaType = 'manual',
  formulaText = '',
  formulaBasis = [],
  formulaExpression = '',
  editableInputs = [],
  exampleInputs = [],
  workedExample = '',
  notes = '',
  category = 'General',
  keywords = [],
  pickerHint = '',
  isRecommended = false,
  rateSourceOptions = DEFAULT_RATE_SOURCE_OPTIONS,
  selectedRateSource = null,
}) => {
  const normalizedEditableInputs = normalizeEditableInputs(editableInputs);
  const normalizedExampleInputs = normalizeEditableInputs(
    Array.isArray(exampleInputs) && exampleInputs.length > 0
      ? exampleInputs
      : normalizedEditableInputs
  );

  const item = {
    id: id || code,
    code,
    name,
    description,
    unit,
    structureType,
    billSection,
    benchmarkRate,
    benchmarkMetadata: benchmarkMetadata || buildSeedBenchmarkMetadata({
      rate: benchmarkRate,
      region: 'Nigeria',
      sourceType: 'seed-placeholder',
      sourceNote: DEFAULT_CATALOG_BENCHMARK_NOTE,
      confidenceLevel: 'low',
    }),
    defaultFormulaType,
    formulaText,
    formulaBasis: normalizeFormulaBasis(formulaBasis),
    formulaExpression,
    editableInputs: normalizedEditableInputs,
    exampleInputs: normalizedExampleInputs,
    workedExample,
    notes,
    category,
    keywords: normalizeKeywords([
      category,
      name,
      description,
      ...(keywords || []),
    ]),
    pickerHint,
    isRecommended,
    selectedRateSource: selectedRateSource || (defaultFormulaType !== 'manual' ? 'formula' : 'manual'),
    rateSourceOptions: Array.isArray(rateSourceOptions) && rateSourceOptions.length > 0
      ? [...rateSourceOptions]
      : [...DEFAULT_RATE_SOURCE_OPTIONS],
  };

  if (defaultFormulaType !== 'manual' && !item.workedExample) {
    item.workedExample = buildWorkedExampleText(item);
  }

  return item;
};

const _manualItem = ({
  id,
  code,
  name,
  description,
  unit,
  structureType = '',
  billSection = '',
  benchmarkRate,
  benchmarkMetadata = null,
  formulaText = '',
  formulaBasis = [],
  notes = '',
  category = 'General',
  keywords = [],
  pickerHint = '',
  isRecommended = false,
  rateSourceOptions = DEFAULT_RATE_SOURCE_OPTIONS,
  selectedRateSource = null,
}) => baseCatalogItem({
  id,
  code,
  name,
  description,
  unit,
  structureType,
  billSection,
  benchmarkRate,
  benchmarkMetadata,
  formulaText,
  formulaBasis,
  notes,
  category,
  keywords,
  pickerHint,
  isRecommended,
  rateSourceOptions,
  selectedRateSource,
});

const formulaRateItem = ({
  id,
  code,
  name,
  description,
  unit,
  structureType = '',
  billSection = '',
  inputs,
  benchmarkRate,
  benchmarkMetadata = null,
  formulaText = expressionText,
  formulaBasis = [],
  formulaExpression = expressionFormula,
  notes = '',
  category = 'General',
  keywords = [],
  pickerHint = '',
  isRecommended = false,
  rateSourceOptions = DEFAULT_RATE_SOURCE_OPTIONS,
  selectedRateSource = null,
}) => {
  const computedBenchmarkRate = evaluateBoqFormulaRate({
    defaultFormulaType: 'expression',
    formulaExpression,
    editableInputs: inputs,
  });
  const resolvedBenchmarkRate = Number(benchmarkRate ?? computedBenchmarkRate) || 0;

  return baseCatalogItem({
    id,
    code,
    name,
    description,
    unit,
    structureType,
    billSection,
    benchmarkRate: resolvedBenchmarkRate,
    benchmarkMetadata,
    defaultFormulaType: 'expression',
    formulaText,
    formulaBasis,
    formulaExpression,
    editableInputs: inputs,
    exampleInputs: inputs,
    notes,
    category,
    keywords,
    pickerHint,
    isRecommended,
    rateSourceOptions,
    selectedRateSource,
  });
};

const lumpSumInputs = ({
  mobilization = 0,
  demobilization = 0,
  logistics = 0,
  permits = 0,
}) => (
  [
    numericInput('mobilization', 'Mobilization', mobilization, '₦'),
    numericInput('demobilization', 'Demobilization', demobilization, '₦'),
    numericInput('logistics', 'Logistics', logistics, '₦'),
    numericInput('permits', 'Permits / Fees', permits, '₦'),
  ].filter((input) => input.value > 0)
);

const monthInputs = ({
  rent = 0,
  utilities = 0,
  staffing = 0,
  support = 0,
}) => (
  [
    numericInput('rent', 'Rent / Accommodation', rent, '₦/month'),
    numericInput('utilities', 'Utilities', utilities, '₦/month'),
    numericInput('staffing', 'Staffing', staffing, '₦/month'),
    numericInput('support', 'Support Costs', support, '₦/month'),
  ].filter((input) => input.value > 0)
);

const buildComponentInputs = (components = [], unit = 'NGN') => (
  (Array.isArray(components) ? components : [])
    .map((component) => numericInput(
      component.id,
      component.label,
      component.defaultValue ?? component.value,
      component.unit || unit,
      component.helpText || ''
    ))
);

const buildSumExpression = (components = []) => (
  buildComponentInputs(components)
    .map((input) => input.id)
    .filter(Boolean)
    .join(' + ')
);

const buildSumFormulaText = (label, components = []) => {
  const componentLabels = buildComponentInputs(components)
    .map((input) => input.label)
    .filter(Boolean);
  if (componentLabels.length === 0) return label;
  return `${label} = ${componentLabels.join(' + ')}`;
};

const roadSeedBenchmarkNote = (name, billSection = 'Road bill') => (
  `Seed Nigerian ${String(billSection || 'Road bill').toLowerCase()} benchmark for ${name}. Replace with current project market data when available.`
);

const roadFormulaItem = ({
  code,
  name,
  description,
  unit,
  billSection = 'Preliminaries',
  category,
  keywords = [],
  pickerHint = '',
  isRecommended = false,
  components = [],
  formulaText = '',
  formulaBasis = [],
  formulaExpression = '',
  benchmarkRate,
  benchmarkNote = '',
  benchmarkDateCaptured = SEED_BENCHMARK_DATE,
  benchmarkSourceType = 'seed',
  notes = '',
  selectedRateSource = 'formula',
}) => {
  const inputs = buildComponentInputs(components, 'NGN');
  const resolvedFormulaExpression = formulaExpression || buildSumExpression(components);
  const resolvedFormulaText = formulaText || buildSumFormulaText(
    unit === 'Month' ? 'Monthly rate' : unit === 'Sum' ? 'Lump sum' : 'Unit rate',
    components
  );
  const resolvedBenchmarkRate = Number(benchmarkRate ?? evaluateBoqFormulaRate({
    defaultFormulaType: 'expression',
    formulaExpression: resolvedFormulaExpression,
    editableInputs: inputs,
  })) || 0;

  return formulaRateItem({
    id: code,
    code,
    name,
    description,
    unit,
    structureType: 'Road',
    billSection,
    inputs,
    benchmarkRate: resolvedBenchmarkRate,
    benchmarkMetadata: buildSeedBenchmarkMetadata({
      rate: resolvedBenchmarkRate,
      region: 'Nigeria',
      sourceNote: benchmarkNote || roadSeedBenchmarkNote(name, billSection),
      dateCaptured: benchmarkDateCaptured,
      confidenceLevel: resolvedBenchmarkRate > 0 ? 'low' : 'low',
      sourceType: benchmarkSourceType,
    }),
    formulaText: resolvedFormulaText,
    formulaBasis,
    formulaExpression: resolvedFormulaExpression,
    category,
    keywords,
    pickerHint,
    isRecommended,
    notes,
    selectedRateSource,
  });
};

const section = (id, title, description, availableItems, metadata = {}) => ({
  id,
  code: makeSectionCode(id),
  title,
  description,
  ...buildSectionMeta(id, title, description, metadata),
  availableItems,
});

function resolveStructureTypeFromCode(structureCode = '') {
  switch (structureCode) {
    case 'BLD':
      return STRUCTURE_TYPES.BUILDING;
    case 'ROD':
      return STRUCTURE_TYPES.ROAD;
    case 'BRG':
      return STRUCTURE_TYPES.BRIDGE;
    case 'DRN':
      return STRUCTURE_TYPES.DRAINAGE;
    case 'CUL':
      return STRUCTURE_TYPES.CULVERT;
    case 'SEA':
      return STRUCTURE_TYPES.COASTAL;
    case 'FDN':
      return STRUCTURE_TYPES.FOUNDATION;
    case 'WTR':
      return STRUCTURE_TYPES.WATER_UTILITY;
    default:
      return '';
  }
}

const catalogSection = (structureCode, id, title, description, items, metadata = {}) => (
  section(
    id,
    title,
    description,
    items.map((item, index) => {
      const structureType = item.structureType || resolveStructureTypeFromCode(structureCode);

      return ensureCatalogItemBenchmark({
        ...item,
        structureType,
        billSection: item.billSection || title,
        code: item.code || makeItemCode(structureCode, makeSectionCode(id), index),
      }, structureType);
    }),
    metadata
  )
);

const createPreliminariesItems = (structureCode, {
  includeTraffic = false,
  includeMarine = false,
  includeUtilityPermits = false,
} = {}) => {
  const items = [
    formulaRateItem({
      code: makeItemCode(structureCode, 'PREL', 0),
      name: 'Mobilization and demobilization',
      description: 'Mobilization and demobilization of labour, light plant, and site logistics.',
      unit: 'Sum',
      category: 'Mobilization',
      keywords: ['startup', 'logistics', 'site access'],
      pickerHint: 'Useful where plant, labour, logistics, and startup deployment need to be priced as a lump sum.',
      isRecommended: true,
      inputs: lumpSumInputs({
        mobilization: 850000,
        demobilization: 450000,
        logistics: 180000,
      }),
      formulaText: 'Lump sum = Mobilization + Demobilization + Logistics + Permits / Fees',
      formulaExpression: 'mobilization + demobilization + logistics + permits',
    }),
    formulaRateItem({
      code: makeItemCode(structureCode, 'PREL', 1),
      name: 'Site establishment',
      description: 'Site establishment, project signage, and startup administration.',
      unit: 'Sum',
      
      category: 'Site setup',
      keywords: ['startup', 'project signage', 'administration'],
      pickerHint: 'Use when the contract requires site setup, signage, and general startup administration.',
      isRecommended: true,
      inputs: buildRateInputs({ materials: 390000, labour: 97500, plant: 97500, transport: 32500, overhead: 32500 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({
      code: makeItemCode(structureCode, 'PREL', 2),
      name: 'Temporary site office',
      description: 'Temporary site office, furniture, welfare, and communications setup.',
      unit: 'Month',
      category: 'Temporary facilities',
      keywords: ['office', 'welfare', 'communications'],
      pickerHint: 'Best for projects that need a temporary office or welfare facilities priced by month.',
      inputs: monthInputs({
        rent: 240000,
        utilities: 95000,
        staffing: 70000,
        support: 45000,
      }),
      formulaText: 'Monthly rate = Rent / Accommodation + Utilities + Staffing + Support Costs',
      formulaExpression: 'rent + utilities + staffing + support',
    }),
    formulaRateItem({
      code: makeItemCode(structureCode, 'PREL', 3),
      name: 'Site fencing / hoarding',
      description: 'Temporary site fencing, hoarding, controlled access, and security gates.',
      unit: 'm',
      
      category: 'Site security',
      keywords: ['hoarding', 'security', 'gates'],
      pickerHint: 'Include when the site boundary, security gates, or hoarding need dedicated pricing.',
      inputs: buildRateInputs({ materials: 7500, labour: 1875, plant: 1875, transport: 625, overhead: 625 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({
      code: makeItemCode(structureCode, 'PREL', 4),
      name: 'HSE setup',
      description: 'Safety induction, PPE provision, first aid, and HSE administration.',
      unit: 'Month',
      category: 'HSE',
      keywords: ['safety', 'ppe', 'first aid'],
      pickerHint: 'Suitable for recurring health, safety, and environmental administration costs.',
      isRecommended: true,
      inputs: buildRateInputs({
        materials: 35000,
        labour: 45000,
        plant: 12000,
        transport: 8000,
        overhead: 10000,
      }),
    }),
    formulaRateItem({
      code: makeItemCode(structureCode, 'PREL', 5),
      name: 'Temporary utilities',
      description: 'Temporary water, power, sanitation, and internet support for the site team.',
      unit: 'Month',
      category: 'Temporary facilities',
      keywords: ['water', 'power', 'sanitation', 'internet'],
      pickerHint: 'Use for ongoing temporary utilities that support site operations month by month.',
      inputs: monthInputs({
        utilities: 160000,
        staffing: 20000,
        support: 40000,
      }),
      formulaText: 'Monthly rate = Utilities + Staffing + Support Costs',
      formulaExpression: 'utilities + staffing + support',
    }),
    formulaRateItem({
      code: makeItemCode(structureCode, 'PREL', 6),
      name: 'Supervision',
      description: 'Site engineer, supervisor, and HSE supervision allowance.',
      unit: 'Month',
      category: 'Site management',
      keywords: ['engineer', 'supervisor', 'hse officer'],
      pickerHint: 'Useful where site management staff are costed as monthly preliminaries.',
      isRecommended: true,
      inputs: [
        numericInput('siteEngineer', 'Site Engineer', 250000, '₦/month'),
        numericInput('siteSupervisor', 'Site Supervisor', 150000, '₦/month'),
        numericInput('hseOfficer', 'HSE Officer', 110000, '₦/month'),
      ],
      formulaText: 'Monthly supervision rate = Site Engineer + Site Supervisor + HSE Officer',
      formulaExpression: 'siteEngineer + siteSupervisor + hseOfficer',
    }),
    formulaRateItem({
      code: makeItemCode(structureCode, 'PREL', 7),
      name: 'Testing setup',
      description: 'QA/QC setup, test forms, and materials testing administration.',
      unit: 'Sum',
      
      category: 'Quality assurance',
      keywords: ['qa', 'qc', 'testing', 'laboratory'],
      pickerHint: 'Add when test setup, QA documentation, or laboratory administration is required.',
      inputs: buildRateInputs({ materials: 252000, labour: 63000, plant: 63000, transport: 21000, overhead: 21000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({
      code: makeItemCode(structureCode, 'PREL', 8),
      name: 'Environmental protection',
      description: 'Dust suppression, waste handling, and environmental protection measures.',
      unit: 'Month',
      
      category: 'Environmental',
      keywords: ['dust control', 'waste', 'mitigation'],
      pickerHint: 'Use where environmental mitigation measures must be carried as ongoing preliminaries.',
      inputs: buildRateInputs({ materials: 66000, labour: 16500, plant: 16500, transport: 5500, overhead: 5500 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({
      code: makeItemCode(structureCode, 'PREL', 9),
      name: 'Temporary works',
      description: 'Temporary supports, access arrangements, and enabling works for construction.',
      unit: 'Sum',
      
      category: 'Temporary works',
      keywords: ['supports', 'access', 'enabling works'],
      pickerHint: 'Appropriate when temporary supports, access decks, or enabling works need separate coverage.',
      inputs: buildRateInputs({ materials: 330000, labour: 82500, plant: 82500, transport: 27500, overhead: 27500 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({
      code: makeItemCode(structureCode, 'PREL', 10),
      name: 'Insurance / permits',
      description: 'Contractors all-risk insurance, permits, approvals, and statutory fees.',
      unit: 'Sum',
      
      category: 'Commercial and permits',
      keywords: ['insurance', 'statutory fees', 'approvals'],
      pickerHint: 'Add when insurance cover, permits, or approval fees are not absorbed elsewhere.',
      isRecommended: true,
      inputs: buildRateInputs({ materials: 468000, labour: 117000, plant: 117000, transport: 39000, overhead: 39000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ];

  if (includeTraffic) {
    items.push(
      formulaRateItem({
        code: makeItemCode(structureCode, 'PREL', 11),
        name: 'Traffic management',
        description: 'Temporary traffic control, diversions, flagmen, and road safety signage.',
        unit: 'Month',
        category: 'Traffic management',
        keywords: ['diversion', 'flagmen', 'road safety'],
        pickerHint: 'Especially relevant for road, bridge, culvert, marine access, and utility corridor works.',
        inputs: [
          numericInput('crew', 'Traffic Crew', 160000, '₦/month'),
          numericInput('devices', 'Traffic Devices', 90000, '₦/month'),
          numericInput('signs', 'Signage Maintenance', 45000, '₦/month'),
        ],
        formulaText: 'Monthly rate = Traffic Crew + Traffic Devices + Signage Maintenance',
        formulaExpression: 'crew + devices + signs',
      })
    );
  }

  if (includeMarine) {
    items.push(
      formulaRateItem({
        code: makeItemCode(structureCode, 'PREL', 12),
        name: 'Marine safety control',
        description: 'Navigation lights, marine exclusion zone markers, and safety boats.',
        unit: 'Month',
        
        category: 'Marine safety',
        keywords: ['navigation', 'safety boats', 'marine zone'],
        pickerHint: 'Use for coastal and marine works where navigation safety measures are contract requirements.',
      inputs: buildRateInputs({ materials: 252000, labour: 63000, plant: 63000, transport: 21000, overhead: 21000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    })
    );
  }

  if (includeUtilityPermits) {
    items.push(
      formulaRateItem({
        code: makeItemCode(structureCode, 'PREL', 13),
        name: 'Utility authority permits',
        description: 'Road opening permits, utility clearances, and service connection approvals.',
        unit: 'Sum',
        
        category: 'Commercial and permits',
        keywords: ['road opening', 'clearance', 'utility approval'],
        pickerHint: 'Important for water and utility projects that need authority permits and network approvals.',
      inputs: buildRateInputs({ materials: 372000, labour: 93000, plant: 93000, transport: 31000, overhead: 31000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    })
    );
  }

  return items;
};

const BUILDING_CODE = 'BLD';
const ROAD_CODE = 'ROD';
const BRIDGE_CODE = 'BRG';
const DRAINAGE_CODE = 'DRN';
const CULVERT_CODE = 'CUL';
const COASTAL_CODE = 'SEA';
const FOUNDATION_CODE = 'FDN';
const WATER_CODE = 'WTR';

const createRoadPreliminariesItems = (structureCode = ROAD_CODE) => {
  const roadPrelimCode = (index) => makeItemCode(structureCode, 'PREL', index);

  return [
    roadFormulaItem({
      code: roadPrelimCode(0),
      name: 'Site supervision',
      description: 'Provide the supervisory team, allowances, and support staff needed to run the road works throughout the contract period.',
      unit: 'Month',
      category: 'Supervision and records',
      keywords: ['supervision', 'site engineer', 'foreman', 'supervisory staff'],
      pickerHint: 'Use for the monthly site engineer, foremen, and supervision support cost for the road project.',
      isRecommended: true,
      components: [
        { id: 'supervisory_staff', label: 'Supervisory staff', defaultValue: 460000 },
        { id: 'allowances', label: 'Allowances', defaultValue: 115000 },
        { id: 'support_staff', label: 'Support staff', defaultValue: 90000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 90000 },
      ],
      formulaBasis: [
        'Supervisory staff cost',
        'Allowances',
        'Support staff where applicable',
        'Project duration basis',
        'Overhead and profit',
      ],
      benchmarkRate: 755000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(1),
      name: 'Programme of works',
      description: 'Prepare, circulate, and maintain the project programme, method-linked schedule, and update records for the road works.',
      unit: 'Sum',
      category: 'Supervision and records',
      keywords: ['programme', 'schedule', 'method statement', 'planning'],
      pickerHint: 'Add when the contract requires a formal programme, circulation copies, and maintained schedule updates.',
      isRecommended: true,
      components: [
        { id: 'paperwork', label: 'Paperwork', defaultValue: 45000 },
        { id: 'expert_time', label: 'Expert time preparing programme', defaultValue: 125000 },
        { id: 'circulation', label: 'Mounting / circulation / maintenance', defaultValue: 35000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 40000 },
      ],
      formulaBasis: [
        'Paperwork',
        'Expert time preparing programme',
        'Mounting / circulation / maintenance',
        'Overhead and profit',
      ],
      benchmarkRate: 245000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(2),
      name: 'Setting out of the works',
      description: 'Set out the road alignment, levels, reference pegs, and control points required to establish the permanent works on site.',
      unit: 'Sum',
      category: 'Supervision and records',
      keywords: ['setting out', 'theodolite', 'level', 'control points'],
      pickerHint: 'Useful for the initial site establishment of road centreline, levels, templates, and permanent reference control.',
      isRecommended: true,
      components: [
        { id: 'pegs_templates_lines', label: 'Pegs / templates / lines', defaultValue: 85000 },
        { id: 'survey_instruments', label: 'Theodolite / level / instruments', defaultValue: 140000 },
        { id: 'equipment_logistics', label: 'Equipment to and from site', defaultValue: 40000 },
        { id: 'survey_team', label: 'Site engineer and assisting team time', defaultValue: 150000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 55000 },
      ],
      formulaBasis: [
        'Pegs, templates, lines',
        'Theodolite / level / instruments',
        'Bringing equipment to site and removing it',
        'Site engineer and assisting team time',
        'Overhead and profit',
      ],
      benchmarkRate: 470000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(3),
      name: 'Daily records',
      description: 'Maintain daily site records, weather logs, labour and plant returns, and routine reporting for the road works.',
      unit: 'Month',
      category: 'Supervision and records',
      keywords: ['daily records', 'site diary', 'returns', 'reporting'],
      pickerHint: 'Add when the project requires daily diaries, returns, registers, and routine reporting support.',
      components: [
        { id: 'records_staff', label: 'Records staff time', defaultValue: 85000 },
        { id: 'stationery', label: 'Stationery and registers', defaultValue: 18000 },
        { id: 'reporting_support', label: 'Reporting support', defaultValue: 22000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 30000 },
      ],
      formulaBasis: [
        'Record clerks or site administration labour',
        'Stationery, registers, and digital reporting tools',
        'Photo and reporting support where applicable',
        'Overhead and profit',
      ],
      benchmarkRate: 155000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(4),
      name: 'Temporary access road',
      description: 'Provide and maintain temporary access roads, haul entry points, and associated reinstatement needed to execute the road works.',
      unit: 'Sum',
      category: 'Temporary access and traffic',
      keywords: ['access road', 'temporary road', 'haul route'],
      pickerHint: 'Use where the road project needs temporary access for construction traffic before the permanent layers are completed.',
      isRecommended: true,
      components: [
        { id: 'clearing_plant', label: 'Clearing labour and plant', defaultValue: 220000 },
        { id: 'road_forming', label: 'Labour and materials for forming road', defaultValue: 680000 },
        { id: 'maintenance_make_good_adjacent', label: 'Maintenance and making good adjacent permanent roads', defaultValue: 260000 },
        { id: 'clear_away_restore', label: 'Clear away temporary road and restore disturbed ground', defaultValue: 160000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 130000 },
      ],
      formulaBasis: [
        'Labour and plant for clearing',
        'Labour and materials for forming the road',
        'Maintenance of the temporary road and making good adjacent permanent roads',
        'Clearing away the temporary road at completion and making good disturbed ground',
        'Overhead and profit',
      ],
      benchmarkRate: 1450000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(5),
      name: 'Hoarding and barriers',
      description: 'Provide temporary hoarding, barriers, and separation measures needed to secure working areas and protect the public around the road works.',
      unit: 'Sum',
      category: 'Temporary access and traffic',
      keywords: ['hoarding', 'barriers', 'site separation', 'public protection'],
      pickerHint: 'Useful on urban road projects, junction works, and built-up corridors where screening or physical barriers are needed.',
      components: [
        { id: 'labour_materials', label: 'Labour and materials', defaultValue: 520000 },
        { id: 'maintenance', label: 'Maintenance', defaultValue: 170000 },
        { id: 'removal_make_good', label: 'Removal and making good', defaultValue: 95000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 85000 },
      ],
      formulaBasis: [
        'Labour and materials',
        'Maintenance',
        'Removal and making good',
        'Overhead and profit',
      ],
      benchmarkRate: 870000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(6),
      name: 'Temporary fencing and gates',
      description: 'Provide temporary fencing, access gates, and ongoing upkeep for road work compounds, yards, or controlled work zones.',
      unit: 'Sum',
      category: 'Temporary access and traffic',
      keywords: ['temporary fencing', 'gates', 'compound security'],
      pickerHint: 'Add where the road job needs fenced work zones, material yards, or controlled equipment access.',
      components: [
        { id: 'fence_gates', label: 'Labour and materials for fence and gates', defaultValue: 620000 },
        { id: 'maintenance', label: 'Maintenance', defaultValue: 180000 },
        { id: 'removal_make_good', label: 'Removal and making good on completion', defaultValue: 120000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 95000 },
      ],
      formulaBasis: [
        'Labour and materials for fence and gates',
        'Maintenance',
        'Removal and making good on completion',
        'Overhead and profit',
      ],
      benchmarkRate: 1015000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(7),
      name: 'Traffic management / diversion',
      description: 'Provide traffic marshals, signs, barriers, and diversion control needed to keep road users moving safely during construction.',
      unit: 'Month',
      category: 'Temporary access and traffic',
      keywords: ['traffic management', 'diversion', 'flagmen', 'signage'],
      pickerHint: 'Usually needed where live traffic must pass through or around the road works during construction.',
      isRecommended: true,
      components: [
        { id: 'traffic_marshals', label: 'Traffic marshals and signage', defaultValue: 520000 },
        { id: 'diversion_setup', label: 'Diversion setup materials and barriers', defaultValue: 280000 },
        { id: 'maintenance', label: 'Maintenance of diversion routes and signs', defaultValue: 210000 },
        { id: 'liaison', label: 'Authority liaison and permits', defaultValue: 80000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 140000 },
      ],
      formulaBasis: [
        'Traffic marshals and signage',
        'Diversion setup materials and barriers',
        'Maintenance of diversion routes and signs',
        'Liaison with road authorities where applicable',
        'Overhead and profit',
      ],
      benchmarkRate: 1230000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(8),
      name: 'Haul road maintenance',
      description: 'Maintain temporary haul roads and working routes used by construction traffic, including reshaping, patching, and wetting as needed.',
      unit: 'Month',
      category: 'Temporary access and traffic',
      keywords: ['haul road', 'maintenance', 'grader', 'working route'],
      pickerHint: 'Use when borrow pit, quarry, or site haul routes need continuous maintenance during the road works.',
      components: [
        { id: 'plant_time', label: 'Grader / water bowser / plant time', defaultValue: 280000 },
        { id: 'repair_materials', label: 'Laterite / gravel / repair materials', defaultValue: 170000 },
        { id: 'repair_labour', label: 'Routine reshaping and pothole repairs', defaultValue: 120000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 70000 },
      ],
      formulaBasis: [
        'Grader / water bowser / plant time',
        'Laterite, gravel, or repair materials',
        'Labour for routine reshaping and pothole repairs',
        'Overhead and profit',
      ],
      benchmarkRate: 640000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(9),
      name: 'Dust suppression',
      description: 'Control dust along haul routes and active roadwork areas through watering and related environmental compliance measures.',
      unit: 'Month',
      category: 'Temporary access and traffic',
      keywords: ['dust suppression', 'water bowser', 'environment', 'watering'],
      pickerHint: 'Important on dry corridor works, borrow routes, and built-up areas where nuisance dust must be controlled.',
      components: [
        { id: 'bowser', label: 'Water bowser or tanker hire', defaultValue: 190000 },
        { id: 'water_supply', label: 'Water supply and application labour', defaultValue: 140000 },
        { id: 'monitoring', label: 'Environmental compliance monitoring', defaultValue: 65000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 45000 },
      ],
      formulaBasis: [
        'Water bowser or tanker hire',
        'Water supply and application labour',
        'Environmental compliance monitoring',
        'Overhead and profit',
      ],
      benchmarkRate: 440000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(10),
      name: 'Survey control and chainage setting out',
      description: 'Establish and maintain survey control, benchmarks, and chainage reference points needed to measure and build the road accurately.',
      unit: 'Sum',
      category: 'Supervision and records',
      keywords: ['survey control', 'chainage', 'benchmarks', 'centreline'],
      pickerHint: 'Add where the road job needs detailed survey control, chainage referencing, and re-establishment of disturbed pegs.',
      isRecommended: true,
      components: [
        { id: 'control_markers', label: 'Control markers / pegs / nails', defaultValue: 95000 },
        { id: 'survey_equipment', label: 'Survey instruments and accessories', defaultValue: 175000 },
        { id: 'survey_crew', label: 'Survey crew time', defaultValue: 210000 },
        { id: 'maintenance', label: 'Maintenance of control points', defaultValue: 70000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 60000 },
      ],
      formulaBasis: [
        'Survey control monuments, pegs, nails, and markers',
        'Total station / level instruments and accessories',
        'Survey crew time for control transfer and chainage setting out',
        'Maintenance and re-establishment of disturbed control points',
        'Overhead and profit',
      ],
      benchmarkRate: 610000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(11),
      name: 'Site meetings',
      description: 'Provide routine site meeting arrangements, attendance support, and meeting logistics for the road project team.',
      unit: 'Month',
      category: 'Temporary facilities',
      keywords: ['site meetings', 'refreshments', 'attendance'],
      pickerHint: 'Use where regular site meetings, employer meetings, or progress reviews are a contractual preliminaries obligation.',
      components: [
        { id: 'refreshments', label: 'Refreshments', defaultValue: 45000 },
        { id: 'attendant_cost', label: 'Attendant cost', defaultValue: 38000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 22000 },
      ],
      formulaBasis: [
        'Refreshments',
        'Attendant cost',
        'Overhead and profit',
      ],
      benchmarkRate: 105000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(12),
      name: 'Temporary stores',
      description: 'Provide temporary stores for cement, fittings, consumables, and small plant together with lighting and upkeep.',
      unit: 'Month',
      category: 'Temporary facilities',
      keywords: ['temporary stores', 'storage', 'lighting installation'],
      pickerHint: 'Useful where the road job needs protected storage for bagged materials, tools, spare parts, or traffic devices.',
      components: [
        { id: 'construction', label: 'Construction labour and materials', defaultValue: 160000 },
        { id: 'lighting', label: 'Lighting installation', defaultValue: 40000 },
        { id: 'maintenance', label: 'Maintenance including electricity bills', defaultValue: 120000 },
        { id: 'removal_make_good', label: 'Removal and making good', defaultValue: 50000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 45000 },
      ],
      formulaBasis: [
        'Construction labour and materials',
        'Lighting installation',
        'Maintenance including electricity bills',
        'Removal and making good',
        'Overhead and profit',
      ],
      benchmarkRate: 415000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(13),
      name: 'Site offices',
      description: 'Provide temporary offices, furnishing, cooling, electrical installation, and maintenance for the project management team.',
      unit: 'Month',
      category: 'Temporary facilities',
      keywords: ['site office', 'cabins', 'furniture', 'air conditioning'],
      pickerHint: 'Use for road projects that need cabins or built temporary offices for consultants, employer staff, or the contractor team.',
      isRecommended: true,
      components: [
        { id: 'cabins', label: 'Temporary cabins or constructed offices', defaultValue: 360000 },
        { id: 'furniture', label: 'Furniture', defaultValue: 110000 },
        { id: 'cooling', label: 'Fans / air conditioning', defaultValue: 95000 },
        { id: 'electrical', label: 'Electrical installation', defaultValue: 75000 },
        { id: 'maintenance', label: 'Maintenance', defaultValue: 170000 },
        { id: 'removal_make_good', label: 'Removal and making good', defaultValue: 65000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 105000 },
      ],
      formulaBasis: [
        'Temporary cabins or constructed offices',
        'Furniture',
        'Fans / air conditioning',
        'Electrical installation',
        'Maintenance',
        'Removal and making good',
        'Overhead and profit',
      ],
      benchmarkRate: 980000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(14),
      name: 'Telephone / communication',
      description: 'Provide communication facilities, radios, phone lines, data service, and related support for the road project team.',
      unit: 'Month',
      category: 'Temporary facilities',
      keywords: ['telephone', 'communication', 'radios', 'data service'],
      pickerHint: 'Add when dedicated phones, radios, data subscriptions, or communications support are priced as preliminaries.',
      components: [
        { id: 'devices', label: 'Phones / radios / accessories', defaultValue: 35000 },
        { id: 'service', label: 'Airtime / data / service charges', defaultValue: 45000 },
        { id: 'maintenance', label: 'Maintenance and charging support', defaultValue: 18000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 17000 },
      ],
      formulaBasis: [
        'Phones, radios, data service, and charging accessories',
        'Monthly airtime / data and maintenance',
        'Overhead and profit',
      ],
      benchmarkRate: 115000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(15),
      name: 'Shelter for workmen',
      description: 'Provide shelter, seating, lockers, and basic serviced welfare space for workmen on the road project.',
      unit: 'Month',
      category: 'Welfare and safety',
      keywords: ['shelter for workmen', 'welfare', 'lockers', 'benches'],
      pickerHint: 'Use where labour shelters and welfare accommodation are priced separately from the site office.',
      components: [
        { id: 'shed', label: 'Shed construction', defaultValue: 145000 },
        { id: 'electrical', label: 'Electricity installation', defaultValue: 28000 },
        { id: 'plumbing', label: 'Plumbing installation', defaultValue: 26000 },
        { id: 'fittings', label: 'Lockers and benches', defaultValue: 52000 },
        { id: 'maintenance', label: 'Maintenance', defaultValue: 90000 },
        { id: 'removal_make_good', label: 'Removal and making good', defaultValue: 28000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 36000 },
      ],
      formulaBasis: [
        'Shed construction',
        'Electricity installation',
        'Plumbing installation',
        'Lockers and benches',
        'Maintenance',
        'Removal and making good',
        'Overhead and profit',
      ],
      benchmarkRate: 405000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(16),
      name: 'Temporary latrine',
      description: 'Provide temporary toilet facilities and maintain them in hygienic working order for site operatives and visitors.',
      unit: 'Month',
      category: 'Welfare and safety',
      keywords: ['latrine', 'toilet', 'welfare', 'sanitation'],
      pickerHint: 'Useful when welfare sanitation is measured explicitly as a road preliminaries item.',
      components: [
        { id: 'facility', label: 'Pit / septic / removable / closet system', defaultValue: 95000 },
        { id: 'maintenance', label: 'Maintenance', defaultValue: 70000 },
        { id: 'removal_make_good', label: 'Removal and making good', defaultValue: 30000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 25000 },
      ],
      formulaBasis: [
        'Pit latrine / septic / removable system / closet system',
        'Maintenance',
        'Removal and making good',
        'Overhead and profit',
      ],
      benchmarkRate: 220000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(17),
      name: 'Watching / security',
      description: 'Provide site security arrangements, watchmen coverage, and protection for plant, materials, and the works.',
      unit: 'Month',
      category: 'Welfare and safety',
      keywords: ['security', 'watching', 'watchmen', 'security hut'],
      pickerHint: 'Add where the road site, store, or traffic equipment yard requires dedicated site security and guarding.',
      isRecommended: true,
      components: [
        { id: 'security_hut', label: 'Security hut erection', defaultValue: 45000 },
        { id: 'furniture', label: 'Furniture', defaultValue: 25000 },
        { id: 'maintenance', label: 'Maintenance', defaultValue: 45000 },
        { id: 'watchmen', label: 'Watchmen salaries', defaultValue: 180000 },
        { id: 'dogs', label: 'Watchdog hire if needed', defaultValue: 20000 },
        { id: 'removal_make_good', label: 'Removal and making good', defaultValue: 15000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 35000 },
      ],
      formulaBasis: [
        'Security hut erection',
        'Furniture',
        'Maintenance',
        'Watchmen salaries',
        'Watchdog hire if needed',
        'Removal and making good',
        'Overhead and profit',
      ],
      benchmarkRate: 365000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(18),
      name: 'First aid',
      description: 'Provide and maintain the first-aid arrangement, consumables, and attendant support required on the road project.',
      unit: 'Month',
      category: 'Welfare and safety',
      keywords: ['first aid', 'medicine', 'attendant', 'medical'],
      pickerHint: 'Use where first-aid box, consumables, and a nominated attendant are priced within preliminaries.',
      isRecommended: true,
      components: [
        { id: 'box', label: 'First aid box', defaultValue: 12000 },
        { id: 'medicine', label: 'Medicine', defaultValue: 22000 },
        { id: 'attendant', label: 'Attendant', defaultValue: 32000 },
        { id: 'maintenance', label: 'Maintenance', defaultValue: 14000 },
        { id: 'removal', label: 'Removal', defaultValue: 5000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 10000 },
      ],
      formulaBasis: [
        'First aid box',
        'Medicine',
        'Attendant',
        'Maintenance',
        'Removal',
        'Overhead and profit',
      ],
      benchmarkRate: 95000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(19),
      name: 'Temporary electric power and lighting',
      description: 'Provide temporary power generation or supply, site lighting, wiring, and related running costs for the road works.',
      unit: 'Month',
      category: 'Utilities and temporary services',
      keywords: ['temporary power', 'lighting', 'generator', 'wiring'],
      pickerHint: 'Use where the road site needs generators, temporary lighting, or supplied power for offices, stores, or night work.',
      isRecommended: true,
      components: [
        { id: 'supply', label: 'Generator hire or electricity supply', defaultValue: 170000 },
        { id: 'wiring', label: 'Cables / wiring / fittings', defaultValue: 65000 },
        { id: 'running', label: 'Electricity bills or generator fueling', defaultValue: 140000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 45000 },
      ],
      formulaBasis: [
        'Generator hire or electricity supply',
        'Cables / wiring / fittings',
        'Electricity bills or generator fueling',
        'Overhead and profit',
      ],
      benchmarkRate: 420000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(20),
      name: 'Water for the works',
      description: 'Provide water supply, temporary storage, and distribution needed for compaction, dust control, welfare, and general road construction use.',
      unit: 'Sum',
      category: 'Utilities and temporary services',
      keywords: ['water for the works', 'storage tank', 'temporary plumbing', 'water supply'],
      pickerHint: 'Use where water supply is difficult to measure exactly and is better priced as a preliminaries allowance or lump sum.',
      isRecommended: true,
      components: [
        { id: 'water_supply', label: 'Water supply cost', defaultValue: 95000 },
        { id: 'plumbing_storage', label: 'Temporary plumbing / storage', defaultValue: 65000 },
        { id: 'allowance', label: 'Allowance where exact measurement is difficult', defaultValue: 70000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 30000 },
      ],
      formulaBasis: [
        'Water supply cost',
        'Temporary plumbing / storage where needed',
        'Use percentage or lump sum basis where exact measurement is difficult',
        'Allow benchmark note that older document example used about 1/8% of main works cost plus temporary plumbing before OHP',
      ],
      benchmarkRate: 260000,
      notes: 'Seed benchmark only. Replace with project-specific water strategy or a percentage-based allowance tied to the main works value where appropriate.',
    }),
    roadFormulaItem({
      code: roadPrelimCode(21),
      name: 'Temporary drainage during construction',
      description: 'Provide temporary drains, pumping, and protection works needed to keep the road excavation and formation dry during construction.',
      unit: 'Sum',
      category: 'Utilities and temporary services',
      keywords: ['temporary drainage', 'dewatering', 'construction drainage', 'pumps'],
      pickerHint: 'Useful where seasonal runoff, groundwater, or diverted flow must be managed while the permanent drainage is incomplete.',
      isRecommended: true,
      components: [
        { id: 'channels_pumps', label: 'Temporary drains / channels / pumps / hoses', defaultValue: 210000 },
        { id: 'dry_working', label: 'Labour and plant for keeping works dry', defaultValue: 180000 },
        { id: 'maintenance', label: 'Maintenance and desilting', defaultValue: 120000 },
        { id: 'removal_make_good', label: 'Removal and making good', defaultValue: 65000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 70000 },
      ],
      formulaBasis: [
        'Temporary drains, channels, pumps, and hoses',
        'Labour and plant for keeping the works dry',
        'Maintenance and desilting during the construction period',
        'Removal and making good on completion',
        'Overhead and profit',
      ],
      benchmarkRate: 645000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(22),
      name: 'Plant and tools',
      description: 'Provide small plant, hand tools, and site consumables that support the road works but are not measured elsewhere in the production bills.',
      unit: 'Month',
      category: 'Plant and logistics',
      keywords: ['plant and tools', 'small plant', 'hand tools', 'consumables'],
      pickerHint: 'Use for shared small plant and tools that support the job generally rather than a specific measured production item.',
      components: [
        { id: 'plant_hire', label: 'Small plant hire or ownership charges', defaultValue: 360000 },
        { id: 'tools', label: 'Tools / consumables / maintenance', defaultValue: 220000 },
        { id: 'attendant', label: 'Operator / attendant allowances', defaultValue: 120000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 70000 },
      ],
      formulaBasis: [
        'Small plant hire or ownership charges',
        'Tools, consumables, and maintenance',
        'Operator / attendant allowances where applicable',
        'Overhead and profit',
      ],
      benchmarkRate: 770000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(23),
      name: 'Vehicle for the project',
      description: 'Provide project vehicles for supervision, logistics, inspection, and general administration of the road works.',
      unit: 'Month',
      category: 'Plant and logistics',
      keywords: ['vehicle', 'pickup', 'project logistics', 'transport'],
      pickerHint: 'Add where dedicated site vehicles are not already covered in site supervision or general overhead.',
      components: [
        { id: 'vehicle', label: 'Vehicle hire or ownership charges', defaultValue: 260000 },
        { id: 'driver_fuel', label: 'Driver and fuel', defaultValue: 180000 },
        { id: 'maintenance', label: 'Routine servicing and maintenance', defaultValue: 70000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 50000 },
      ],
      formulaBasis: [
        'Vehicle hire or ownership charges',
        'Driver and fuel',
        'Routine servicing and maintenance',
        'Overhead and profit',
      ],
      benchmarkRate: 560000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(24),
      name: 'Insurance',
      description: 'Provide the insurances and renewals required to cover the road project, plant, and third-party liabilities.',
      unit: 'Sum',
      category: 'Commercial and compliance',
      keywords: ['insurance', 'contractors all risk', 'third party', 'premium'],
      pickerHint: 'Use when insurance is priced as a dedicated preliminaries allowance rather than absorbed into general overhead.',
      isRecommended: true,
      components: [
        { id: 'premium', label: 'Contractors all-risk premium', defaultValue: 420000 },
        { id: 'third_party', label: 'Third-party and plant cover', defaultValue: 200000 },
        { id: 'admin', label: 'Policy administration and renewals', defaultValue: 70000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 55000 },
      ],
      formulaBasis: [
        'Contractors all-risk premium and endorsements',
        'Third-party and plant cover where applicable',
        'Policy administration and renewals',
        'Overhead and profit',
      ],
      benchmarkRate: 745000,
      notes: 'Seed benchmark only. Update with insurer quotations or project-specific policy rates before tender issue.',
    }),
    roadFormulaItem({
      code: roadPrelimCode(25),
      name: "Employer's signboard",
      description: 'Provide, erect, maintain, and remove the employer or project signboard required at the road site.',
      unit: 'Nr',
      category: 'Commercial and compliance',
      keywords: ['signboard', 'project sign', 'employer signboard'],
      pickerHint: 'Add when the contract requires a branded project signboard or roadside display board.',
      components: [
        { id: 'fabrication', label: 'Labour and materials for fabrication and erection', defaultValue: 42000 },
        { id: 'branding', label: 'Branding / lettering', defaultValue: 18000 },
        { id: 'maintenance', label: 'Maintenance', defaultValue: 10000 },
        { id: 'removal_make_good', label: 'Removal and making good', defaultValue: 9000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 12000 },
      ],
      formulaBasis: [
        'Labour and materials for fabrication and erection',
        'Branding / lettering',
        'Maintenance',
        'Removal and making good',
        'Overhead and profit',
      ],
      benchmarkRate: 91000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(26),
      name: 'Transport for workmen',
      description: 'Provide labour transport or transport allowance for workmen moving to and from the road construction site.',
      unit: 'Month',
      category: 'Plant and logistics',
      keywords: ['transport for workmen', 'bus hire', 'labour transport'],
      pickerHint: 'Useful on out-of-town sites or long corridors where labour transport is not part of direct unit rates.',
      components: [
        { id: 'vehicle_hire', label: 'Bus / pickup hire or transport allowance', defaultValue: 130000 },
        { id: 'driver_fuel', label: 'Driver and fuel', defaultValue: 80000 },
        { id: 'coordination', label: 'Routine maintenance and coordination', defaultValue: 40000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 25000 },
      ],
      formulaBasis: [
        'Bus / pickup hire or transport allowance',
        'Driver and fuel',
        'Routine maintenance and coordination',
        'Overhead and profit',
      ],
      benchmarkRate: 275000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(27),
      name: 'Progress photograph',
      description: 'Provide progress photography and periodic visual reporting for the road project record.',
      unit: 'Month',
      category: 'Supervision and records',
      keywords: ['progress photograph', 'photos', 'reporting'],
      pickerHint: 'Add when the employer or consultant requires periodic progress photography or documented visual reports.',
      components: [
        { id: 'capture', label: 'Photographer or camera handling time', defaultValue: 35000 },
        { id: 'processing', label: 'Printing / digital processing / submission', defaultValue: 22000 },
        { id: 'archiving', label: 'Archiving and reporting', defaultValue: 18000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 15000 },
      ],
      formulaBasis: [
        'Photographer or camera handling time',
        'Printing / digital processing and submission',
        'Archiving and reporting',
        'Overhead and profit',
      ],
      benchmarkRate: 90000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(28),
      name: 'Removal of rubbish',
      description: 'Remove accumulated rubbish, sweep working areas, and dispose of site waste generated during the road works.',
      unit: 'Month',
      category: 'Commercial and compliance',
      keywords: ['rubbish', 'waste removal', 'site cleaning', 'disposal'],
      pickerHint: 'Use where waste collection and routine site cleaning are priced as preliminaries rather than included in production items.',
      components: [
        { id: 'collection', label: 'Labour for collection and loading', defaultValue: 50000 },
        { id: 'haulage', label: 'Haulage and tipping charges', defaultValue: 55000 },
        { id: 'cleaning', label: 'Ongoing cleaning and maintenance of working areas', defaultValue: 35000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 20000 },
      ],
      formulaBasis: [
        'Labour for collection and loading',
        'Haulage and tipping charges',
        'Ongoing cleaning and maintenance of working areas',
        'Overhead and profit',
      ],
      benchmarkRate: 160000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(29),
      name: 'Works protection from damage',
      description: 'Protect the road works, stored materials, and completed elements from damage during the construction period.',
      unit: 'Sum',
      category: 'Commercial and compliance',
      keywords: ['works protection', 'damage', 'temporary coverings', 'protection'],
      pickerHint: 'Add when sections of completed work or sensitive installations need explicit protection during ongoing construction.',
      components: [
        { id: 'coverings', label: 'Temporary coverings / barriers / edge protection', defaultValue: 120000 },
        { id: 'watching', label: 'Watching and maintenance of protected areas', defaultValue: 90000 },
        { id: 'making_good', label: 'Making good damage attributable to site operations', defaultValue: 110000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 45000 },
      ],
      formulaBasis: [
        'Temporary coverings, barriers, and edge protections',
        'Watching and maintenance of protected areas',
        'Making good damage attributable to site operations',
        'Overhead and profit',
      ],
      benchmarkRate: 365000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(30),
      name: 'Environmental protection measures',
      description: 'Provide environmental control, spill response, silt control, and general compliance measures needed during the road works.',
      unit: 'Sum',
      category: 'Commercial and compliance',
      keywords: ['environmental protection', 'spill kit', 'silt control', 'compliance'],
      pickerHint: 'Useful where the road project needs erosion control, environmental signage, spill response, or monitoring obligations.',
      isRecommended: true,
      components: [
        { id: 'controls', label: 'Silt control / spill kits / environmental signage', defaultValue: 160000 },
        { id: 'monitoring', label: 'Monitoring and housekeeping labour', defaultValue: 130000 },
        { id: 'reinstatement', label: 'Temporary reinstatement and protection materials', defaultValue: 150000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 60000 },
      ],
      formulaBasis: [
        'Silt control, spill kits, and environmental signage',
        'Labour for monitoring and housekeeping',
        'Temporary reinstatement and protection materials',
        'Overhead and profit',
      ],
      benchmarkRate: 500000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(31),
      name: 'Health and safety setup',
      description: 'Provide the road project HSE setup, including safety signage, fire points, induction materials, PPE startup stock, and routine safety supervision support.',
      unit: 'Month',
      category: 'Welfare and safety',
      keywords: ['health and safety', 'hse', 'ppe', 'fire extinguisher', 'induction'],
      pickerHint: 'Use where the contract treats HSE setup and ongoing site safety compliance as a dedicated road preliminaries allowance.',
      isRecommended: true,
      components: [
        { id: 'ppe_startup', label: 'PPE startup and replenishment allowance', defaultValue: 85000 },
        { id: 'signage_fire_points', label: 'Safety signage and fire point equipment', defaultValue: 65000 },
        { id: 'inductions_toolbox', label: 'Inductions, toolbox talks, and records', defaultValue: 42000 },
        { id: 'hse_supervision', label: 'HSE supervision and inspection support', defaultValue: 118000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 40000 },
      ],
      formulaBasis: [
        'PPE startup stock and replenishment allowance',
        'Safety signage, barriers, extinguishers, and fire points',
        'Induction materials, toolbox talks, and HSE records',
        'Routine HSE supervision, inspection, and compliance support',
        'Overhead and profit',
      ],
      benchmarkRate: 350000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(32),
      name: 'PPE and safety gear replenishment',
      description: 'Provide recurring replenishment of helmets, vests, gloves, boots, masks, and other safety gear consumed during the road works.',
      unit: 'Month',
      category: 'Welfare and safety',
      keywords: ['ppe', 'safety gear', 'helmets', 'vests', 'gloves', 'boots'],
      pickerHint: 'Useful where PPE replacement is costed separately from the general HSE setup, especially on long-duration or labour-intensive road projects.',
      components: [
        { id: 'helmets_vests', label: 'Helmets, vests, and visibility wear', defaultValue: 52000 },
        { id: 'boots_gloves', label: 'Boots, gloves, and hand protection', defaultValue: 47000 },
        { id: 'masks_misc', label: 'Dust masks, goggles, and misc. safety gear', defaultValue: 26000 },
        { id: 'distribution_records', label: 'Distribution control and replacement records', defaultValue: 18000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 22000 },
      ],
      formulaBasis: [
        'Helmets, vests, and high-visibility clothing',
        'Boots, gloves, and hand protection items',
        'Dust masks, goggles, and miscellaneous safety gear',
        'Distribution, replacement tracking, and administration',
        'Overhead and profit',
      ],
      benchmarkRate: 165000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(33),
      name: 'Medical screening and health surveillance',
      description: 'Provide workforce medical screening, health surveillance, and related documentation required for safe execution of the road works.',
      unit: 'Sum',
      category: 'Welfare and safety',
      keywords: ['medical screening', 'health surveillance', 'medicals', 'occupational health'],
      pickerHint: 'Add where pre-employment medicals, periodic health checks, or occupational health surveillance are explicit contract obligations.',
      components: [
        { id: 'preemployment_medicals', label: 'Pre-employment and baseline medical checks', defaultValue: 95000 },
        { id: 'periodic_checks', label: 'Periodic health checks and surveillance', defaultValue: 75000 },
        { id: 'records_reporting', label: 'Medical records, reporting, and referrals', defaultValue: 30000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 25000 },
      ],
      formulaBasis: [
        'Pre-employment and baseline medical checks',
        'Periodic health checks, surveillance, and follow-up',
        'Documentation, records, and medical reporting',
        'Overhead and profit',
      ],
      benchmarkRate: 225000,
    }),
    roadFormulaItem({
      code: roadPrelimCode(34),
      name: 'Emergency response / clinic support',
      description: 'Provide emergency medical response support, clinic retainer or ambulance standby, and incident-response logistics for the road project.',
      unit: 'Month',
      category: 'Welfare and safety',
      keywords: ['emergency response', 'clinic', 'ambulance', 'incident response', 'medical standby'],
      pickerHint: 'Useful on remote roads, high-risk earthworks, and traffic-exposed sites where emergency response support is priced separately from first aid.',
      components: [
        { id: 'clinic_retainer', label: 'Clinic retainer or ambulance standby', defaultValue: 120000 },
        { id: 'emergency_consumables', label: 'Emergency consumables and response kits', defaultValue: 35000 },
        { id: 'responders', label: 'Trained responders and standby allowance', defaultValue: 65000 },
        { id: 'incident_logistics', label: 'Fuel, communications, and incident logistics', defaultValue: 38000 },
        { id: 'ohp', label: 'Overhead and profit', defaultValue: 32000 },
      ],
      formulaBasis: [
        'Clinic retainer or ambulance standby arrangement',
        'Emergency consumables, stretchers, and response kits',
        'Trained responders, standby allowance, and drills',
        'Fuel, communications, and incident-response logistics',
        'Overhead and profit',
      ],
      benchmarkRate: 290000,
    }),
  ];
};

const ROAD_SITE_CLEARANCE_BENCHMARK_NOTE = 'Initial placeholder benchmark for BOQ catalog';
const ROAD_SITE_CLEARANCE_BENCHMARK_DATE = '2026-04';

const roadSiteClearanceItem = ({
  code,
  name,
  description,
  unit,
  category,
  keywords = [],
  pickerHint = '',
  isRecommended = false,
  components = [],
  formulaText = '',
  formulaBasis = [],
  formulaExpression = '',
  benchmarkRate,
  notes = '',
}) => roadFormulaItem({
  code,
  name,
  description,
  unit,
  billSection: 'Site Clearance & Demolition',
  category,
  keywords,
  pickerHint,
  isRecommended,
  components,
  formulaText,
  formulaBasis,
  formulaExpression,
  benchmarkRate,
  benchmarkNote: ROAD_SITE_CLEARANCE_BENCHMARK_NOTE,
  benchmarkDateCaptured: ROAD_SITE_CLEARANCE_BENCHMARK_DATE,
  notes,
});

const createRoadSiteClearanceDemolitionItems = (structureCode = ROAD_CODE) => {
  const roadSiteCode = (index) => makeItemCode(structureCode, 'SCD', index);

  return [
    roadSiteClearanceItem({
      code: roadSiteCode(0),
      name: 'Site clearing and grubbing',
      description: 'Clear the roadway corridor of vegetation, debris, and surface obstructions including grubbing out roots within the construction footprint.',
      unit: 'm²',
      category: 'Clearing and stripping',
      keywords: ['clearing', 'grubbing', 'right of way', 'surface vegetation'],
      pickerHint: 'Use for broad right-of-way clearing where vegetation, shrubs, roots, and loose debris are removed before earthworks.',
      isRecommended: true,
      components: [
        { id: 'labour', label: 'Labour', defaultValue: 380000, unit: 'NGN' },
        { id: 'plant', label: 'Plant', defaultValue: 650000, unit: 'NGN' },
        { id: 'loading', label: 'Loading', defaultValue: 210000, unit: 'NGN' },
        { id: 'haulage', label: 'Haulage', defaultValue: 420000, unit: 'NGN' },
        { id: 'disposal', label: 'Disposal', defaultValue: 260000, unit: 'NGN' },
        { id: 'ohp', label: 'OHP', defaultValue: 290000, unit: 'NGN' },
        { id: 'area', label: 'Area cleared', defaultValue: 10000, unit: 'm²' },
      ],
      formulaText: 'Rate/m² = (Labour + Plant + Loading + Haulage + Disposal + OHP) / Area cleared',
      formulaExpression: '(labour + plant + loading + haulage + disposal + ohp) / area',
      formulaBasis: [
        'Labour for cutting and uprooting',
        'Plant for bulldozer/excavator operations',
        'Loading of debris',
        'Haulage to disposal site',
        'Disposal cost',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(1),
      name: 'Removal of topsoil',
      description: 'Strip and remove topsoil to the specified depth for disposal or approved stockpiling ahead of the road formation works.',
      unit: 'm³',
      category: 'Clearing and stripping',
      keywords: ['topsoil', 'strip topsoil', 'stockpile', 'remove topsoil'],
      pickerHint: 'Use where topsoil is measured by volume and stripped before filling, subgrade work, or disposal.',
      isRecommended: true,
      components: [
        { id: 'excavation', label: 'Excavation', defaultValue: 4300, unit: 'NGN/m³' },
        { id: 'labour', label: 'Labour support', defaultValue: 650, unit: 'NGN/m³' },
        { id: 'loading', label: 'Loading', defaultValue: 1500, unit: 'NGN/m³' },
        { id: 'haulage', label: 'Haulage', defaultValue: 1900, unit: 'NGN/m³' },
        { id: 'disposal', label: 'Disposal or stockpiling', defaultValue: 700, unit: 'NGN/m³' },
        { id: 'ohp', label: 'OHP', defaultValue: 900, unit: 'NGN/m³' },
      ],
      formulaText: 'Rate/m³ = Excavation + Loading + Haulage + Disposal + OHP',
      formulaExpression: 'excavation + labour + loading + haulage + disposal + ohp',
      formulaBasis: [
        'Excavator cost',
        'Labour support',
        'Loading',
        'Haulage',
        'Disposal or stockpiling',
        'Overhead and profit',
      ],
      notes: 'Alternative note: if measured by area, Rate/m² = Rate/m³ × thickness.',
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(2),
      name: 'Tree cutting',
      description: 'Cut down and remove trees standing within the road alignment, including uprooting where required and disposal of the arisings.',
      unit: 'No.',
      category: 'Clearing and stripping',
      keywords: ['tree cutting', 'chainsaw', 'tree removal'],
      pickerHint: 'Use where individual trees are measured by number for cutting, removal, and disposal.',
      components: [
        { id: 'cutting', label: 'Cutting', defaultValue: 32000, unit: 'NGN/No.' },
        { id: 'uprooting', label: 'Uprooting', defaultValue: 24000, unit: 'NGN/No.' },
        { id: 'loading', label: 'Loading', defaultValue: 9000, unit: 'NGN/No.' },
        { id: 'haulage', label: 'Haulage', defaultValue: 13000, unit: 'NGN/No.' },
        { id: 'disposal', label: 'Disposal', defaultValue: 10000, unit: 'NGN/No.' },
        { id: 'ohp', label: 'OHP', defaultValue: 7000, unit: 'NGN/No.' },
      ],
      formulaText: 'Rate/No = Cutting + Uprooting + Loading + Haulage + Disposal + OHP',
      formulaExpression: 'cutting + uprooting + loading + haulage + disposal + ohp',
      formulaBasis: [
        'Labour for cutting',
        'Equipment such as chainsaw/excavator',
        'Uprooting if needed',
        'Loading',
        'Haulage',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(3),
      name: 'Stump removal',
      description: 'Excavate and remove tree stumps remaining after cutting, including haulage and disposal from the road corridor.',
      unit: 'No.',
      category: 'Clearing and stripping',
      keywords: ['stump removal', 'grub roots', 'uproot stump'],
      pickerHint: 'Useful where stump extraction is separately measured after tree felling.',
      components: [
        { id: 'excavation', label: 'Excavation', defaultValue: 18000, unit: 'NGN/No.' },
        { id: 'labour', label: 'Labour', defaultValue: 12000, unit: 'NGN/No.' },
        { id: 'loading', label: 'Loading', defaultValue: 5000, unit: 'NGN/No.' },
        { id: 'haulage', label: 'Haulage', defaultValue: 8000, unit: 'NGN/No.' },
        { id: 'disposal', label: 'Disposal', defaultValue: 6500, unit: 'NGN/No.' },
        { id: 'ohp', label: 'OHP', defaultValue: 5500, unit: 'NGN/No.' },
      ],
      formulaText: 'Rate = Excavation + Labour + Loading + Haulage + Disposal + OHP',
      formulaExpression: 'excavation + labour + loading + haulage + disposal + ohp',
      formulaBasis: [
        'Excavator',
        'Labour',
        'Loading',
        'Haulage',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(4),
      name: 'Bush clearing',
      description: 'Cut and remove bushes, scrub growth, and light undergrowth within the roadway footprint and associated work areas.',
      unit: 'm²',
      category: 'Clearing and stripping',
      keywords: ['bush clearing', 'scrub removal', 'undergrowth'],
      pickerHint: 'Use for light vegetation clearing where bushes and scrub are measured separately from full grubbing.',
      components: [
        { id: 'labour', label: 'Labour', defaultValue: 140, unit: 'NGN/m²' },
        { id: 'plant', label: 'Plant', defaultValue: 70, unit: 'NGN/m²' },
        { id: 'loading', label: 'Loading', defaultValue: 35, unit: 'NGN/m²' },
        { id: 'haulage', label: 'Haulage', defaultValue: 45, unit: 'NGN/m²' },
        { id: 'disposal', label: 'Disposal', defaultValue: 20, unit: 'NGN/m²' },
        { id: 'ohp', label: 'OHP', defaultValue: 30, unit: 'NGN/m²' },
      ],
      formulaText: 'Rate/m² = Labour + Plant + Loading + Haulage + Disposal + OHP',
      formulaExpression: 'labour + plant + loading + haulage + disposal + ohp',
      formulaBasis: [
        'Labour for cutting bushes',
        'Plant support',
        'Loading',
        'Haulage',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(5),
      name: 'Demolition of buildings',
      description: 'Demolish and cart away existing buildings standing within the road alignment, including sorting, loading, and disposal of the debris.',
      unit: 'm²',
      category: 'Demolition',
      keywords: ['building demolition', 'structure removal', 'dismantling'],
      pickerHint: 'Use where building footprints are measured for demolition prior to the road works.',
      components: [
        { id: 'breaking', label: 'Breaking', defaultValue: 6800, unit: 'NGN/m²' },
        { id: 'labour', label: 'Labour', defaultValue: 3200, unit: 'NGN/m²' },
        { id: 'equipment', label: 'Equipment', defaultValue: 2400, unit: 'NGN/m²' },
        { id: 'loading', label: 'Loading', defaultValue: 1100, unit: 'NGN/m²' },
        { id: 'haulage', label: 'Haulage', defaultValue: 1800, unit: 'NGN/m²' },
        { id: 'disposal', label: 'Disposal', defaultValue: 950, unit: 'NGN/m²' },
        { id: 'ohp', label: 'OHP', defaultValue: 1200, unit: 'NGN/m²' },
      ],
      formulaText: 'Rate = Breaking + Labour + Equipment + Loading + Haulage + Disposal + OHP',
      formulaExpression: 'breaking + labour + equipment + loading + haulage + disposal + ohp',
      formulaBasis: [
        'Breaking/dismantling',
        'Labour',
        'Equipment',
        'Loading',
        'Haulage',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(6),
      name: 'Demolition of concrete structures',
      description: 'Break out and remove concrete structures such as slabs, culvert elements, retaining bases, and similar road-side obstructions.',
      unit: 'm³',
      category: 'Demolition',
      keywords: ['concrete demolition', 'break out concrete', 'structure demolition'],
      pickerHint: 'Useful for in-situ concrete removals measured by volume.',
      components: [
        { id: 'breaking', label: 'Breaking', defaultValue: 52000, unit: 'NGN/m³' },
        { id: 'equipment', label: 'Equipment', defaultValue: 28000, unit: 'NGN/m³' },
        { id: 'labour', label: 'Labour', defaultValue: 16000, unit: 'NGN/m³' },
        { id: 'loading', label: 'Loading', defaultValue: 9000, unit: 'NGN/m³' },
        { id: 'haulage', label: 'Haulage', defaultValue: 14000, unit: 'NGN/m³' },
        { id: 'disposal', label: 'Disposal', defaultValue: 7000, unit: 'NGN/m³' },
        { id: 'ohp', label: 'OHP', defaultValue: 11000, unit: 'NGN/m³' },
      ],
      formulaText: 'Rate/m³ = Breaking + Equipment + Labour + Loading + Haulage + Disposal + OHP',
      formulaExpression: 'breaking + equipment + labour + loading + haulage + disposal + ohp',
      formulaBasis: [
        'Breaking',
        'Equipment',
        'Labour',
        'Loading',
        'Haulage',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(7),
      name: 'Demolition of asphalt pavement',
      description: 'Saw cut, break, and remove existing asphalt pavement layers and cart the arising material from the site.',
      unit: 'm²',
      category: 'Demolition',
      keywords: ['asphalt demolition', 'failed pavement', 'remove asphalt'],
      pickerHint: 'Use for pavement removal measured by area where asphalt surfacing is broken and disposed.',
      isRecommended: true,
      components: [
        { id: 'breaking', label: 'Breaking', defaultValue: 2400, unit: 'NGN/m²' },
        { id: 'labour', label: 'Labour', defaultValue: 700, unit: 'NGN/m²' },
        { id: 'loading', label: 'Loading', defaultValue: 500, unit: 'NGN/m²' },
        { id: 'haulage', label: 'Haulage', defaultValue: 850, unit: 'NGN/m²' },
        { id: 'disposal', label: 'Disposal', defaultValue: 400, unit: 'NGN/m²' },
        { id: 'ohp', label: 'OHP', defaultValue: 350, unit: 'NGN/m²' },
      ],
      formulaText: 'Rate/m² = Breaking + Labour + Loading + Haulage + Disposal + OHP',
      formulaExpression: 'breaking + labour + loading + haulage + disposal + ohp',
      formulaBasis: [
        'Breaking',
        'Labour',
        'Loading',
        'Haulage',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(8),
      name: 'Demolition of masonry / block structures',
      description: 'Dismantle block, brick, or masonry structures within the work zone and dispose of the resulting debris.',
      unit: 'm²',
      category: 'Demolition',
      keywords: ['masonry demolition', 'block structure', 'brick removal'],
      pickerHint: 'Useful where perimeter walls, block kiosks, or small masonry elements are removed by area.',
      components: [
        { id: 'breaking', label: 'Breaking', defaultValue: 3200, unit: 'NGN/m²' },
        { id: 'labour', label: 'Labour', defaultValue: 1200, unit: 'NGN/m²' },
        { id: 'loading', label: 'Loading', defaultValue: 600, unit: 'NGN/m²' },
        { id: 'haulage', label: 'Haulage', defaultValue: 900, unit: 'NGN/m²' },
        { id: 'disposal', label: 'Disposal', defaultValue: 450, unit: 'NGN/m²' },
        { id: 'ohp', label: 'OHP', defaultValue: 450, unit: 'NGN/m²' },
      ],
      formulaText: 'Rate = Breaking + Labour + Loading + Haulage + Disposal + OHP',
      formulaExpression: 'breaking + labour + loading + haulage + disposal + ohp',
      formulaBasis: [
        'Breaking',
        'Labour',
        'Loading',
        'Haulage',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(9),
      name: 'Removal of kerbs',
      description: 'Break out and remove existing kerbs, edging, and associated concrete bedding along the road corridor.',
      unit: 'm',
      category: 'Demolition',
      keywords: ['remove kerbs', 'kerb demolition', 'edging removal'],
      pickerHint: 'Use where existing kerbs or road edging are measured linearly for removal.',
      components: [
        { id: 'breaking', label: 'Breaking', defaultValue: 800, unit: 'NGN/m' },
        { id: 'labour', label: 'Labour', defaultValue: 350, unit: 'NGN/m' },
        { id: 'loading', label: 'Loading', defaultValue: 200, unit: 'NGN/m' },
        { id: 'haulage', label: 'Haulage', defaultValue: 250, unit: 'NGN/m' },
        { id: 'disposal', label: 'Disposal', defaultValue: 120, unit: 'NGN/m' },
        { id: 'ohp', label: 'OHP', defaultValue: 180, unit: 'NGN/m' },
      ],
      formulaText: 'Rate/m = Breaking + Labour + Loading + Haulage + Disposal + OHP',
      formulaExpression: 'breaking + labour + loading + haulage + disposal + ohp',
      formulaBasis: [
        'Breaking',
        'Labour',
        'Loading',
        'Haulage',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(10),
      name: 'Removal of existing drainage structures',
      description: 'Excavate around and remove existing drains, culvert units, and drainage appurtenances obstructing the new road works.',
      unit: 'm',
      category: 'Demolition',
      keywords: ['drainage removal', 'existing drain', 'culvert removal'],
      pickerHint: 'Useful where linear drainage elements are broken out and removed before reconstruction.',
      components: [
        { id: 'excavation', label: 'Excavation', defaultValue: 2200, unit: 'NGN/m' },
        { id: 'breaking', label: 'Breaking', defaultValue: 1800, unit: 'NGN/m' },
        { id: 'labour', label: 'Labour', defaultValue: 700, unit: 'NGN/m' },
        { id: 'disposal', label: 'Disposal', defaultValue: 500, unit: 'NGN/m' },
        { id: 'ohp', label: 'OHP', defaultValue: 400, unit: 'NGN/m' },
      ],
      formulaText: 'Rate = Excavation + Breaking + Labour + Disposal + OHP',
      formulaExpression: 'excavation + breaking + labour + disposal + ohp',
      formulaBasis: [
        'Excavation',
        'Breaking',
        'Labour',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(11),
      name: 'Removal of underground utilities',
      description: 'Excavate, disconnect where permitted, and remove underground services and utility obstructions within the road alignment.',
      unit: 'm',
      category: 'Demolition',
      keywords: ['underground utility', 'service diversion', 'remove pipe', 'remove cable'],
      pickerHint: 'Use for measured utility removals where abandoned lines or services are excavated and taken out.',
      components: [
        { id: 'excavation', label: 'Excavation', defaultValue: 3000, unit: 'NGN/m' },
        { id: 'labour', label: 'Labour', defaultValue: 950, unit: 'NGN/m' },
        { id: 'handling', label: 'Handling', defaultValue: 650, unit: 'NGN/m' },
        { id: 'disposal', label: 'Disposal', defaultValue: 1200, unit: 'NGN/m' },
        { id: 'ohp', label: 'OHP', defaultValue: 700, unit: 'NGN/m' },
      ],
      formulaText: 'Rate = Excavation + Labour + Handling + Disposal + OHP',
      formulaExpression: 'excavation + labour + handling + disposal + ohp',
      formulaBasis: [
        'Excavation',
        'Labour',
        'Handling',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(12),
      name: 'Stripping of unsuitable material',
      description: 'Excavate and remove unsuitable material encountered in the road formation or side slopes to approved spoil locations.',
      unit: 'm³',
      category: 'Clearing and stripping',
      keywords: ['unsuitable material', 'strip spoil', 'remove poor material'],
      pickerHint: 'Use where unsuitable material is measured separately from general earthworks for excavation and disposal.',
      isRecommended: true,
      components: [
        { id: 'excavation', label: 'Excavation', defaultValue: 3900, unit: 'NGN/m³' },
        { id: 'loading', label: 'Loading', defaultValue: 1400, unit: 'NGN/m³' },
        { id: 'haulage', label: 'Haulage', defaultValue: 1800, unit: 'NGN/m³' },
        { id: 'disposal', label: 'Disposal', defaultValue: 700, unit: 'NGN/m³' },
        { id: 'ohp', label: 'OHP', defaultValue: 900, unit: 'NGN/m³' },
      ],
      formulaText: 'Rate/m³ = Excavation + Loading + Haulage + Disposal + OHP',
      formulaExpression: 'excavation + loading + haulage + disposal + ohp',
      formulaBasis: [
        'Excavation',
        'Loading',
        'Haulage',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(13),
      name: 'Disposal of debris',
      description: 'Load, transport, and dispose demolition or clearance debris at approved dumps or disposal areas.',
      unit: 'm³',
      category: 'Disposal and haulage',
      keywords: ['debris disposal', 'tip waste', 'cart away'],
      pickerHint: 'Useful where debris disposal is measured separately from the demolition or clearing operation.',
      isRecommended: true,
      components: [
        { id: 'loading', label: 'Loading', defaultValue: 1200, unit: 'NGN/m³' },
        { id: 'haulage', label: 'Haulage', defaultValue: 1600, unit: 'NGN/m³' },
        { id: 'disposal_fee', label: 'Disposal fee', defaultValue: 650, unit: 'NGN/m³' },
        { id: 'ohp', label: 'OHP', defaultValue: 550, unit: 'NGN/m³' },
      ],
      formulaText: 'Rate/m³ = Loading + Haulage + Disposal fee + OHP',
      formulaExpression: 'loading + haulage + disposal_fee + ohp',
      formulaBasis: [
        'Loading',
        'Haulage',
        'Disposal fee',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(14),
      name: 'Haulage of material',
      description: 'Haul excavated, salvaged, or demolition material over a measured lead distance from the road works to stockpile or disposal destinations.',
      unit: 'm³-km',
      category: 'Disposal and haulage',
      keywords: ['haulage', 'lead distance', 'cart material'],
      pickerHint: 'Use when haulage is measured by cubic-metre kilometre and priced independently of loading or disposal.',
      isRecommended: true,
      components: [
        { id: 'distance', label: 'Distance', defaultValue: 15, unit: 'km' },
        { id: 'cost_per_km', label: 'Cost / km', defaultValue: 150, unit: 'NGN/(m³-km)' },
        { id: 'volume', label: 'Volume', defaultValue: 1, unit: 'm³' },
        { id: 'ohp', label: 'OHP', defaultValue: 30, unit: 'NGN' },
      ],
      formulaText: 'Rate = Distance × cost/km × volume + OHP',
      formulaExpression: '((distance * cost_per_km * volume) + ohp) / (distance * volume)',
      formulaBasis: [
        'Distance',
        'Haulage rate',
        'Volume',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(15),
      name: 'Stockpiling of reusable material',
      description: 'Handle and stockpile suitable excavated or demolition materials that are to be reused later in the road project.',
      unit: 'm³',
      category: 'Salvage and reuse',
      keywords: ['stockpile', 'reusable material', 'salvage stockpile'],
      pickerHint: 'Use for temporary stockpiling of reusable fill, stone, or salvaged material kept for later works.',
      components: [
        { id: 'labour', label: 'Labour', defaultValue: 600, unit: 'NGN/m³' },
        { id: 'equipment', label: 'Equipment', defaultValue: 450, unit: 'NGN/m³' },
        { id: 'handling', label: 'Handling', defaultValue: 280, unit: 'NGN/m³' },
        { id: 'ohp', label: 'OHP', defaultValue: 170, unit: 'NGN/m³' },
      ],
      formulaText: 'Rate = Labour + Equipment + Handling + OHP',
      formulaExpression: 'labour + equipment + handling + ohp',
      formulaBasis: [
        'Labour',
        'Equipment',
        'Handling',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(16),
      name: 'Salvaging of materials',
      description: 'Recover, sort, and preserve reusable materials arising from the road corridor clearance or demolition operations.',
      unit: 'item',
      category: 'Salvage and reuse',
      keywords: ['salvage', 'recover material', 'reusable item'],
      pickerHint: 'Useful where reusable items are carefully recovered and stored rather than treated as waste.',
      components: [
        { id: 'labour', label: 'Labour', defaultValue: 18000, unit: 'NGN/item' },
        { id: 'handling', label: 'Handling', defaultValue: 12000, unit: 'NGN/item' },
        { id: 'storage', label: 'Storage', defaultValue: 9000, unit: 'NGN/item' },
        { id: 'ohp', label: 'OHP', defaultValue: 7000, unit: 'NGN/item' },
      ],
      formulaText: 'Rate = Labour + Handling + Storage + OHP',
      formulaExpression: 'labour + handling + storage + ohp',
      formulaBasis: [
        'Labour',
        'Handling',
        'Storage',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(17),
      name: 'Clearing of existing drainage channels',
      description: 'Clear silt, debris, vegetation, and obstructions from existing side drains and channels affected by the road works.',
      unit: 'm',
      category: 'Disposal and haulage',
      keywords: ['clear drain', 'existing channel', 'desilt drain'],
      pickerHint: 'Use for measured channel clearing before tie-ins, widening, or reconstruction.',
      components: [
        { id: 'labour', label: 'Labour', defaultValue: 500, unit: 'NGN/m' },
        { id: 'equipment', label: 'Equipment', defaultValue: 350, unit: 'NGN/m' },
        { id: 'disposal', label: 'Disposal', defaultValue: 120, unit: 'NGN/m' },
        { id: 'ohp', label: 'OHP', defaultValue: 130, unit: 'NGN/m' },
      ],
      formulaText: 'Rate = Labour + Equipment + Disposal + OHP',
      formulaExpression: 'labour + equipment + disposal + ohp',
      formulaBasis: [
        'Labour',
        'Equipment',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(18),
      name: 'Removal of obstructions',
      description: 'Excavate or dismantle isolated obstructions such as abandoned blocks, poles, signs, debris mounds, or localized physical barriers within the road works.',
      unit: 'item',
      category: 'Demolition',
      keywords: ['obstruction removal', 'remove barrier', 'isolated obstruction'],
      pickerHint: 'Useful where one-off obstructions are measured individually instead of under a broader demolition item.',
      isRecommended: true,
      components: [
        { id: 'excavation', label: 'Excavation', defaultValue: 12000, unit: 'NGN/item' },
        { id: 'labour', label: 'Labour', defaultValue: 7000, unit: 'NGN/item' },
        { id: 'equipment', label: 'Equipment', defaultValue: 9000, unit: 'NGN/item' },
        { id: 'disposal', label: 'Disposal', defaultValue: 4000, unit: 'NGN/item' },
        { id: 'ohp', label: 'OHP', defaultValue: 3500, unit: 'NGN/item' },
      ],
      formulaText: 'Rate = Excavation + Labour + Equipment + Disposal + OHP',
      formulaExpression: 'excavation + labour + equipment + disposal + ohp',
      formulaBasis: [
        'Excavation',
        'Labour',
        'Equipment',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(19),
      name: 'Site leveling / rough grading',
      description: 'Carry out rough grading and leveling of the cleared site to prepare a workable platform before detailed formation operations.',
      unit: 'm²',
      category: 'Finishing and environmental',
      keywords: ['rough grading', 'site leveling', 'site trim'],
      pickerHint: 'Use where the cleared site is lightly graded before full earthworks or formation trimming begins.',
      isRecommended: true,
      components: [
        { id: 'grading', label: 'Grading', defaultValue: 150000, unit: 'NGN' },
        { id: 'labour', label: 'Labour', defaultValue: 60000, unit: 'NGN' },
        { id: 'fuel', label: 'Fuel', defaultValue: 40000, unit: 'NGN' },
        { id: 'ohp', label: 'OHP', defaultValue: 30000, unit: 'NGN' },
        { id: 'area', label: 'Area leveled', defaultValue: 5000, unit: 'm²' },
      ],
      formulaText: 'Rate/m² = Grading + Labour + Fuel + OHP',
      formulaExpression: '(grading + labour + fuel + ohp) / area',
      formulaBasis: [
        'Grading equipment',
        'Labour',
        'Fuel',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(20),
      name: 'Removal of fences and gates',
      description: 'Dismantle and remove fences, gates, and minor enclosures affected by the road alignment, including disposal of unwanted material.',
      unit: 'm',
      category: 'Demolition',
      keywords: ['fence removal', 'gate removal', 'perimeter fence'],
      pickerHint: 'Use for linear fence and gate removals where dismantling and disposal are measured separately.',
      components: [
        { id: 'labour', label: 'Labour', defaultValue: 650, unit: 'NGN/m' },
        { id: 'dismantling', label: 'Dismantling', defaultValue: 500, unit: 'NGN/m' },
        { id: 'loading', label: 'Loading', defaultValue: 220, unit: 'NGN/m' },
        { id: 'haulage', label: 'Haulage', defaultValue: 240, unit: 'NGN/m' },
        { id: 'disposal', label: 'Disposal', defaultValue: 120, unit: 'NGN/m' },
        { id: 'ohp', label: 'OHP', defaultValue: 170, unit: 'NGN/m' },
      ],
      formulaText: 'Rate = Labour + Dismantling + Loading + Haulage + Disposal + OHP',
      formulaExpression: 'labour + dismantling + loading + haulage + disposal + ohp',
      formulaBasis: [
        'Labour',
        'Dismantling',
        'Loading',
        'Haulage',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(21),
      name: 'Removal of vegetation roots',
      description: 'Excavate and remove embedded roots left within the road formation or side slope footprint after clearing and grubbing.',
      unit: 'm²',
      category: 'Clearing and stripping',
      keywords: ['root removal', 'vegetation roots', 'grub roots'],
      pickerHint: 'Use where roots remaining below the surface need extra treatment beyond ordinary clearing.',
      components: [
        { id: 'excavation', label: 'Excavation', defaultValue: 180, unit: 'NGN/m²' },
        { id: 'labour', label: 'Labour', defaultValue: 90, unit: 'NGN/m²' },
        { id: 'disposal', label: 'Disposal', defaultValue: 35, unit: 'NGN/m²' },
        { id: 'ohp', label: 'OHP', defaultValue: 25, unit: 'NGN/m²' },
      ],
      formulaText: 'Rate = Excavation + Labour + Disposal + OHP',
      formulaExpression: 'excavation + labour + disposal + ohp',
      formulaBasis: [
        'Excavation',
        'Labour',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(22),
      name: 'Removal of buried foundations',
      description: 'Excavate, break out, and remove buried foundation remnants encountered along the road corridor.',
      unit: 'm³',
      category: 'Demolition',
      keywords: ['buried foundation', 'subsurface demolition', 'old foundation removal'],
      pickerHint: 'Useful where hidden foundation blocks or old substructures are measured by volume for removal.',
      components: [
        { id: 'excavation', label: 'Excavation', defaultValue: 28000, unit: 'NGN/m³' },
        { id: 'breaking', label: 'Breaking', defaultValue: 24000, unit: 'NGN/m³' },
        { id: 'labour', label: 'Labour', defaultValue: 11000, unit: 'NGN/m³' },
        { id: 'disposal', label: 'Disposal', defaultValue: 6500, unit: 'NGN/m³' },
        { id: 'ohp', label: 'OHP', defaultValue: 7500, unit: 'NGN/m³' },
      ],
      formulaText: 'Rate = Excavation + Breaking + Labour + Disposal + OHP',
      formulaExpression: 'excavation + breaking + labour + disposal + ohp',
      formulaBasis: [
        'Excavation',
        'Breaking',
        'Labour',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(23),
      name: 'Site cleaning after demolition',
      description: 'Clean down the site after demolition, remove scattered debris, and leave the road work area in a tidy condition ready for subsequent operations.',
      unit: 'm²',
      category: 'Finishing and environmental',
      keywords: ['site cleaning', 'post demolition cleanup', 'final cleaning'],
      pickerHint: 'Use after concentrated demolition areas where hand cleaning and light plant sweeping are needed before the next trade moves in.',
      isRecommended: true,
      components: [
        { id: 'labour', label: 'Labour', defaultValue: 90, unit: 'NGN/m²' },
        { id: 'equipment', label: 'Equipment', defaultValue: 55, unit: 'NGN/m²' },
        { id: 'disposal', label: 'Disposal', defaultValue: 25, unit: 'NGN/m²' },
        { id: 'ohp', label: 'OHP', defaultValue: 30, unit: 'NGN/m²' },
      ],
      formulaText: 'Rate = Labour + Equipment + Disposal + OHP',
      formulaExpression: 'labour + equipment + disposal + ohp',
      formulaBasis: [
        'Labour',
        'Equipment',
        'Disposal',
        'Overhead and profit',
      ],
    }),
    roadSiteClearanceItem({
      code: roadSiteCode(24),
      name: 'Environmental protection during demolition',
      description: 'Provide watering, dust control, local containment, and other environmental protection measures during road demolition operations.',
      unit: 'item',
      category: 'Finishing and environmental',
      keywords: ['environmental protection', 'dust control', 'watering', 'demolition protection'],
      pickerHint: 'Use where environmental controls for demolition are measured as a separate allowance or provisional item.',
      isRecommended: true,
      components: [
        { id: 'watering', label: 'Watering', defaultValue: 12000, unit: 'NGN/item' },
        { id: 'labour', label: 'Labour', defaultValue: 14000, unit: 'NGN/item' },
        { id: 'equipment', label: 'Equipment', defaultValue: 16000, unit: 'NGN/item' },
        { id: 'ohp', label: 'OHP', defaultValue: 8000, unit: 'NGN/item' },
      ],
      formulaText: 'Rate = Watering + Labour + Equipment + OHP',
      formulaExpression: 'watering + labour + equipment + ohp',
      formulaBasis: [
        'Watering',
        'Labour',
        'Equipment',
        'Overhead and profit',
      ],
    }),
  ];
};

const roadMeasuredItem = (structureCode, sectionCode, index, billSection, item) => {
  const components = item.components || [];
  const componentBasis = components
    .map((component) => component.basis || component.label)
    .filter(Boolean);

  return roadFormulaItem({
    code: makeItemCode(structureCode, sectionCode, index),
    billSection,
    ...item,
    components,
    formulaText: item.formulaText || buildSumFormulaText(`Rate/${item.unit || 'unit'}`, components),
    formulaBasis: item.formulaBasis && item.formulaBasis.length > 0 ? item.formulaBasis : componentBasis,
  });
};

const roadMeasuredItems = (structureCode, sectionCode, billSection, entries = []) => (
  entries.map((entry, index) => roadMeasuredItem(structureCode, sectionCode, index, billSection, entry))
);

const buildingPreliminariesCatalogItem = (structureCode, index, item) => {
  const code = item.code || makeItemCode(structureCode, 'PREL', index);
  const components = item.components || [];
  const componentBasis = components
    .map((component) => component.basis || component.label)
    .filter(Boolean);
  const resolvedBenchmarkRate = Number(item.benchmarkRate) || 0;

  return formulaRateItem({
    id: item.id || code,
    code,
    name: item.name,
    description: item.description,
    unit: item.unit,
    structureType: STRUCTURE_TYPES.BUILDING,
    billSection: 'Preliminaries',
    inputs: buildComponentInputs(components, 'NGN'),
    benchmarkRate: resolvedBenchmarkRate,
    benchmarkMetadata: buildBenchmarkMetadata({
      rate: resolvedBenchmarkRate,
      currency: 'NGN',
      region: 'Nigeria',
      sourceType: item.benchmarkSourceType || 'seed-placeholder',
      sourceNote: item.benchmarkNote || 'Placeholder benchmark. Replace with verified Nigerian market rate.',
      dateCaptured: item.benchmarkDateCaptured || '2026-04',
      confidenceLevel: 'low',
    }),
    formulaText: item.formulaText || buildSumFormulaText(`Rate/${item.unit || 'unit'}`, components),
    formulaBasis: item.formulaBasis && item.formulaBasis.length > 0 ? item.formulaBasis : componentBasis,
    formulaExpression: item.formulaExpression || buildSumExpression(components),
    notes: item.notes || '',
    category: item.category || 'Preliminaries',
    keywords: item.keywords || [],
    pickerHint: item.pickerHint || '',
    isRecommended: Boolean(item.isRecommended),
    selectedRateSource: item.selectedRateSource || 'formula',
  });
};

const createBuildingPreliminariesItems = (structureCode = BUILDING_CODE) => (
  (BuildingCatalog.BUILDING_PRELIMINARIES_ITEMS || []).map((item, index) => buildingPreliminariesCatalogItem(structureCode, index, item))
);

const BUILDING_LEGACY_SECTIONS = [
  catalogSection(
    BUILDING_CODE,
    'preliminaries',
    'Preliminaries',
    'Project preliminaries and startup requirements.',
    createBuildingPreliminariesItems(BUILDING_CODE),
    {
      trade: 'Preliminaries',
      pickerPrompt: 'Pick the building preliminaries that the contract genuinely requires, then price each one with the correct duration or lump-sum quantity.',
      emptyStateMessage: 'Select the building preliminaries that apply to the job, such as mobilization, temporary office, HSE, supervision, and permit-related costs.',
    }
  ),
  catalogSection(BUILDING_CODE, 'site_clearance', 'Site clearance', 'Site clearance, setting out, and demolition items.', BuildingCatalog.BUILDING_SITE_CLEARANCE_DEMOLITION_ITEMS),
  catalogSection(BUILDING_CODE, 'excavation_earthworks', 'Excavation / earthworks', 'Bulk excavation, trenching, and filling items.', BuildingCatalog.BUILDING_EARTHWORKS_ITEMS),
  catalogSection(BUILDING_CODE, 'foundations', 'Foundations', 'Foundation concrete, reinforcement, and associated works.', BuildingCatalog.BUILDING_FOUNDATIONS_ITEMS),
  catalogSection(BUILDING_CODE, 'substructure', 'Substructure', 'Works below ground floor slab level.', BuildingCatalog.BUILDING_SUBSTRUCTURE_ITEMS),
];

const buildingBillSection = (id, title, description, items = [], metadata = {}) => (
  catalogSection(
    BUILDING_CODE,
    id,
    title,
    description,
    items,
    {
      trade: metadata.trade || title,
      pickerPrompt: metadata.pickerPrompt || `Open ${title.toLowerCase()}, review the standard building bill heading, and add only the items that apply to this project before generating BOQ rows.`,
      emptyStateTitle: metadata.emptyStateTitle || `No ${title.toLowerCase()} items selected yet.`,
      emptyStateMessage: metadata.emptyStateMessage || `This ${title.toLowerCase()} bill is ready for item selection. Open the library and add only the measured lines that belong in this building BOQ.`,
      keywords: metadata.keywords || [],
      ...(metadata.isPreliminaries ? { isPreliminaries: true } : {}),
    }
  )
);

// Building catalog items are now decentralized in ./catalog/building/


const BUILDING_SECTIONS = [
  catalogSection(
    BUILDING_CODE,
    'preliminaries',
    'Preliminaries',
    'General project setup, supervision, temporary works, insurance, HSE, site facilities, and administrative requirements.',
    createBuildingPreliminariesItems(BUILDING_CODE),
    {
      trade: 'Preliminaries',
      isPreliminaries: true,
      pickerPrompt: 'Review the building preliminaries bill and add only the startup, supervision, temporary facilities, welfare, insurance, and HSE items required for this building project.',
      emptyStateTitle: 'No preliminaries selected yet.',
      emptyStateMessage: 'This building preliminaries bill is ready for item selection. Add only the preliminaries that genuinely apply to the contract before generating BOQ rows.',
      keywords: ['building', 'preliminaries', 'temporary works', 'supervision', 'hse', 'site facilities'],
    }
  ),
  catalogSection(
    BUILDING_CODE,
    'site_clearance_demolition',
    'Site Clearance & Demolition',
    'Clearing vegetation, removing existing structures, stripping topsoil, and disposing of debris.',
    BuildingCatalog.BUILDING_SITE_CLEARANCE_DEMOLITION_ITEMS,
    {
      trade: 'Site Preparation',
      keywords: ['building', 'site clearance', 'demolition', 'topsoil', 'debris disposal'],
    }
  ),
  buildingBillSection(
    'earthworks',
    'Earthworks',
    'Excavation, filling, backfilling, compaction, disposal, and site levelling works.',
    BuildingCatalog.BUILDING_EARTHWORKS_ITEMS,
    {
      trade: 'Earthworks',
      keywords: ['building', 'earthworks', 'excavation', 'backfilling', 'compaction', 'levelling'],
    }
  ),
  buildingBillSection(
    'substructure_foundations',
    'Substructure / Foundations',
    'Foundation works including blinding, strip footing, pad footing, raft foundation, pile caps, and ground beams.',
    BuildingCatalog.BUILDING_FOUNDATIONS_ITEMS,
    {
      trade: 'Substructure',
      keywords: ['building', 'foundations', 'substructure', 'footing', 'raft foundation', 'pile caps', 'ground beams'],
    }
  ),
  buildingBillSection(
    'concrete_works',
    'Concrete Works',
    'In-situ concrete works for slabs, beams, columns, bases, staircases, lintels, and other concrete elements.',
    BuildingCatalog.BUILDING_CONCRETEWORKS_ITEMS,
    {
      trade: 'Concrete Works',
      keywords: ['building', 'concrete', 'slabs', 'beams', 'columns', 'staircases', 'lintels'],
    }
  ),
  buildingBillSection(
    'reinforcement_works',
    'Reinforcement Works',
    'Supply, cutting, bending, fixing, tying, and placing of reinforcement bars and mesh.',
    BuildingCatalog.BUILDING_REINFORCEMENT_ITEMS,
    {
      trade: 'Reinforcement',
      keywords: ['building', 'reinforcement', 'rebar', 'mesh', 'cutting', 'bending', 'fixing'],
    }
  ),
  buildingBillSection(
    'formwork',
    'Formwork',
    'Formwork to foundations, columns, beams, slabs, staircases, walls, and other concrete elements.',
    BuildingCatalog.BUILDING_FORMWORK_ITEMS,
    {
      trade: 'Formwork',
      keywords: ['building', 'formwork', 'shuttering', 'columns', 'beams', 'slabs', 'walls'],
    }
  ),
  buildingBillSection(
    'blockwork_masonry',
    'Blockwork / Masonry',
    'Block walls, brick walls, partitions, mortar works, and related masonry items.',
    BuildingCatalog.BUILDING_MASONRY_ITEMS,
    {
      trade: 'Masonry',
      keywords: ['building', 'blockwork', 'masonry', 'brickwork', 'partitions', 'mortar'],
    }
  ),
  buildingBillSection(
    'structural_frame',
    'Structural Frame',
    'Main structural frame works including reinforced concrete frame or steel frame elements.',
    BuildingCatalog.BUILDING_STRUCTURALFRAME_ITEMS,
    {
      trade: 'Structural Frame',
      keywords: ['building', 'structural frame', 'reinforced concrete frame', 'steel frame'],
    }
  ),
  buildingBillSection(
    'roofing',
    'Roofing',
    'Roof trusses, roof covering, flashings, insulation, gutters, fascia, and rainwater goods.',
    BuildingCatalog.BUILDING_ROOFING_ITEMS,
    {
      trade: 'Roofing',
      keywords: ['building', 'roofing', 'trusses', 'gutters', 'fascia', 'flashings', 'rainwater goods'],
    }
  ),
  buildingBillSection(
    'doors_windows',
    'Doors & Windows',
    'Door frames, door leaves, windows, glazing, ironmongery, and installation accessories.',
    BuildingCatalog.BUILDING_OPENINGS_ITEMS,
    {
      trade: 'Openings',
      keywords: ['building', 'doors', 'windows', 'glazing', 'ironmongery', 'frames'],
    }
  ),
  buildingBillSection(
    'wall_finishes',
    'Wall Finishes',
    'Plastering, rendering, wall tiling, cladding, and other internal/external wall finishes.',
    BuildingCatalog.BUILDING_WALLFINISHES_ITEMS,
    {
      trade: 'Finishes',
      keywords: ['building', 'wall finishes', 'plastering', 'rendering', 'wall tiling', 'cladding'],
    }
  ),
  buildingBillSection(
    'floor_finishes',
    'Floor Finishes',
    'Screeding, floor tiles, terrazzo, marble, timber flooring, vinyl, and related finishes.',
    BuildingCatalog.BUILDING_FLOORFINISHES_ITEMS,
    {
      trade: 'Finishes',
      keywords: ['building', 'floor finishes', 'screeding', 'tiles', 'terrazzo', 'marble', 'vinyl'],
    }
  ),
  buildingBillSection(
    'ceiling_works',
    'Ceiling Works',
    'POP ceiling, suspended ceiling, PVC ceiling, gypsum board ceiling, and ceiling accessories.',
    BuildingCatalog.BUILDING_CEILINGWORKS_ITEMS,
    {
      trade: 'Finishes',
      keywords: ['building', 'ceiling', 'pop', 'suspended ceiling', 'pvc ceiling', 'gypsum board'],
    }
  ),
  buildingBillSection(
    'painting_decoration',
    'Painting & Decoration',
    'Primer, emulsion paint, gloss paint, textured paint, protective coatings, and decorative finishes.',
    BuildingCatalog.BUILDING_PAINTING_ITEMS,
    {
      trade: 'Finishes',
      keywords: ['building', 'painting', 'decoration', 'emulsion', 'gloss paint', 'coatings'],
    }
  ),
  buildingBillSection(
    'plumbing_drainage',
    'Plumbing & Drainage',
    'Water supply pipes, waste pipes, sanitary fittings, floor drains, inspection chambers, and internal drainage.',
    BuildingCatalog.BUILDING_PLUMBING_ITEMS,
    {
      trade: 'Plumbing',
      keywords: ['building', 'plumbing', 'drainage', 'sanitary fittings', 'waste pipes', 'floor drains'],
    }
  ),
  buildingBillSection(
    'electrical_installation',
    'Electrical Installation',
    'Conduits, wiring, switches, sockets, lighting points, distribution boards, earthing, and electrical fixtures.',
    BuildingCatalog.BUILDING_ELECTRICAL_ITEMS,
    {
      trade: 'Electrical',
      keywords: ['building', 'electrical', 'conduits', 'wiring', 'switches', 'sockets', 'earthing'],
    }
  ),
  buildingBillSection(
    'mechanical_services',
    'Mechanical Services',
    'HVAC, ventilation, fire protection, pumps, ducts, and other mechanical installations.',
    BuildingCatalog.BUILDING_MECHANICAL_ITEMS,
    {
      trade: 'Mechanical',
      keywords: ['building', 'mechanical', 'hvac', 'ventilation', 'fire protection', 'ducts', 'pumps'],
    }
  ),
  buildingBillSection(
    'water_supply_storage',
    'Water Supply & Storage',
    'Borehole, water tanks, pumps, pipe connections, supports, and water storage systems.',
    BuildingCatalog.BUILDING_WATERSERVICES_ITEMS,
    {
      trade: 'Water Services',
      keywords: ['building', 'water supply', 'storage', 'borehole', 'water tanks', 'pumps'],
    }
  ),
  buildingBillSection(
    'sewage_waste_disposal',
    'Sewage & Waste Disposal',
    'Septic tanks, soakaway pits, sewer pipes, manholes, and wastewater disposal systems.',
    BuildingCatalog.BUILDING_SANITATION_ITEMS,
    {
      trade: 'Sanitation',
      keywords: ['building', 'sewage', 'waste disposal', 'septic tank', 'soakaway', 'manholes'],
    }
  ),
  buildingBillSection(
    'fixtures_fittings',
    'Fixtures & Fittings',
    'Kitchen cabinets, wardrobes, counters, shelves, sanitary accessories, and built-in fittings.',
    BuildingCatalog.BUILDING_FIXTURES_ITEMS,
    {
      trade: 'Fixtures & Fittings',
      keywords: ['building', 'fixtures', 'fittings', 'cabinets', 'wardrobes', 'shelves'],
    }
  ),
  buildingBillSection(
    'external_works',
    'External Works',
    'Compound paving, landscaping, drainage, fencing, gates, kerbs, walkways, and external services.',
    BuildingCatalog.BUILDING_EXTERNALWORKS_ITEMS,
    {
      trade: 'External Works',
      keywords: ['building', 'external works', 'paving', 'landscaping', 'fencing', 'gates', 'walkways'],
    }
  ),
  buildingBillSection(
    'testing_commissioning',
    'Testing & Commissioning',
    'Electrical testing, plumbing pressure testing, mechanical system checks, and commissioning reports.',
    BuildingCatalog.BUILDING_COMMISSIONING_ITEMS,
    {
      trade: 'Testing & Commissioning',
      keywords: ['building', 'testing', 'commissioning', 'pressure testing', 'system checks'],
    }
  ),
  buildingBillSection(
    'final_cleaning_handover',
    'Final Cleaning & Handover',
    'Final cleaning, snagging, corrections, documentation, and handover preparation.',
    BuildingCatalog.BUILDING_CLOSEOUT_ITEMS,
    {
      trade: 'Project Closeout',
      keywords: ['building', 'final cleaning', 'handover', 'snagging', 'documentation', 'closeout'],
    }
  ),
];

const ROAD_SECTIONS = [
  catalogSection(
    ROAD_CODE,
    'preliminaries',
    'Preliminaries',
    'Road preliminaries bill with supervision, temporary works, traffic control, welfare, utilities, and site compliance items.',
    createRoadPreliminariesItems(ROAD_CODE),
    {
      trade: 'Preliminaries',
      pickerPrompt: 'Pick only the road preliminaries the contract needs before creating BOQ rows: supervision, setting out, traffic diversion, temporary facilities, utilities, welfare, and compliance items.',
      emptyStateTitle: 'No road preliminaries selected yet.',
      emptyStateMessage: 'Open the road preliminaries library and add only the supervision, temporary access, traffic, welfare, utilities, and compliance items that genuinely apply to this road project.',
    }
  ),
  catalogSection(
    ROAD_CODE,
    'site_clearance_demolition',
    'Site Clearance & Demolition',
    'Right-of-way clearing, demolition, salvage, haulage, and rough grading items required to open the road corridor for construction.',
    createRoadSiteClearanceDemolitionItems(ROAD_CODE),
    {
      trade: 'Site Clearance & Demolition',
      pickerPrompt: 'Choose only the road site-clearance and demolition items you need before creating BOQ rows: clearing, stripping, demolition, haulage, salvage, and environmental control items.',
      emptyStateTitle: 'No site-clearance items selected yet.',
      emptyStateMessage: 'Open the Road site-clearance library and add only the clearing, demolition, disposal, salvage, and environmental items that apply to this corridor.',
    }
  ),
  catalogSection(ROAD_CODE, 'earthworks', 'Earthworks', 'Formation shaping, excavation, fill, and compaction.', roadMeasuredItems(ROAD_CODE, 'EWK', 'Earthworks', ROAD_EARTHWORK_ITEMS)),
  catalogSection(ROAD_CODE, 'subgrade', 'Subgrade', 'Subgrade preparation and stabilization.', roadMeasuredItems(ROAD_CODE, 'SGR', 'Subgrade', ROAD_SUBGRADE_ITEMS)),
  catalogSection(ROAD_CODE, 'sub_base', 'Sub-base', 'Granular sub-base construction.', roadMeasuredItems(ROAD_CODE, 'SUB', 'Sub-base', ROAD_SUB_BASE_ITEMS)),
  catalogSection(ROAD_CODE, 'base_course', 'Base course', 'Crushed stone base or treated base course.', roadMeasuredItems(ROAD_CODE, 'BAS', 'Base course', ROAD_BASE_COURSE_ITEMS)),
  catalogSection(ROAD_CODE, 'surfacing', 'Surfacing', 'Bituminous prime coat, binder, and wearing course items.', roadMeasuredItems(ROAD_CODE, 'SUR', 'Surfacing', ROAD_SURFACING_ITEMS)),
  catalogSection(ROAD_CODE, 'drainage', 'Drainage', 'Roadside drains, culverts, and catchpit works.', roadMeasuredItems(ROAD_CODE, 'DRN', 'Drainage', ROAD_DRAINAGE_ITEMS)),
  catalogSection(ROAD_CODE, 'road_furniture', 'Road furniture', 'Markings, signage, guardrails, and lighting.', roadMeasuredItems(ROAD_CODE, 'FUR', 'Road furniture', ROAD_FURNITURE_ITEMS)),
  catalogSection(ROAD_CODE, 'external_finishing', 'External / finishing items', 'Shoulders, kerbs, medians, and ancillary finishing works.', roadMeasuredItems(ROAD_CODE, 'FIN', 'External / finishing items', ROAD_EXTERNAL_FINISHING_ITEMS)),
];

const BRIDGE_SECTIONS = [
  catalogSection(
    BRIDGE_CODE,
    'preliminaries',
    'Preliminaries',
    'Bridge preliminaries, safety, and temporary setup.',
    createPreliminariesItems(BRIDGE_CODE, { includeTraffic: true }),
    {
      trade: 'Preliminaries',
      pickerPrompt: 'Pick the bridge preliminaries that cover safety, site access, traffic measures, and temporary support arrangements before production items.',
      emptyStateMessage: 'Bridge works usually need a deliberate preliminaries setup. Add only the temporary, safety, supervision, and traffic items that apply here.',
    }
  ),
  catalogSection(BRIDGE_CODE, 'earthworks', 'Earthworks', 'Approach earthworks and working platform preparation.', [
    formulaRateItem({ name: 'Approach excavation', description: 'Excavate approach roads and abutment areas.', unit: 'm³',
      inputs: buildRateInputs({ materials: 2160, labour: 540, plant: 540, transport: 180, overhead: 180 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Working platform fill', description: 'Imported fill and stabilization to working platforms.', unit: 'm³',
      inputs: buildRateInputs({ materials: 7680, labour: 1920, plant: 1920, transport: 640, overhead: 640 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Approach embankment fill', description: 'Selected fill to embankment and transition wedges.', unit: 'm³',
      inputs: buildRateInputs({ materials: 6720, labour: 1680, plant: 1680, transport: 560, overhead: 560 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Compaction and proof rolling', description: 'Compaction and proof rolling of bridge approaches.', unit: 'm²',
      inputs: buildRateInputs({ materials: 516, labour: 129, plant: 129, transport: 43, overhead: 43 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(BRIDGE_CODE, 'foundations_piling', 'Foundations / piling', 'Pile, pile cap, and deep foundation items.', [
    formulaRateItem({ name: 'Bored piles', description: 'Bored cast in-situ pile construction complete.', unit: 'm',
      inputs: buildRateInputs({ materials: 82800, labour: 20700, plant: 20700, transport: 6900, overhead: 6900 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Pile reinforcement cages', description: 'Fabricate and fix pile reinforcement cages.', unit: 'kg',
      inputs: buildRateInputs({ materials: 1068, labour: 267, plant: 267, transport: 89, overhead: 89 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Pile cap concrete', description: 'Concrete to pile caps and foundation blocks.', unit: 'm³', inputs: buildRateInputs({ materials: 92000, labour: 14800, plant: 12600, transport: 5100, overhead: 6500 }) }),
    formulaRateItem({ name: 'Pile testing', description: 'Integrity and load testing to piles.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 570000, labour: 142500, plant: 142500, transport: 47500, overhead: 47500 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(BRIDGE_CODE, 'substructure', 'Substructure', 'Abutments, piers, and return wall items.', [
    formulaRateItem({ name: 'Pier reinforcement', description: 'Reinforcement to piers, abutments, and walls.', unit: 'kg',
      inputs: buildRateInputs({ materials: 1032, labour: 258, plant: 258, transport: 86, overhead: 86 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Substructure formwork', description: 'Formwork to piers, abutments, and wing walls.', unit: 'm²',
      inputs: buildRateInputs({ materials: 11100, labour: 2775, plant: 2775, transport: 925, overhead: 925 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Pier and abutment concrete', description: 'Concrete to abutments, piers, and walls.', unit: 'm³', inputs: buildRateInputs({ materials: 94000, labour: 15200, plant: 13200, transport: 5200, overhead: 6800 }) }),
    formulaRateItem({ name: 'Wing walls and return walls', description: 'Wing wall and return wall construction complete.', unit: 'm³',
      inputs: buildRateInputs({ materials: 112800, labour: 28200, plant: 28200, transport: 9400, overhead: 9400 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(BRIDGE_CODE, 'superstructure', 'Superstructure', 'Girders, diaphragms, and deck support systems.', [
    formulaRateItem({ name: 'Girders / beams', description: 'Precast or in-situ beams and girder components.', unit: 'm',
      inputs: buildRateInputs({ materials: 255000, labour: 63750, plant: 63750, transport: 21250, overhead: 21250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Diaphragm works', description: 'Diaphragm reinforcement, formwork, and concrete.', unit: 'm³',
      inputs: buildRateInputs({ materials: 115200, labour: 28800, plant: 28800, transport: 9600, overhead: 9600 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Parapet starter bars', description: 'Parapet starter bars, inserts, and edge details.', unit: 'kg',
      inputs: buildRateInputs({ materials: 1092, labour: 273, plant: 273, transport: 91, overhead: 91 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Deck waterproofing membrane', description: 'Waterproofing membrane to bridge deck before surfacing.', unit: 'm²',
      inputs: buildRateInputs({ materials: 3720, labour: 930, plant: 930, transport: 310, overhead: 310 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(BRIDGE_CODE, 'deck_works', 'Deck works', 'Deck slab, surfacing, and parapet items.', [
    formulaRateItem({ name: 'Deck slab concrete', description: 'Concrete to bridge deck slab complete.', unit: 'm³', inputs: buildRateInputs({ materials: 96000, labour: 15800, plant: 14000, transport: 5600, overhead: 7000 }) }),
    formulaRateItem({ name: 'Deck reinforcement', description: 'Cut, bend, and fix reinforcement to deck slab.', unit: 'kg',
      inputs: buildRateInputs({ materials: 1050, labour: 262, plant: 262, transport: 89, overhead: 87 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Parapets and railings', description: 'Parapet walls, steel rails, and pedestrian edge details.', unit: 'm',
      inputs: buildRateInputs({ materials: 70800, labour: 17700, plant: 17700, transport: 5900, overhead: 5900 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Bridge deck surfacing', description: 'Bituminous deck surfacing or wearing course.', unit: 'm²',
      inputs: buildRateInputs({ materials: 11280, labour: 2820, plant: 2820, transport: 940, overhead: 940 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(BRIDGE_CODE, 'bearings_joints', 'Bearings / joints', 'Bearing installation and expansion joint works.', [
    formulaRateItem({ name: 'Bridge bearings', description: 'Supply and install bridge bearings complete.', unit: 'Set',
      inputs: buildRateInputs({ materials: 171000, labour: 42750, plant: 42750, transport: 14250, overhead: 14250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Expansion joints', description: 'Bridge expansion joints complete with accessories.', unit: 'm',
      inputs: buildRateInputs({ materials: 147000, labour: 36750, plant: 36750, transport: 12250, overhead: 12250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Bearing plinths and grout', description: 'Bearing plinth concrete and non-shrink grout.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 50400, labour: 12600, plant: 12600, transport: 4200, overhead: 4200 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(BRIDGE_CODE, 'drainage', 'Drainage', 'Bridge deck drainage and downpipe systems.', [
    formulaRateItem({ name: 'Scupper drains', description: 'Deck scupper drains and outlets.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 75000, labour: 18750, plant: 18750, transport: 6250, overhead: 6250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Downpipes and drainage outlets', description: 'Downpipes and bridge drainage outlet system.', unit: 'm',
      inputs: buildRateInputs({ materials: 13200, labour: 3300, plant: 3300, transport: 1100, overhead: 1100 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Approach drainage tie-in', description: 'Tie bridge drainage into approach drainage system.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 570000, labour: 142500, plant: 142500, transport: 47500, overhead: 47500 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(BRIDGE_CODE, 'protection_works', 'Protection works', 'River training, scour, and protection items.', [
    formulaRateItem({ name: 'Gabion protection', description: 'Gabion protection to river banks and abutment toe.', unit: 'm³',
      inputs: buildRateInputs({ materials: 26700, labour: 6675, plant: 6675, transport: 2225, overhead: 2225 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Stone pitching', description: 'Stone pitching and filter layer to protected slopes.', unit: 'm²',
      inputs: buildRateInputs({ materials: 17700, labour: 4425, plant: 4425, transport: 1475, overhead: 1475 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Scour apron', description: 'Concrete or rock scour apron construction.', unit: 'm²',
      inputs: buildRateInputs({ materials: 21900, labour: 5475, plant: 5475, transport: 1825, overhead: 1825 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'River training works', description: 'Minor river training and channel stabilization works.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 1710000, labour: 427500, plant: 427500, transport: 142500, overhead: 142500 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(BRIDGE_CODE, 'finishes_accessories', 'Finishes / accessories', 'Approach slabs, painting, and completion items.', [
    formulaRateItem({ name: 'Approach slabs', description: 'Approach slab construction complete.', unit: 'm³',
      inputs: buildRateInputs({ materials: 105000, labour: 26250, plant: 26250, transport: 8750, overhead: 8750 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Protective coating', description: 'Protective coating to exposed steel or concrete surfaces.', unit: 'm²',
      inputs: buildRateInputs({ materials: 2520, labour: 630, plant: 630, transport: 210, overhead: 210 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Name plates and markers', description: 'Bridge name plates, chainage markers, and accessories.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 312000, labour: 78000, plant: 78000, transport: 26000, overhead: 26000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
];

const DRAINAGE_SECTIONS = [
  catalogSection(
    DRAINAGE_CODE,
    'preliminaries',
    'Preliminaries',
    'Drainage preliminaries and enabling works.',
    createPreliminariesItems(DRAINAGE_CODE),
    {
      trade: 'Preliminaries',
      pickerPrompt: 'Choose the drainage preliminaries you need for access, supervision, HSE, temporary facilities, and site startup.',
    }
  ),
  catalogSection(DRAINAGE_CODE, 'excavation', 'Excavation', 'Excavation, trimming, and spoil disposal.', [
    formulaRateItem({ name: 'Trench excavation', description: 'Excavate drain or trench to line and level.', unit: 'm³',
      inputs: buildRateInputs({ materials: 2520, labour: 630, plant: 630, transport: 210, overhead: 210 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Excavation support', description: 'Temporary support to trench sides where required.', unit: 'm²',
      inputs: buildRateInputs({ materials: 8700, labour: 2175, plant: 2175, transport: 725, overhead: 725 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Cart away spoil', description: 'Load and cart away unsuitable spoil.', unit: 'm³',
      inputs: buildRateInputs({ materials: 1620, labour: 405, plant: 405, transport: 135, overhead: 135 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Formation trimming', description: 'Trim formation and prepare for bedding.', unit: 'm²',
      inputs: buildRateInputs({ materials: 390, labour: 97, plant: 97, transport: 34, overhead: 32 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(DRAINAGE_CODE, 'bedding', 'Bedding', 'Drain bedding, blinding, and formation layers.', [
    formulaRateItem({ name: 'Sand bedding', description: 'Sand bedding to drain invert or pipe base.', unit: 'm³',
      inputs: buildRateInputs({ materials: 4920, labour: 1230, plant: 1230, transport: 410, overhead: 410 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Lean concrete blinding', description: 'Concrete blinding to bases and formation.', unit: 'm³',
      inputs: buildRateInputs({ materials: 40800, labour: 10200, plant: 10200, transport: 3400, overhead: 3400 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Geotextile separator', description: 'Geotextile separator layer at weak formation.', unit: 'm²',
      inputs: buildRateInputs({ materials: 2280, labour: 570, plant: 570, transport: 190, overhead: 190 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(DRAINAGE_CODE, 'concrete_works', 'Concrete works', 'In-situ concrete to walls, bases, and covers.', [
    formulaRateItem({ name: 'Drain base concrete', description: 'Concrete to drain base slab.', unit: 'm³', inputs: buildRateInputs({ materials: 78000, labour: 11800, plant: 9200, transport: 3800, overhead: 5200 }) }),
    formulaRateItem({ name: 'Drain wall concrete', description: 'Concrete to side walls, kicker, and haunches.', unit: 'm³', inputs: buildRateInputs({ materials: 80500, labour: 12200, plant: 9400, transport: 3900, overhead: 5400 }) }),
    formulaRateItem({ name: 'Reinforcement to drains', description: 'Cut, bend, and fix reinforcement to drains.', unit: 'kg',
      inputs: buildRateInputs({ materials: 1008, labour: 252, plant: 252, transport: 84, overhead: 84 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Formwork to drains', description: 'Formwork to sides, soffits, and cover units.', unit: 'm²',
      inputs: buildRateInputs({ materials: 9720, labour: 2430, plant: 2430, transport: 810, overhead: 810 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(DRAINAGE_CODE, 'installation', 'Channel / drain installation', 'Precast or in-situ drain unit installation.', [
    formulaRateItem({ name: 'In-situ rectangular drain', description: 'In-situ reinforced concrete drain construction.', unit: 'm',
      inputs: buildRateInputs({ materials: 17100, labour: 4275, plant: 4275, transport: 1425, overhead: 1425 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Precast U-drain units', description: 'Supply and lay precast U-drain units complete.', unit: 'm',
      inputs: buildRateInputs({ materials: 19500, labour: 4875, plant: 4875, transport: 1625, overhead: 1625 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Cover slabs / gratings', description: 'Drain cover slabs, gratings, and access covers.', unit: 'm',
      inputs: buildRateInputs({ materials: 10680, labour: 2670, plant: 2670, transport: 890, overhead: 890 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Manholes and catchpits', description: 'Manholes, catchpits, and access structures.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 99000, labour: 24750, plant: 24750, transport: 8250, overhead: 8250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(DRAINAGE_CODE, 'backfilling', 'Backfilling', 'Backfilling, surround, and compaction.', [
    formulaRateItem({ name: 'Selected backfilling', description: 'Selected backfill around drain walls and covers.', unit: 'm³',
      inputs: buildRateInputs({ materials: 3120, labour: 780, plant: 780, transport: 260, overhead: 260 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Pipe surround material', description: 'Selected pipe surround or sidefill material.', unit: 'm³',
      inputs: buildRateInputs({ materials: 4560, labour: 1140, plant: 1140, transport: 380, overhead: 380 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Compaction in layers', description: 'Compaction of backfill in approved layers.', unit: 'm²',
      inputs: buildRateInputs({ materials: 408, labour: 102, plant: 102, transport: 34, overhead: 34 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(DRAINAGE_CODE, 'protection_works', 'Protection works', 'Outfall and erosion protection works.', [
    formulaRateItem({ name: 'Stone pitching', description: 'Stone pitching to outfalls and side slopes.', unit: 'm²',
      inputs: buildRateInputs({ materials: 17100, labour: 4275, plant: 4275, transport: 1425, overhead: 1425 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Concrete apron', description: 'Concrete apron and cutoff walls at discharge points.', unit: 'm³',
      inputs: buildRateInputs({ materials: 82800, labour: 20700, plant: 20700, transport: 6900, overhead: 6900 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Slope restoration', description: 'Topsoil and turfing to disturbed slopes.', unit: 'm²',
      inputs: buildRateInputs({ materials: 2520, labour: 630, plant: 630, transport: 210, overhead: 210 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Safety rails / markers', description: 'Safety rails and warning markers to exposed drains.', unit: 'm',
      inputs: buildRateInputs({ materials: 11280, labour: 2820, plant: 2820, transport: 940, overhead: 940 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(DRAINAGE_CODE, 'testing_finishing', 'Testing / finishing', 'Finishing, cleanup, and testing items.', [
    formulaRateItem({ name: 'Flow testing and flushing', description: 'Flow testing, flushing, and debris removal.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 288000, labour: 72000, plant: 72000, transport: 24000, overhead: 24000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Benchings and channel finish', description: 'Benchings, plaster finish, and joint treatment.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 14700, labour: 3675, plant: 3675, transport: 1225, overhead: 1225 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Final cleanup and handover', description: 'Completion cleaning, snagging, and handover.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 192000, labour: 48000, plant: 48000, transport: 16000, overhead: 16000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
];

const CULVERT_SECTIONS = [
  catalogSection(
    CULVERT_CODE,
    'preliminaries',
    'Preliminaries',
    'Culvert preliminaries and enabling works.',
    createPreliminariesItems(CULVERT_CODE, { includeTraffic: true }),
    {
      trade: 'Preliminaries',
      pickerPrompt: 'Choose the culvert preliminaries required for setup, supervision, HSE, traffic control, and temporary support works.',
    }
  ),
  catalogSection(CULVERT_CODE, 'excavation', 'Excavation', 'Excavation and formation for culvert placement.', [
    formulaRateItem({ name: 'Excavate culvert trench', description: 'Excavate trench or box culvert foundation.', unit: 'm³',
      inputs: buildRateInputs({ materials: 2760, labour: 690, plant: 690, transport: 230, overhead: 230 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Excavate for headwalls', description: 'Excavate for headwalls, wing walls, and aprons.', unit: 'm³',
      inputs: buildRateInputs({ materials: 2880, labour: 720, plant: 720, transport: 240, overhead: 240 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Dewatering and diversion', description: 'Dewatering, flow diversion, and site protection.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 750000, labour: 187500, plant: 187500, transport: 62500, overhead: 62500 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Spoil disposal', description: 'Cart away excavated spoil to approved dump.', unit: 'm³',
      inputs: buildRateInputs({ materials: 1680, labour: 420, plant: 420, transport: 140, overhead: 140 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(CULVERT_CODE, 'bedding', 'Bedding', 'Bedding and blinding layers for culvert units.', [
    formulaRateItem({ name: 'Sand bedding', description: 'Sand bedding below pipes or base slab.', unit: 'm³',
      inputs: buildRateInputs({ materials: 5160, labour: 1290, plant: 1290, transport: 430, overhead: 430 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Lean concrete blinding', description: 'Lean concrete blinding below culvert units.', unit: 'm³',
      inputs: buildRateInputs({ materials: 41700, labour: 10425, plant: 10425, transport: 3475, overhead: 3475 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Granular sub-base', description: 'Granular base or bedding support to formation.', unit: 'm³',
      inputs: buildRateInputs({ materials: 14700, labour: 3675, plant: 3675, transport: 1225, overhead: 1225 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(CULVERT_CODE, 'concrete_works', 'Concrete works', 'Concrete, reinforcement, and formwork to culvert structures.', [
    formulaRateItem({ name: 'Base slab concrete', description: 'Concrete to culvert base slab.', unit: 'm³', inputs: buildRateInputs({ materials: 82000, labour: 12400, plant: 9500, transport: 4100, overhead: 5600 }) }),
    formulaRateItem({ name: 'Wall and slab concrete', description: 'Concrete to culvert walls and top slab.', unit: 'm³', inputs: buildRateInputs({ materials: 85000, labour: 12800, plant: 9800, transport: 4200, overhead: 5900 }) }),
    formulaRateItem({ name: 'Reinforcement to culvert', description: 'Reinforcement cutting, bending, and fixing.', unit: 'kg',
      inputs: buildRateInputs({ materials: 1020, labour: 255, plant: 255, transport: 85, overhead: 85 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Formwork to culvert', description: 'Formwork to walls, soffits, and edges.', unit: 'm²',
      inputs: buildRateInputs({ materials: 10080, labour: 2520, plant: 2520, transport: 840, overhead: 840 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(CULVERT_CODE, 'culvert_installation', 'Pipe / box culvert installation', 'Supply and installation of culvert units.', [
    formulaRateItem({ name: 'RCC pipe culvert installation', description: 'Supply and lay RCC pipe culverts complete.', unit: 'm',
      inputs: buildRateInputs({ materials: 37200, labour: 9300, plant: 9300, transport: 3100, overhead: 3100 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Precast box culvert units', description: 'Supply and place precast box culvert units.', unit: 'm',
      inputs: buildRateInputs({ materials: 87000, labour: 21750, plant: 21750, transport: 7250, overhead: 7250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'In-situ box culvert construction', description: 'Construct in-situ reinforced concrete box culvert.', unit: 'm',
      inputs: buildRateInputs({ materials: 112800, labour: 28200, plant: 28200, transport: 9400, overhead: 9400 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Jointing and sealing', description: 'Jointing, sealing, and bedding adjustment to culvert units.', unit: 'm',
      inputs: buildRateInputs({ materials: 4680, labour: 1170, plant: 1170, transport: 390, overhead: 390 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(CULVERT_CODE, 'headwalls_wing_walls', 'Headwalls / wing walls', 'Headwalls, wing walls, and aprons.', [
    formulaRateItem({ name: 'Headwalls', description: 'Headwalls complete with reinforcement and concrete.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 408000, labour: 102000, plant: 102000, transport: 34000, overhead: 34000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Wing walls', description: 'Wing walls complete with return walls and toe details.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 324000, labour: 81000, plant: 81000, transport: 27000, overhead: 27000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Aprons and cutoff walls', description: 'Aprons, toe walls, and cutoff walls to culvert ends.', unit: 'm³',
      inputs: buildRateInputs({ materials: 85200, labour: 21300, plant: 21300, transport: 7100, overhead: 7100 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(CULVERT_CODE, 'backfilling', 'Backfilling', 'Backfilling and compaction around culvert units.', [
    formulaRateItem({ name: 'Selected surround/backfill', description: 'Selected material backfill around culvert structure.', unit: 'm³',
      inputs: buildRateInputs({ materials: 3360, labour: 840, plant: 840, transport: 280, overhead: 280 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Compaction in layers', description: 'Compaction around culvert in layers.', unit: 'm²',
      inputs: buildRateInputs({ materials: 432, labour: 108, plant: 108, transport: 36, overhead: 36 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Approach reinstatement', description: 'Reinstate road formation above culvert crossing.', unit: 'm²',
      inputs: buildRateInputs({ materials: 5880, labour: 1470, plant: 1470, transport: 490, overhead: 490 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(CULVERT_CODE, 'protection_works', 'Protection works', 'Erosion control and outlet protection.', [
    formulaRateItem({ name: 'Stone pitching', description: 'Stone pitching to inlet and outlet channels.', unit: 'm²',
      inputs: buildRateInputs({ materials: 17280, labour: 4320, plant: 4320, transport: 1440, overhead: 1440 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Gabion / riprap protection', description: 'Gabion or riprap protection to vulnerable areas.', unit: 'm³',
      inputs: buildRateInputs({ materials: 26700, labour: 6675, plant: 6675, transport: 2225, overhead: 2225 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Concrete side drains tie-in', description: 'Tie culvert ends into side drains or channels.', unit: 'm',
      inputs: buildRateInputs({ materials: 11520, labour: 2880, plant: 2880, transport: 960, overhead: 960 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(CULVERT_CODE, 'testing_finishing', 'Testing / finishing', 'Cleanup, flushing, and completion items.', [
    formulaRateItem({ name: 'Flow path cleanup', description: 'Flow path cleanup and obstruction removal.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 144000, labour: 36000, plant: 36000, transport: 12000, overhead: 12000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Completion snagging', description: 'Minor snagging, touch-up, and final handover.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 108000, labour: 27000, plant: 27000, transport: 9000, overhead: 9000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'As-built setting out checks', description: 'Final dimensional and level confirmation of completed culvert.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 132000, labour: 33000, plant: 33000, transport: 11000, overhead: 11000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
];

const COASTAL_SECTIONS = [
  catalogSection(
    COASTAL_CODE,
    'preliminaries',
    'Preliminaries',
    'Marine mobilization, safety, and enabling works.',
    createPreliminariesItems(COASTAL_CODE, { includeMarine: true, includeTraffic: true }),
    {
      trade: 'Preliminaries',
      pickerPrompt: 'Build the marine preliminaries carefully: mobilization, marine safety, traffic or access control, supervision, and temporary site support.',
    }
  ),
  catalogSection(COASTAL_CODE, 'dredging_reclamation', 'Dredging / reclamation', 'Dredging, filling, and reclamation works.', [
    formulaRateItem({ name: 'Maintenance dredging', description: 'Maintenance dredging to design depth and alignment.', unit: 'm³',
      inputs: buildRateInputs({ materials: 2520, labour: 630, plant: 630, transport: 210, overhead: 210 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Hydraulic fill placement', description: 'Hydraulic sand fill placement and trimming.', unit: 'm³',
      inputs: buildRateInputs({ materials: 4080, labour: 1020, plant: 1020, transport: 340, overhead: 340 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Reclamation compaction', description: 'Compaction and settlement management for reclaimed areas.', unit: 'm²',
      inputs: buildRateInputs({ materials: 708, labour: 177, plant: 177, transport: 59, overhead: 59 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Survey monitoring', description: 'Hydrographic and settlement monitoring during dredging/reclamation.', unit: 'Month',
      inputs: buildRateInputs({ materials: 1110000, labour: 277500, plant: 277500, transport: 92500, overhead: 92500 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(COASTAL_CODE, 'earthworks_geotech', 'Earthworks / geotechnical', 'Marine geotechnical and stabilization works.', [
    formulaRateItem({ name: 'Sheet pile driving', description: 'Drive sheet piles or retaining elements to line and level.', unit: 'm²',
      inputs: buildRateInputs({ materials: 88800, labour: 22200, plant: 22200, transport: 7400, overhead: 7400 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Tie rods and walers', description: 'Supply and install tie rods, walers, and anchor components.', unit: 'Set',
      inputs: buildRateInputs({ materials: 171000, labour: 42750, plant: 42750, transport: 14250, overhead: 14250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Filter layers', description: 'Filter stone and geotextile behind retaining structures.', unit: 'm³',
      inputs: buildRateInputs({ materials: 16080, labour: 4020, plant: 4020, transport: 1340, overhead: 1340 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Ground improvement', description: 'Ground improvement or stabilization to marine edge.', unit: 'm²',
      inputs: buildRateInputs({ materials: 13500, labour: 3375, plant: 3375, transport: 1125, overhead: 1125 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(COASTAL_CODE, 'marine_structures', 'Marine structures', 'Concrete and steel marine structure items.', [
    formulaRateItem({ name: 'Marine concrete', description: 'Marine grade reinforced concrete to quay, jetty, or revetment structures.', unit: 'm³', inputs: buildRateInputs({ materials: 112000, labour: 17500, plant: 16500, transport: 6800, overhead: 8200 }) }),
    formulaRateItem({ name: 'Marine reinforcement', description: 'Reinforcement to marine structural elements.', unit: 'kg',
      inputs: buildRateInputs({ materials: 1092, labour: 273, plant: 273, transport: 91, overhead: 91 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Cathodic protection fixtures', description: 'Corrosion protection accessories to marine steelwork.', unit: 'Set',
      inputs: buildRateInputs({ materials: 408000, labour: 102000, plant: 102000, transport: 34000, overhead: 34000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Precast armour units', description: 'Supply and place precast armour or wave-dissipating units.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 171000, labour: 42750, plant: 42750, transport: 14250, overhead: 14250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(COASTAL_CODE, 'shoreline_protection', 'Revetment / shoreline protection', 'Rock armour, revetment, and shoreline defense.', [
    formulaRateItem({ name: 'Rock armour placement', description: 'Place primary armour rock to shoreline profile.', unit: 'Tonne',
      inputs: buildRateInputs({ materials: 15900, labour: 3975, plant: 3975, transport: 1325, overhead: 1325 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Underlayer stone', description: 'Place filter stone and underlayer material.', unit: 'Tonne',
      inputs: buildRateInputs({ materials: 14700, labour: 3675, plant: 3675, transport: 1225, overhead: 1225 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Crest wall concrete', description: 'Concrete crest wall and splash apron.', unit: 'm³',
      inputs: buildRateInputs({ materials: 111000, labour: 27750, plant: 27750, transport: 9250, overhead: 9250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Toe protection', description: 'Toe trench excavation and buried armour placement.', unit: 'm',
      inputs: buildRateInputs({ materials: 22080, labour: 5520, plant: 5520, transport: 1840, overhead: 1840 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(COASTAL_CODE, 'drainage_outfalls', 'Drainage / outfalls', 'Outfall, flap valve, and drainage tie-in works.', [
    formulaRateItem({ name: 'Outfall structures', description: 'Outfall headwalls, flap valves, and scour protections.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 1110000, labour: 277500, plant: 277500, transport: 92500, overhead: 92500 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Drainage pits and chambers', description: 'Drainage pits, chambers, and inspection structures.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 171000, labour: 42750, plant: 42750, transport: 14250, overhead: 14250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Marine outfall pipeline', description: 'Outfall pipeline and associated fittings.', unit: 'm',
      inputs: buildRateInputs({ materials: 76800, labour: 19200, plant: 19200, transport: 6400, overhead: 6400 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(COASTAL_CODE, 'access_utilities', 'Access / utilities', 'Access roads, utilities, and marine ancillary services.', [
    formulaRateItem({ name: 'Access road pavement', description: 'Access road sub-base, base, and surfacing package.', unit: 'm²',
      inputs: buildRateInputs({ materials: 9300, labour: 2325, plant: 2325, transport: 775, overhead: 775 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Service ducts and sleeves', description: 'Utility ducts, sleeves, and service crossings.', unit: 'm',
      inputs: buildRateInputs({ materials: 13500, labour: 3375, plant: 3375, transport: 1125, overhead: 1125 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Power and lighting to marine edge', description: 'Power supply and lighting to marine operating areas.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 2550000, labour: 637500, plant: 637500, transport: 212500, overhead: 212500 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(COASTAL_CODE, 'finishes_accessories', 'Finishes / accessories', 'Final marine accessories and finishing items.', [
    formulaRateItem({ name: 'Safety ladders and bollards', description: 'Marine ladders, bollards, and edge safety accessories.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 45600, labour: 11400, plant: 11400, transport: 3800, overhead: 3800 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Mooring accessories', description: 'Chains, cleats, and other mooring accessories.', unit: 'Set',
      inputs: buildRateInputs({ materials: 231000, labour: 57750, plant: 57750, transport: 19250, overhead: 19250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Completion survey and as-built', description: 'Final marine survey and as-built documentation.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 552000, labour: 138000, plant: 138000, transport: 46000, overhead: 46000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
];

const FOUNDATION_SECTIONS = [
  catalogSection(
    FOUNDATION_CODE,
    'preliminaries',
    'Preliminaries',
    'Foundation preliminaries and enabling works.',
    createPreliminariesItems(FOUNDATION_CODE),
    {
      trade: 'Preliminaries',
      pickerPrompt: 'Pick the foundation preliminaries you need for site setup, welfare, HSE, supervision, and temporary works support.',
    }
  ),
  catalogSection(FOUNDATION_CODE, 'site_clearance_setting_out', 'Site clearance / setting out', 'Site clearance and foundation setting out.', [
    formulaRateItem({ name: 'Clear foundation footprint', description: 'Clear site area and establish foundation footprint.', unit: 'm²',
      inputs: buildRateInputs({ materials: 372, labour: 93, plant: 93, transport: 31, overhead: 31 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Detailed setting out', description: 'Set out foundation grids, benchmarks, and batter boards.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 252000, labour: 63000, plant: 63000, transport: 21000, overhead: 21000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Access and haul roads', description: 'Temporary access for excavation and concrete placement.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 468000, labour: 117000, plant: 117000, transport: 39000, overhead: 39000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(FOUNDATION_CODE, 'excavation', 'Excavation', 'Excavation to foundations, raft, or pile caps.', [
    formulaRateItem({ name: 'Excavate footing pits', description: 'Excavate foundation pits and trenches.', unit: 'm³',
      inputs: buildRateInputs({ materials: 2640, labour: 660, plant: 660, transport: 220, overhead: 220 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Excavate pile cap areas', description: 'Excavate pile cap, raft, and deepened zones.', unit: 'm³',
      inputs: buildRateInputs({ materials: 3120, labour: 780, plant: 780, transport: 260, overhead: 260 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Dewatering', description: 'Dewatering and groundwater control for foundation pits.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 570000, labour: 142500, plant: 142500, transport: 47500, overhead: 47500 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Spoil disposal', description: 'Cart away surplus excavated material.', unit: 'm³',
      inputs: buildRateInputs({ materials: 1590, labour: 397, plant: 397, transport: 134, overhead: 132 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(FOUNDATION_CODE, 'blinding_fill_compaction', 'Blinding / fill / compaction', 'Blinding concrete, fill, and layer compaction.', [
    formulaRateItem({ name: 'Blinding concrete', description: 'Blinding concrete to foundation beds.', unit: 'm³', inputs: buildRateInputs({ materials: 42000, labour: 9500, plant: 6000, transport: 3500, overhead: 4000 }) }),
    formulaRateItem({ name: 'Imported fill', description: 'Selected imported fill and compaction under slab zones.', unit: 'm³',
      inputs: buildRateInputs({ materials: 6120, labour: 1530, plant: 1530, transport: 510, overhead: 510 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'DPM below raft/slab', description: 'Damp proof membrane below raft or slab areas.', unit: 'm²',
      inputs: buildRateInputs({ materials: 828, labour: 207, plant: 207, transport: 69, overhead: 69 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Layer compaction tests', description: 'Compaction tests and approvals to fill layers.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 55200, labour: 13800, plant: 13800, transport: 4600, overhead: 4600 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(FOUNDATION_CODE, 'reinforcement_formwork', 'Reinforcement / formwork', 'Rebar and formwork for foundation elements.', [
    formulaRateItem({ name: 'Footing reinforcement', description: 'Reinforcement to pad, strip, and combined footings.', unit: 'kg',
      inputs: buildRateInputs({ materials: 990, labour: 247, plant: 247, transport: 84, overhead: 82 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Pile cap reinforcement', description: 'Reinforcement to pile caps and ground beams.', unit: 'kg',
      inputs: buildRateInputs({ materials: 1032, labour: 258, plant: 258, transport: 86, overhead: 86 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Foundation formwork', description: 'Formwork to footings, caps, beams, and raft edges.', unit: 'm²',
      inputs: buildRateInputs({ materials: 9480, labour: 2370, plant: 2370, transport: 790, overhead: 790 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Anchor bolts / templates', description: 'Anchor bolts, holding down bolts, and templates.', unit: 'Set',
      inputs: buildRateInputs({ materials: 11100, labour: 2775, plant: 2775, transport: 925, overhead: 925 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(FOUNDATION_CODE, 'raft_pilecaps_groundbeams', 'Raft / pile caps / ground beams', 'Main structural concrete foundation elements.', [
    formulaRateItem({ name: 'Raft concrete', description: 'Concrete to raft slab and thickened zones.', unit: 'm³', inputs: buildRateInputs({ materials: 86000, labour: 13500, plant: 11000, transport: 4600, overhead: 6200 }) }),
    formulaRateItem({ name: 'Pile cap concrete', description: 'Concrete to pile caps and pedestals.', unit: 'm³', inputs: buildRateInputs({ materials: 89000, labour: 14200, plant: 11600, transport: 4700, overhead: 6400 }) }),
    formulaRateItem({ name: 'Ground beam concrete', description: 'Concrete to ground beams and tie beams.', unit: 'm³', inputs: buildRateInputs({ materials: 84500, labour: 12800, plant: 10200, transport: 4300, overhead: 5900 }) }),
    formulaRateItem({ name: 'Pile testing and trimming', description: 'Pile integrity tests, load tests, and pile head trimming.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 372000, labour: 93000, plant: 93000, transport: 31000, overhead: 31000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(FOUNDATION_CODE, 'backfilling_waterproofing', 'Backfilling / waterproofing', 'Completion items to buried foundation works.', [
    formulaRateItem({ name: 'Selected backfilling', description: 'Selected backfill around completed foundation works.', unit: 'm³',
      inputs: buildRateInputs({ materials: 3120, labour: 780, plant: 780, transport: 260, overhead: 260 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Bituminous coating', description: 'Bituminous coating to buried faces.', unit: 'm²',
      inputs: buildRateInputs({ materials: 2070, labour: 517, plant: 517, transport: 174, overhead: 172 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Anti-termite treatment', description: 'Anti-termite treatment to formation and fill.', unit: 'm²',
      inputs: buildRateInputs({ materials: 768, labour: 192, plant: 192, transport: 64, overhead: 64 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Waterproof membrane details', description: 'Waterproof membrane and joint treatment details.', unit: 'm²',
      inputs: buildRateInputs({ materials: 3720, labour: 930, plant: 930, transport: 310, overhead: 310 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(FOUNDATION_CODE, 'testing_handover', 'Testing / handover', 'QA checks, as-built, and handover.', [
    formulaRateItem({ name: 'Cube and material testing', description: 'Concrete cubes, slump tests, and material QA.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 312000, labour: 78000, plant: 78000, transport: 26000, overhead: 26000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'As-built foundation survey', description: 'Final as-built survey of completed foundations.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 156000, labour: 39000, plant: 39000, transport: 13000, overhead: 13000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Completion handover package', description: 'Snag resolution and handover documentation.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 108000, labour: 27000, plant: 27000, transport: 9000, overhead: 9000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
];

const WATER_SECTIONS = [
  catalogSection(
    WATER_CODE,
    'preliminaries',
    'Preliminaries',
    'Water and utility preliminaries and permits.',
    createPreliminariesItems(WATER_CODE, { includeTraffic: true, includeUtilityPermits: true }),
    {
      trade: 'Preliminaries',
      pickerPrompt: 'Choose the utility preliminaries that cover permits, traffic control, supervision, HSE, and temporary facilities for corridor works.',
      emptyStateMessage: 'Water and utility projects often need permit and traffic preliminaries. Add only the items relevant to this route and client.',
    }
  ),
  catalogSection(WATER_CODE, 'trenching_excavation', 'Trenching / excavation', 'Trenching, breaking, and excavation to utility corridors.', [
    formulaRateItem({ name: 'Trench excavation', description: 'Excavate trenches to line and level for pipelines or ducts.', unit: 'm³',
      inputs: buildRateInputs({ materials: 2580, labour: 645, plant: 645, transport: 215, overhead: 215 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Excavate road crossings', description: 'Excavate or break road crossings and hard areas.', unit: 'm³',
      inputs: buildRateInputs({ materials: 5520, labour: 1380, plant: 1380, transport: 460, overhead: 460 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Support to trench sides', description: 'Temporary trench support and side protection.', unit: 'm²',
      inputs: buildRateInputs({ materials: 8880, labour: 2220, plant: 2220, transport: 740, overhead: 740 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Spoil disposal', description: 'Dispose surplus excavated or unsuitable material.', unit: 'm³',
      inputs: buildRateInputs({ materials: 1680, labour: 420, plant: 420, transport: 140, overhead: 140 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(WATER_CODE, 'bedding_surround', 'Bedding / pipe surround', 'Bedding and selected surround materials.', [
    formulaRateItem({ name: 'Sand bedding', description: 'Sand bedding to utilities or pipelines.', unit: 'm³',
      inputs: buildRateInputs({ materials: 5040, labour: 1260, plant: 1260, transport: 420, overhead: 420 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Selected pipe surround', description: 'Selected surround and sidefill material.', unit: 'm³',
      inputs: buildRateInputs({ materials: 4560, labour: 1140, plant: 1140, transport: 380, overhead: 380 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Warning tape / marker mesh', description: 'Warning tape or marker mesh above utilities.', unit: 'm',
      inputs: buildRateInputs({ materials: 270, labour: 67, plant: 67, transport: 24, overhead: 22 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(WATER_CODE, 'pipe_installation', 'Pipe installation', 'Main pipe or utility installation works.', [
    formulaRateItem({ name: 'HDPE / uPVC pipe laying', description: 'Supply and lay water or utility pipework complete.', unit: 'm',
      inputs: buildRateInputs({ materials: 11100, labour: 2775, plant: 2775, transport: 925, overhead: 925 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Ductile iron pipe laying', description: 'Supply and lay ductile iron or heavy-duty pressure pipe.', unit: 'm',
      inputs: buildRateInputs({ materials: 25500, labour: 6375, plant: 6375, transport: 2125, overhead: 2125 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Fittings and specials', description: 'Bends, tees, reducers, couplings, and specials.', unit: 'Set',
      inputs: buildRateInputs({ materials: 159000, labour: 39750, plant: 39750, transport: 13250, overhead: 13250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Valves and hydrants', description: 'Valves, hydrants, and valve accessories.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 231000, labour: 57750, plant: 57750, transport: 19250, overhead: 19250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(WATER_CODE, 'chambers_valve_pits', 'Chambers / valve pits', 'Valve chambers, inspection pits, and access structures.', [
    formulaRateItem({ name: 'Valve chambers', description: 'Reinforced concrete valve chambers complete.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 171000, labour: 42750, plant: 42750, transport: 14250, overhead: 14250 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Inspection chambers', description: 'Inspection chambers and access pits complete.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 141000, labour: 35250, plant: 35250, transport: 11750, overhead: 11750 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Covers and frames', description: 'Heavy-duty covers and frames complete.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 49200, labour: 12300, plant: 12300, transport: 4100, overhead: 4100 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(WATER_CODE, 'concrete_works', 'Concrete works', 'Concrete to thrust blocks, chambers, and supports.', [
    formulaRateItem({ name: 'Concrete thrust blocks', description: 'Concrete thrust blocks and pipe supports.', unit: 'm³', inputs: buildRateInputs({ materials: 79000, labour: 11800, plant: 9200, transport: 3900, overhead: 5200 }) }),
    formulaRateItem({ name: 'Concrete chambers', description: 'Concrete to chambers, bases, and covers.', unit: 'm³', inputs: buildRateInputs({ materials: 81500, labour: 12200, plant: 9500, transport: 4000, overhead: 5400 }) }),
    formulaRateItem({ name: 'Reinforcement to chambers', description: 'Reinforcement cutting, bending, and fixing.', unit: 'kg',
      inputs: buildRateInputs({ materials: 1008, labour: 252, plant: 252, transport: 84, overhead: 84 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Formwork to chambers', description: 'Formwork to pits, walls, and cover slabs.', unit: 'm²',
      inputs: buildRateInputs({ materials: 9720, labour: 2430, plant: 2430, transport: 810, overhead: 810 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(WATER_CODE, 'testing_commissioning', 'Testing / commissioning', 'Pressure tests, flushing, and commissioning.', [
    formulaRateItem({ name: 'Hydrostatic testing', description: 'Pressure testing of installed pipeline sections.', unit: 'm',
      inputs: buildRateInputs({ materials: 570, labour: 142, plant: 142, transport: 49, overhead: 47 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Flushing and disinfection', description: 'Flush and disinfect completed water mains.', unit: 'm',
      inputs: buildRateInputs({ materials: 750, labour: 187, plant: 187, transport: 64, overhead: 62 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Commissioning and authority inspection', description: 'Commissioning and authority witness inspections.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 408000, labour: 102000, plant: 102000, transport: 34000, overhead: 34000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
  catalogSection(WATER_CODE, 'reinstatement_finishing', 'Reinstatement / finishing', 'Surface reinstatement and final finishing.', [
    formulaRateItem({ name: 'Road reinstatement', description: 'Reinstate asphalt, concrete, or paving surfaces after trenching.', unit: 'm²',
      inputs: buildRateInputs({ materials: 7680, labour: 1920, plant: 1920, transport: 640, overhead: 640 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Topsoil and verge reinstatement', description: 'Reinstate verges, topsoil, and grassed areas.', unit: 'm²',
      inputs: buildRateInputs({ materials: 1920, labour: 480, plant: 480, transport: 160, overhead: 160 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Marker posts and signage', description: 'Marker posts, warning signs, and utility markers.', unit: 'Nr',
      inputs: buildRateInputs({ materials: 17100, labour: 4275, plant: 4275, transport: 1425, overhead: 1425 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
    formulaRateItem({ name: 'Final cleanup', description: 'Completion cleaning and handover.', unit: 'Sum',
      inputs: buildRateInputs({ materials: 132000, labour: 33000, plant: 33000, transport: 11000, overhead: 11000 }),
      benchmarkMetadata: buildBenchmarkMetadata({
        rate: 0,
        currency: 'NGN',
        region: 'Nigeria',
        sourceType: 'seed-placeholder',
        sourceNote: 'Replace with real Nigerian rates',
        dateCaptured: '2026-04',
        confidenceLevel: 'low'
      }),
      formulaText: expressionText,
      formulaExpression: expressionFormula,
      selectedRateSource: 'formula',
    }),
  ]),
];

export const BOQ_STRUCTURE_LIBRARY = {
  [STRUCTURE_TYPES.BUILDING]: {
    ...STRUCTURE_OPTIONS.find((option) => option.id === STRUCTURE_TYPES.BUILDING),
    sections: BUILDING_SECTIONS,
  },
  [STRUCTURE_TYPES.ROAD]: {
    ...STRUCTURE_OPTIONS.find((option) => option.id === STRUCTURE_TYPES.ROAD),
    sections: ROAD_SECTIONS,
  },
  [STRUCTURE_TYPES.BRIDGE]: {
    ...STRUCTURE_OPTIONS.find((option) => option.id === STRUCTURE_TYPES.BRIDGE),
    sections: BRIDGE_SECTIONS,
  },
  [STRUCTURE_TYPES.DRAINAGE]: {
    ...STRUCTURE_OPTIONS.find((option) => option.id === STRUCTURE_TYPES.DRAINAGE),
    sections: DRAINAGE_SECTIONS,
  },
  [STRUCTURE_TYPES.CULVERT]: {
    ...STRUCTURE_OPTIONS.find((option) => option.id === STRUCTURE_TYPES.CULVERT),
    sections: CULVERT_SECTIONS,
  },
  [STRUCTURE_TYPES.COASTAL]: {
    ...STRUCTURE_OPTIONS.find((option) => option.id === STRUCTURE_TYPES.COASTAL),
    sections: COASTAL_SECTIONS,
  },
  [STRUCTURE_TYPES.FOUNDATION]: {
    ...STRUCTURE_OPTIONS.find((option) => option.id === STRUCTURE_TYPES.FOUNDATION),
    sections: FOUNDATION_SECTIONS,
  },
  [STRUCTURE_TYPES.WATER_UTILITY]: {
    ...STRUCTURE_OPTIONS.find((option) => option.id === STRUCTURE_TYPES.WATER_UTILITY),
    sections: WATER_SECTIONS,
  },
};

const createSectionId = (sectionId) => `sec_${sectionId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const createItemId = (code = 'item') => `itm_${code}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const getStructureDefinition = (structureType) => (
  BOQ_STRUCTURE_LIBRARY[structureType] || null
);

export const getStructureSections = (structureType) => (
  getStructureDefinition(structureType)?.sections || []
);

export const getStructureSectionCatalog = (structureType, billSectionId) => (
  getStructureSections(structureType).find((entry) => entry.id === billSectionId) || null
);

export const createProjectSectionsFromStructure = (structureType, selectedSectionIds = null) => {
  const sectionFilter = Array.isArray(selectedSectionIds) && selectedSectionIds.length > 0
    ? new Set(selectedSectionIds)
    : null;

  return getStructureSections(structureType)
    .filter((entry) => !sectionFilter || sectionFilter.has(entry.id))
    .map((entry) => ({
      id: createSectionId(entry.id),
      billSectionId: entry.id,
      code: entry.code,
      title: entry.title,
      description: entry.description,
      isPreliminaries: entry.isPreliminaries === true,
      trade: entry.trade || entry.title,
      pickerPrompt: entry.pickerPrompt || '',
      emptyStateTitle: entry.emptyStateTitle || '',
      emptyStateMessage: entry.emptyStateMessage || '',
      keywords: normalizeKeywords(entry.keywords),
      structureType,
      expanded: true,
      items: [],
    }));
};

const buildEditableInputsForProject = (catalogItem) => normalizeEditableInputs(catalogItem.editableInputs).map((input) => ({
  ...input,
  value: input.defaultValue,
}));

export const cloneCatalogItemToProjectItem = (catalogItem, { structureType, billSectionId, billSectionTitle }) => {
  const editableInputs = buildEditableInputsForProject(catalogItem);
  const formulaRate = evaluateBoqFormulaRate({
    ...catalogItem,
    editableInputs,
  });
  const catalogBenchmarkRate = Number(catalogItem.benchmarkRate) || 0;
  const hasFormula = catalogItem.defaultFormulaType && catalogItem.defaultFormulaType !== 'manual';
  const formulaCalculatedRate = hasFormula ? (formulaRate ?? 0) : 0;
  const initialSelectedSource = formulaCalculatedRate > 0
    ? 'formula'
    : catalogBenchmarkRate > 0
      ? 'benchmark'
      : hasFormula
        ? 'formula'
        : 'manual';
  const resolvedUnitRate = initialSelectedSource === 'formula'
    ? (formulaCalculatedRate || catalogBenchmarkRate)
    : initialSelectedSource === 'benchmark'
      ? catalogBenchmarkRate
      : 0;
  const quantity = 0;
  const notes = catalogItem.notes || '';

  return {
    id: createItemId(catalogItem.code),
    catalogItemId: catalogItem.code,
    code: catalogItem.code,
    name: catalogItem.name,
    description: catalogItem.description || catalogItem.name,
    unit: catalogItem.unit || 'Nr',
    structureType,
    billSection: billSectionId,
    billSectionTitle,
    defaultFormulaType: catalogItem.defaultFormulaType || 'manual',
    formulaText: catalogItem.formulaText || '',
    formulaBasis: normalizeFormulaBasis(catalogItem.formulaBasis),
    formulaExpression: catalogItem.formulaExpression || '',
    exampleInputs: normalizeEditableInputs(catalogItem.exampleInputs),
    editableInputs,
    workedExample: catalogItem.workedExample || '',
    category: catalogItem.category || billSectionTitle || 'General',
    keywords: normalizeKeywords(catalogItem.keywords),
    pickerHint: catalogItem.pickerHint || '',
    isRecommended: catalogItem.isRecommended === true,
    rateSourceOptions: Array.isArray(catalogItem.rateSourceOptions) && catalogItem.rateSourceOptions.length > 0
      ? [...catalogItem.rateSourceOptions]
      : [...DEFAULT_RATE_SOURCE_OPTIONS],
    quantity,
    qty: quantity,
    takeoffMeta: null,
    // --- new tri-modal rate model ---
    selectedRateSource: initialSelectedSource,
    formulaCalculatedRate,
    resolvedUnitRate,
    manualRate: 0,
    benchmarkRegionalRates: catalogItem.benchmarkRegionalRates || null,
    benchmarkEvidence: catalogItem.benchmarkEvidence || null,
    benchmarkMatchSource: catalogItem.benchmarkMatchSource || null,
    benchmarkMetadata: buildBenchmarkMetadata({
      rate: Number(catalogItem.benchmarkMetadata?.rate ?? catalogBenchmarkRate) || 0,
      currency: catalogItem.benchmarkMetadata?.currency || 'NGN',
      region: catalogItem.benchmarkMetadata?.region || 'Lagos',
      sourceType: catalogItem.benchmarkMetadata?.sourceType || 'catalog',
      sourceNote: catalogItem.benchmarkMetadata?.sourceNote || 'BOQ-Pro item library benchmark',
      dateCaptured: catalogItem.benchmarkMetadata?.dateCaptured || null,
      confidenceLevel: catalogItem.benchmarkMetadata?.confidenceLevel || (catalogBenchmarkRate > 0 ? 'medium' : 'low'),
      calibrationFactor: catalogItem.benchmarkMetadata?.calibrationFactor || null,
    }),
    // --- legacy / compat aliases (kept for backward compatibility) ---
    unitRate: resolvedUnitRate,
    rate: resolvedUnitRate,
    benchmarkRate: catalogBenchmarkRate,
    benchmark: catalogBenchmarkRate,
    amount: 0,
    total: 0,
    notes,
    subcategory: billSectionTitle || '',
    materials: [],
    useBenchmark: initialSelectedSource === 'benchmark',
    rateSource: initialSelectedSource,
    qtySource: 'manual',
    customPricing: null,
    isVO: false,
  };
};

export const createCustomBoqItem = ({ structureType = '', billSectionId = '', billSectionTitle = 'Custom Item' } = {}) => ({
  id: createItemId('custom'),
  catalogItemId: null,
  code: '',
  name: 'Custom BOQ Item',
  description: '',
  unit: 'Nr',
  structureType,
  billSection: billSectionId,
  billSectionTitle,
  defaultFormulaType: 'manual',
  formulaText: '',
  formulaBasis: [],
  formulaExpression: '',
  exampleInputs: [],
  editableInputs: [],
  workedExample: '',
  category: 'Custom',
  keywords: [],
  pickerHint: '',
  isRecommended: false,
  rateSourceOptions: [...DEFAULT_RATE_SOURCE_OPTIONS],
  quantity: 0,
  unitRate: 0,
  amount: 0,
  notes: '',
  benchmarkRate: 0,
  qty: 0,
  rate: 0,
  total: 0,
    benchmark: 0,
    takeoffMeta: null,
    subcategory: billSectionTitle,
  materials: [],
  // --- new tri-modal rate model ---
  selectedRateSource: 'manual',
  formulaCalculatedRate: 0,
  resolvedUnitRate: 0,
  manualRate: 0,
  benchmarkMetadata: {
    rate: 0,
    currency: 'NGN',
    region: 'Lagos',
    sourceType: 'manual',
    sourceNote: '',
    dateCaptured: null,
    confidenceLevel: 'low',
  },
  // --- legacy / compat aliases ---
  useBenchmark: false,
  rateSource: 'manual',
  qtySource: 'manual',
  customPricing: null,
  isVO: false,
});
