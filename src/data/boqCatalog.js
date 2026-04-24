import {
  buildWorkedExampleText,
  evaluateBoqFormulaRate,
  normalizeEditableInputs,
} from '../utils/boqFormulas';
import { ROAD_DRAINAGE_ITEMS } from './catalog/roadDrainage';
import { ROAD_EARTHWORK_ITEMS } from './catalog/roadEarthworks';
import {
  ROAD_EXTERNAL_FINISHING_ITEMS,
  ROAD_FURNITURE_ITEMS,
} from './catalog/roadFurnitureFinishing';
import {
  ROAD_BASE_COURSE_ITEMS,
} from './catalog/roadPavementLayers';
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

const manualItem = ({
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

const catalogSection = (structureCode, id, title, description, items, metadata = {}) => (
  section(
    id,
    title,
    description,
    items.map((item, index) => ({
      ...item,
      code: item.code || makeItemCode(structureCode, makeSectionCode(id), index),
    })),
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
    manualItem({
      code: makeItemCode(structureCode, 'PREL', 1),
      name: 'Site establishment',
      description: 'Site establishment, project signage, and startup administration.',
      unit: 'Sum',
      benchmarkRate: 650000,
      category: 'Site setup',
      keywords: ['startup', 'project signage', 'administration'],
      pickerHint: 'Use when the contract requires site setup, signage, and general startup administration.',
      isRecommended: true,
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
    manualItem({
      code: makeItemCode(structureCode, 'PREL', 3),
      name: 'Site fencing / hoarding',
      description: 'Temporary site fencing, hoarding, controlled access, and security gates.',
      unit: 'm',
      benchmarkRate: 12500,
      category: 'Site security',
      keywords: ['hoarding', 'security', 'gates'],
      pickerHint: 'Include when the site boundary, security gates, or hoarding need dedicated pricing.',
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
    manualItem({
      code: makeItemCode(structureCode, 'PREL', 7),
      name: 'Testing setup',
      description: 'QA/QC setup, test forms, and materials testing administration.',
      unit: 'Sum',
      benchmarkRate: 420000,
      category: 'Quality assurance',
      keywords: ['qa', 'qc', 'testing', 'laboratory'],
      pickerHint: 'Add when test setup, QA documentation, or laboratory administration is required.',
    }),
    manualItem({
      code: makeItemCode(structureCode, 'PREL', 8),
      name: 'Environmental protection',
      description: 'Dust suppression, waste handling, and environmental protection measures.',
      unit: 'Month',
      benchmarkRate: 110000,
      category: 'Environmental',
      keywords: ['dust control', 'waste', 'mitigation'],
      pickerHint: 'Use where environmental mitigation measures must be carried as ongoing preliminaries.',
    }),
    manualItem({
      code: makeItemCode(structureCode, 'PREL', 9),
      name: 'Temporary works',
      description: 'Temporary supports, access arrangements, and enabling works for construction.',
      unit: 'Sum',
      benchmarkRate: 550000,
      category: 'Temporary works',
      keywords: ['supports', 'access', 'enabling works'],
      pickerHint: 'Appropriate when temporary supports, access decks, or enabling works need separate coverage.',
    }),
    manualItem({
      code: makeItemCode(structureCode, 'PREL', 10),
      name: 'Insurance / permits',
      description: 'Contractors all-risk insurance, permits, approvals, and statutory fees.',
      unit: 'Sum',
      benchmarkRate: 780000,
      category: 'Commercial and permits',
      keywords: ['insurance', 'statutory fees', 'approvals'],
      pickerHint: 'Add when insurance cover, permits, or approval fees are not absorbed elsewhere.',
      isRecommended: true,
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
      manualItem({
        code: makeItemCode(structureCode, 'PREL', 12),
        name: 'Marine safety control',
        description: 'Navigation lights, marine exclusion zone markers, and safety boats.',
        unit: 'Month',
        benchmarkRate: 420000,
        category: 'Marine safety',
        keywords: ['navigation', 'safety boats', 'marine zone'],
        pickerHint: 'Use for coastal and marine works where navigation safety measures are contract requirements.',
      })
    );
  }

  if (includeUtilityPermits) {
    items.push(
      manualItem({
        code: makeItemCode(structureCode, 'PREL', 13),
        name: 'Utility authority permits',
        description: 'Road opening permits, utility clearances, and service connection approvals.',
        unit: 'Sum',
        benchmarkRate: 620000,
        category: 'Commercial and permits',
        keywords: ['road opening', 'clearance', 'utility approval'],
        pickerHint: 'Important for water and utility projects that need authority permits and network approvals.',
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

const BUILDING_SECTIONS = [
  catalogSection(
    BUILDING_CODE,
    'preliminaries',
    'Preliminaries',
    'Project preliminaries and startup requirements.',
    createPreliminariesItems(BUILDING_CODE),
    {
      trade: 'Preliminaries',
      pickerPrompt: 'Pick the building preliminaries that the contract genuinely requires, then price each one with the correct duration or lump-sum quantity.',
      emptyStateMessage: 'Select the building preliminaries that apply to the job, such as mobilization, temporary office, HSE, supervision, and permit-related costs.',
    }
  ),
  catalogSection(BUILDING_CODE, 'site_clearance', 'Site clearance', 'Site clearance, setting out, and demolition items.', [
    manualItem({ name: 'Clear vegetation and debris', description: 'Clear vegetation, shrubs, rubbish, and dispose offsite.', unit: 'm²', benchmarkRate: 650 }),
    manualItem({ name: 'Strip topsoil', description: 'Strip and stockpile topsoil to approved depth.', unit: 'm³', benchmarkRate: 2800 }),
    manualItem({ name: 'Setting out to drawings', description: 'Set out building lines, control points, and benchmarks.', unit: 'Sum', benchmarkRate: 350000 }),
    manualItem({ name: 'Demolish minor obstructions', description: 'Demolish old slabs, kerbs, and minor obstructions.', unit: 'm³', benchmarkRate: 18500 }),
    manualItem({ name: 'Cart away debris', description: 'Load and cart away demolition waste to approved tip.', unit: 'm³', benchmarkRate: 2600 }),
  ]),
  catalogSection(BUILDING_CODE, 'excavation_earthworks', 'Excavation / earthworks', 'Bulk excavation, trenching, and filling items.', [
    manualItem({ name: 'Excavate foundation trenches', description: 'Excavate trench and pad foundations not exceeding stated depth.', unit: 'm³', benchmarkRate: 4200 }),
    manualItem({ name: 'Excavate lift pits and sumps', description: 'Excavate lift pits, service pits, and isolated deeper pockets.', unit: 'm³', benchmarkRate: 5200 }),
    manualItem({ name: 'Imported laterite filling', description: 'Imported selected laterite filling, spread, water, and compact.', unit: 'm³', benchmarkRate: 10800 }),
    manualItem({ name: 'Sand filling and compaction', description: 'Sharp sand filling in layers with compaction to level.', unit: 'm³', benchmarkRate: 8600 }),
    manualItem({ name: 'Dispose surplus excavated material', description: 'Load, haul, and dispose surplus spoil to approved dump.', unit: 'm³', benchmarkRate: 2800 }),
  ]),
  catalogSection(BUILDING_CODE, 'foundations', 'Foundations', 'Foundation concrete, reinforcement, and associated works.', [
    formulaRateItem({ name: 'Blinding concrete', description: '50mm blinding concrete below foundations.', unit: 'm³', inputs: buildRateInputs({ materials: 42000, labour: 9500, plant: 6000, transport: 3500, overhead: 4000 }) }),
    formulaRateItem({ name: 'Reinforcement to footings', description: 'Cut, bend, and fix reinforcement to foundations.', unit: 'kg', inputs: buildRateInputs({ materials: 1020, labour: 180, plant: 40, transport: 30, overhead: 35 }) }),
    manualItem({ name: 'Formwork to footing sides', description: 'Provide and strike formwork to footing edges and bases.', unit: 'm²', benchmarkRate: 14800 }),
    formulaRateItem({ name: 'Concrete to footings', description: 'Grade 25 concrete to strip and pad footings.', unit: 'm³', inputs: buildRateInputs({ materials: 78000, labour: 12500, plant: 9800, transport: 4200, overhead: 5500 }) }),
    manualItem({ name: 'Damp proof course', description: 'Provide and lay damp proof course membrane at wall base.', unit: 'm', benchmarkRate: 2200 }),
  ]),
  catalogSection(BUILDING_CODE, 'substructure', 'Substructure', 'Works below ground floor slab level.', [
    manualItem({ name: 'Foundation blockwork', description: '225mm sandcrete blockwork from footing to DPC level.', unit: 'm²', benchmarkRate: 19800 }),
    manualItem({ name: 'Hardcore filling', description: 'Hardcore filling in layers and machine compaction.', unit: 'm³', benchmarkRate: 15500 }),
    formulaRateItem({ name: 'Oversite concrete', description: 'Concrete oversite slab or ground beam blinding works.', unit: 'm³', inputs: buildRateInputs({ materials: 76000, labour: 11000, plant: 9000, transport: 3800, overhead: 5000 }) }),
    manualItem({ name: 'Backfilling around foundations', description: 'Backfill around substructure and compact in layers.', unit: 'm³', benchmarkRate: 4200 }),
    manualItem({ name: 'Termite treatment', description: 'Apply anti-termite treatment to hardcore and formation.', unit: 'm²', benchmarkRate: 1350 }),
  ]),
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
    manualItem({ name: 'Approach excavation', description: 'Excavate approach roads and abutment areas.', unit: 'm³', benchmarkRate: 3600 }),
    manualItem({ name: 'Working platform fill', description: 'Imported fill and stabilization to working platforms.', unit: 'm³', benchmarkRate: 12800 }),
    manualItem({ name: 'Approach embankment fill', description: 'Selected fill to embankment and transition wedges.', unit: 'm³', benchmarkRate: 11200 }),
    manualItem({ name: 'Compaction and proof rolling', description: 'Compaction and proof rolling of bridge approaches.', unit: 'm²', benchmarkRate: 860 }),
  ]),
  catalogSection(BRIDGE_CODE, 'foundations_piling', 'Foundations / piling', 'Pile, pile cap, and deep foundation items.', [
    manualItem({ name: 'Bored piles', description: 'Bored cast in-situ pile construction complete.', unit: 'm', benchmarkRate: 138000 }),
    manualItem({ name: 'Pile reinforcement cages', description: 'Fabricate and fix pile reinforcement cages.', unit: 'kg', benchmarkRate: 1780 }),
    formulaRateItem({ name: 'Pile cap concrete', description: 'Concrete to pile caps and foundation blocks.', unit: 'm³', inputs: buildRateInputs({ materials: 92000, labour: 14800, plant: 12600, transport: 5100, overhead: 6500 }) }),
    manualItem({ name: 'Pile testing', description: 'Integrity and load testing to piles.', unit: 'Nr', benchmarkRate: 950000 }),
  ]),
  catalogSection(BRIDGE_CODE, 'substructure', 'Substructure', 'Abutments, piers, and return wall items.', [
    manualItem({ name: 'Pier reinforcement', description: 'Reinforcement to piers, abutments, and walls.', unit: 'kg', benchmarkRate: 1720 }),
    manualItem({ name: 'Substructure formwork', description: 'Formwork to piers, abutments, and wing walls.', unit: 'm²', benchmarkRate: 18500 }),
    formulaRateItem({ name: 'Pier and abutment concrete', description: 'Concrete to abutments, piers, and walls.', unit: 'm³', inputs: buildRateInputs({ materials: 94000, labour: 15200, plant: 13200, transport: 5200, overhead: 6800 }) }),
    manualItem({ name: 'Wing walls and return walls', description: 'Wing wall and return wall construction complete.', unit: 'm³', benchmarkRate: 188000 }),
  ]),
  catalogSection(BRIDGE_CODE, 'superstructure', 'Superstructure', 'Girders, diaphragms, and deck support systems.', [
    manualItem({ name: 'Girders / beams', description: 'Precast or in-situ beams and girder components.', unit: 'm', benchmarkRate: 425000 }),
    manualItem({ name: 'Diaphragm works', description: 'Diaphragm reinforcement, formwork, and concrete.', unit: 'm³', benchmarkRate: 192000 }),
    manualItem({ name: 'Parapet starter bars', description: 'Parapet starter bars, inserts, and edge details.', unit: 'kg', benchmarkRate: 1820 }),
    manualItem({ name: 'Deck waterproofing membrane', description: 'Waterproofing membrane to bridge deck before surfacing.', unit: 'm²', benchmarkRate: 6200 }),
  ]),
  catalogSection(BRIDGE_CODE, 'deck_works', 'Deck works', 'Deck slab, surfacing, and parapet items.', [
    formulaRateItem({ name: 'Deck slab concrete', description: 'Concrete to bridge deck slab complete.', unit: 'm³', inputs: buildRateInputs({ materials: 96000, labour: 15800, plant: 14000, transport: 5600, overhead: 7000 }) }),
    manualItem({ name: 'Deck reinforcement', description: 'Cut, bend, and fix reinforcement to deck slab.', unit: 'kg', benchmarkRate: 1750 }),
    manualItem({ name: 'Parapets and railings', description: 'Parapet walls, steel rails, and pedestrian edge details.', unit: 'm', benchmarkRate: 118000 }),
    manualItem({ name: 'Bridge deck surfacing', description: 'Bituminous deck surfacing or wearing course.', unit: 'm²', benchmarkRate: 18800 }),
  ]),
  catalogSection(BRIDGE_CODE, 'bearings_joints', 'Bearings / joints', 'Bearing installation and expansion joint works.', [
    manualItem({ name: 'Bridge bearings', description: 'Supply and install bridge bearings complete.', unit: 'Set', benchmarkRate: 285000 }),
    manualItem({ name: 'Expansion joints', description: 'Bridge expansion joints complete with accessories.', unit: 'm', benchmarkRate: 245000 }),
    manualItem({ name: 'Bearing plinths and grout', description: 'Bearing plinth concrete and non-shrink grout.', unit: 'Nr', benchmarkRate: 84000 }),
  ]),
  catalogSection(BRIDGE_CODE, 'drainage', 'Drainage', 'Bridge deck drainage and downpipe systems.', [
    manualItem({ name: 'Scupper drains', description: 'Deck scupper drains and outlets.', unit: 'Nr', benchmarkRate: 125000 }),
    manualItem({ name: 'Downpipes and drainage outlets', description: 'Downpipes and bridge drainage outlet system.', unit: 'm', benchmarkRate: 22000 }),
    manualItem({ name: 'Approach drainage tie-in', description: 'Tie bridge drainage into approach drainage system.', unit: 'Sum', benchmarkRate: 950000 }),
  ]),
  catalogSection(BRIDGE_CODE, 'protection_works', 'Protection works', 'River training, scour, and protection items.', [
    manualItem({ name: 'Gabion protection', description: 'Gabion protection to river banks and abutment toe.', unit: 'm³', benchmarkRate: 44500 }),
    manualItem({ name: 'Stone pitching', description: 'Stone pitching and filter layer to protected slopes.', unit: 'm²', benchmarkRate: 29500 }),
    manualItem({ name: 'Scour apron', description: 'Concrete or rock scour apron construction.', unit: 'm²', benchmarkRate: 36500 }),
    manualItem({ name: 'River training works', description: 'Minor river training and channel stabilization works.', unit: 'Sum', benchmarkRate: 2850000 }),
  ]),
  catalogSection(BRIDGE_CODE, 'finishes_accessories', 'Finishes / accessories', 'Approach slabs, painting, and completion items.', [
    manualItem({ name: 'Approach slabs', description: 'Approach slab construction complete.', unit: 'm³', benchmarkRate: 175000 }),
    manualItem({ name: 'Protective coating', description: 'Protective coating to exposed steel or concrete surfaces.', unit: 'm²', benchmarkRate: 4200 }),
    manualItem({ name: 'Name plates and markers', description: 'Bridge name plates, chainage markers, and accessories.', unit: 'Sum', benchmarkRate: 520000 }),
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
    manualItem({ name: 'Trench excavation', description: 'Excavate drain or trench to line and level.', unit: 'm³', benchmarkRate: 4200 }),
    manualItem({ name: 'Excavation support', description: 'Temporary support to trench sides where required.', unit: 'm²', benchmarkRate: 14500 }),
    manualItem({ name: 'Cart away spoil', description: 'Load and cart away unsuitable spoil.', unit: 'm³', benchmarkRate: 2700 }),
    manualItem({ name: 'Formation trimming', description: 'Trim formation and prepare for bedding.', unit: 'm²', benchmarkRate: 650 }),
  ]),
  catalogSection(DRAINAGE_CODE, 'bedding', 'Bedding', 'Drain bedding, blinding, and formation layers.', [
    manualItem({ name: 'Sand bedding', description: 'Sand bedding to drain invert or pipe base.', unit: 'm³', benchmarkRate: 8200 }),
    manualItem({ name: 'Lean concrete blinding', description: 'Concrete blinding to bases and formation.', unit: 'm³', benchmarkRate: 68000 }),
    manualItem({ name: 'Geotextile separator', description: 'Geotextile separator layer at weak formation.', unit: 'm²', benchmarkRate: 3800 }),
  ]),
  catalogSection(DRAINAGE_CODE, 'concrete_works', 'Concrete works', 'In-situ concrete to walls, bases, and covers.', [
    formulaRateItem({ name: 'Drain base concrete', description: 'Concrete to drain base slab.', unit: 'm³', inputs: buildRateInputs({ materials: 78000, labour: 11800, plant: 9200, transport: 3800, overhead: 5200 }) }),
    formulaRateItem({ name: 'Drain wall concrete', description: 'Concrete to side walls, kicker, and haunches.', unit: 'm³', inputs: buildRateInputs({ materials: 80500, labour: 12200, plant: 9400, transport: 3900, overhead: 5400 }) }),
    manualItem({ name: 'Reinforcement to drains', description: 'Cut, bend, and fix reinforcement to drains.', unit: 'kg', benchmarkRate: 1680 }),
    manualItem({ name: 'Formwork to drains', description: 'Formwork to sides, soffits, and cover units.', unit: 'm²', benchmarkRate: 16200 }),
  ]),
  catalogSection(DRAINAGE_CODE, 'installation', 'Channel / drain installation', 'Precast or in-situ drain unit installation.', [
    manualItem({ name: 'In-situ rectangular drain', description: 'In-situ reinforced concrete drain construction.', unit: 'm', benchmarkRate: 28500 }),
    manualItem({ name: 'Precast U-drain units', description: 'Supply and lay precast U-drain units complete.', unit: 'm', benchmarkRate: 32500 }),
    manualItem({ name: 'Cover slabs / gratings', description: 'Drain cover slabs, gratings, and access covers.', unit: 'm', benchmarkRate: 17800 }),
    manualItem({ name: 'Manholes and catchpits', description: 'Manholes, catchpits, and access structures.', unit: 'Nr', benchmarkRate: 165000 }),
  ]),
  catalogSection(DRAINAGE_CODE, 'backfilling', 'Backfilling', 'Backfilling, surround, and compaction.', [
    manualItem({ name: 'Selected backfilling', description: 'Selected backfill around drain walls and covers.', unit: 'm³', benchmarkRate: 5200 }),
    manualItem({ name: 'Pipe surround material', description: 'Selected pipe surround or sidefill material.', unit: 'm³', benchmarkRate: 7600 }),
    manualItem({ name: 'Compaction in layers', description: 'Compaction of backfill in approved layers.', unit: 'm²', benchmarkRate: 680 }),
  ]),
  catalogSection(DRAINAGE_CODE, 'protection_works', 'Protection works', 'Outfall and erosion protection works.', [
    manualItem({ name: 'Stone pitching', description: 'Stone pitching to outfalls and side slopes.', unit: 'm²', benchmarkRate: 28500 }),
    manualItem({ name: 'Concrete apron', description: 'Concrete apron and cutoff walls at discharge points.', unit: 'm³', benchmarkRate: 138000 }),
    manualItem({ name: 'Slope restoration', description: 'Topsoil and turfing to disturbed slopes.', unit: 'm²', benchmarkRate: 4200 }),
    manualItem({ name: 'Safety rails / markers', description: 'Safety rails and warning markers to exposed drains.', unit: 'm', benchmarkRate: 18800 }),
  ]),
  catalogSection(DRAINAGE_CODE, 'testing_finishing', 'Testing / finishing', 'Finishing, cleanup, and testing items.', [
    manualItem({ name: 'Flow testing and flushing', description: 'Flow testing, flushing, and debris removal.', unit: 'Sum', benchmarkRate: 480000 }),
    manualItem({ name: 'Benchings and channel finish', description: 'Benchings, plaster finish, and joint treatment.', unit: 'Nr', benchmarkRate: 24500 }),
    manualItem({ name: 'Final cleanup and handover', description: 'Completion cleaning, snagging, and handover.', unit: 'Sum', benchmarkRate: 320000 }),
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
    manualItem({ name: 'Excavate culvert trench', description: 'Excavate trench or box culvert foundation.', unit: 'm³', benchmarkRate: 4600 }),
    manualItem({ name: 'Excavate for headwalls', description: 'Excavate for headwalls, wing walls, and aprons.', unit: 'm³', benchmarkRate: 4800 }),
    manualItem({ name: 'Dewatering and diversion', description: 'Dewatering, flow diversion, and site protection.', unit: 'Sum', benchmarkRate: 1250000 }),
    manualItem({ name: 'Spoil disposal', description: 'Cart away excavated spoil to approved dump.', unit: 'm³', benchmarkRate: 2800 }),
  ]),
  catalogSection(CULVERT_CODE, 'bedding', 'Bedding', 'Bedding and blinding layers for culvert units.', [
    manualItem({ name: 'Sand bedding', description: 'Sand bedding below pipes or base slab.', unit: 'm³', benchmarkRate: 8600 }),
    manualItem({ name: 'Lean concrete blinding', description: 'Lean concrete blinding below culvert units.', unit: 'm³', benchmarkRate: 69500 }),
    manualItem({ name: 'Granular sub-base', description: 'Granular base or bedding support to formation.', unit: 'm³', benchmarkRate: 24500 }),
  ]),
  catalogSection(CULVERT_CODE, 'concrete_works', 'Concrete works', 'Concrete, reinforcement, and formwork to culvert structures.', [
    formulaRateItem({ name: 'Base slab concrete', description: 'Concrete to culvert base slab.', unit: 'm³', inputs: buildRateInputs({ materials: 82000, labour: 12400, plant: 9500, transport: 4100, overhead: 5600 }) }),
    formulaRateItem({ name: 'Wall and slab concrete', description: 'Concrete to culvert walls and top slab.', unit: 'm³', inputs: buildRateInputs({ materials: 85000, labour: 12800, plant: 9800, transport: 4200, overhead: 5900 }) }),
    manualItem({ name: 'Reinforcement to culvert', description: 'Reinforcement cutting, bending, and fixing.', unit: 'kg', benchmarkRate: 1700 }),
    manualItem({ name: 'Formwork to culvert', description: 'Formwork to walls, soffits, and edges.', unit: 'm²', benchmarkRate: 16800 }),
  ]),
  catalogSection(CULVERT_CODE, 'culvert_installation', 'Pipe / box culvert installation', 'Supply and installation of culvert units.', [
    manualItem({ name: 'RCC pipe culvert installation', description: 'Supply and lay RCC pipe culverts complete.', unit: 'm', benchmarkRate: 62000 }),
    manualItem({ name: 'Precast box culvert units', description: 'Supply and place precast box culvert units.', unit: 'm', benchmarkRate: 145000 }),
    manualItem({ name: 'In-situ box culvert construction', description: 'Construct in-situ reinforced concrete box culvert.', unit: 'm', benchmarkRate: 188000 }),
    manualItem({ name: 'Jointing and sealing', description: 'Jointing, sealing, and bedding adjustment to culvert units.', unit: 'm', benchmarkRate: 7800 }),
  ]),
  catalogSection(CULVERT_CODE, 'headwalls_wing_walls', 'Headwalls / wing walls', 'Headwalls, wing walls, and aprons.', [
    manualItem({ name: 'Headwalls', description: 'Headwalls complete with reinforcement and concrete.', unit: 'Nr', benchmarkRate: 680000 }),
    manualItem({ name: 'Wing walls', description: 'Wing walls complete with return walls and toe details.', unit: 'Nr', benchmarkRate: 540000 }),
    manualItem({ name: 'Aprons and cutoff walls', description: 'Aprons, toe walls, and cutoff walls to culvert ends.', unit: 'm³', benchmarkRate: 142000 }),
  ]),
  catalogSection(CULVERT_CODE, 'backfilling', 'Backfilling', 'Backfilling and compaction around culvert units.', [
    manualItem({ name: 'Selected surround/backfill', description: 'Selected material backfill around culvert structure.', unit: 'm³', benchmarkRate: 5600 }),
    manualItem({ name: 'Compaction in layers', description: 'Compaction around culvert in layers.', unit: 'm²', benchmarkRate: 720 }),
    manualItem({ name: 'Approach reinstatement', description: 'Reinstate road formation above culvert crossing.', unit: 'm²', benchmarkRate: 9800 }),
  ]),
  catalogSection(CULVERT_CODE, 'protection_works', 'Protection works', 'Erosion control and outlet protection.', [
    manualItem({ name: 'Stone pitching', description: 'Stone pitching to inlet and outlet channels.', unit: 'm²', benchmarkRate: 28800 }),
    manualItem({ name: 'Gabion / riprap protection', description: 'Gabion or riprap protection to vulnerable areas.', unit: 'm³', benchmarkRate: 44500 }),
    manualItem({ name: 'Concrete side drains tie-in', description: 'Tie culvert ends into side drains or channels.', unit: 'm', benchmarkRate: 19200 }),
  ]),
  catalogSection(CULVERT_CODE, 'testing_finishing', 'Testing / finishing', 'Cleanup, flushing, and completion items.', [
    manualItem({ name: 'Flow path cleanup', description: 'Flow path cleanup and obstruction removal.', unit: 'Sum', benchmarkRate: 240000 }),
    manualItem({ name: 'Completion snagging', description: 'Minor snagging, touch-up, and final handover.', unit: 'Sum', benchmarkRate: 180000 }),
    manualItem({ name: 'As-built setting out checks', description: 'Final dimensional and level confirmation of completed culvert.', unit: 'Sum', benchmarkRate: 220000 }),
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
    manualItem({ name: 'Maintenance dredging', description: 'Maintenance dredging to design depth and alignment.', unit: 'm³', benchmarkRate: 4200 }),
    manualItem({ name: 'Hydraulic fill placement', description: 'Hydraulic sand fill placement and trimming.', unit: 'm³', benchmarkRate: 6800 }),
    manualItem({ name: 'Reclamation compaction', description: 'Compaction and settlement management for reclaimed areas.', unit: 'm²', benchmarkRate: 1180 }),
    manualItem({ name: 'Survey monitoring', description: 'Hydrographic and settlement monitoring during dredging/reclamation.', unit: 'Month', benchmarkRate: 1850000 }),
  ]),
  catalogSection(COASTAL_CODE, 'earthworks_geotech', 'Earthworks / geotechnical', 'Marine geotechnical and stabilization works.', [
    manualItem({ name: 'Sheet pile driving', description: 'Drive sheet piles or retaining elements to line and level.', unit: 'm²', benchmarkRate: 148000 }),
    manualItem({ name: 'Tie rods and walers', description: 'Supply and install tie rods, walers, and anchor components.', unit: 'Set', benchmarkRate: 285000 }),
    manualItem({ name: 'Filter layers', description: 'Filter stone and geotextile behind retaining structures.', unit: 'm³', benchmarkRate: 26800 }),
    manualItem({ name: 'Ground improvement', description: 'Ground improvement or stabilization to marine edge.', unit: 'm²', benchmarkRate: 22500 }),
  ]),
  catalogSection(COASTAL_CODE, 'marine_structures', 'Marine structures', 'Concrete and steel marine structure items.', [
    formulaRateItem({ name: 'Marine concrete', description: 'Marine grade reinforced concrete to quay, jetty, or revetment structures.', unit: 'm³', inputs: buildRateInputs({ materials: 112000, labour: 17500, plant: 16500, transport: 6800, overhead: 8200 }) }),
    manualItem({ name: 'Marine reinforcement', description: 'Reinforcement to marine structural elements.', unit: 'kg', benchmarkRate: 1820 }),
    manualItem({ name: 'Cathodic protection fixtures', description: 'Corrosion protection accessories to marine steelwork.', unit: 'Set', benchmarkRate: 680000 }),
    manualItem({ name: 'Precast armour units', description: 'Supply and place precast armour or wave-dissipating units.', unit: 'Nr', benchmarkRate: 285000 }),
  ]),
  catalogSection(COASTAL_CODE, 'shoreline_protection', 'Revetment / shoreline protection', 'Rock armour, revetment, and shoreline defense.', [
    manualItem({ name: 'Rock armour placement', description: 'Place primary armour rock to shoreline profile.', unit: 'Tonne', benchmarkRate: 26500 }),
    manualItem({ name: 'Underlayer stone', description: 'Place filter stone and underlayer material.', unit: 'Tonne', benchmarkRate: 24500 }),
    manualItem({ name: 'Crest wall concrete', description: 'Concrete crest wall and splash apron.', unit: 'm³', benchmarkRate: 185000 }),
    manualItem({ name: 'Toe protection', description: 'Toe trench excavation and buried armour placement.', unit: 'm', benchmarkRate: 36800 }),
  ]),
  catalogSection(COASTAL_CODE, 'drainage_outfalls', 'Drainage / outfalls', 'Outfall, flap valve, and drainage tie-in works.', [
    manualItem({ name: 'Outfall structures', description: 'Outfall headwalls, flap valves, and scour protections.', unit: 'Nr', benchmarkRate: 1850000 }),
    manualItem({ name: 'Drainage pits and chambers', description: 'Drainage pits, chambers, and inspection structures.', unit: 'Nr', benchmarkRate: 285000 }),
    manualItem({ name: 'Marine outfall pipeline', description: 'Outfall pipeline and associated fittings.', unit: 'm', benchmarkRate: 128000 }),
  ]),
  catalogSection(COASTAL_CODE, 'access_utilities', 'Access / utilities', 'Access roads, utilities, and marine ancillary services.', [
    manualItem({ name: 'Access road pavement', description: 'Access road sub-base, base, and surfacing package.', unit: 'm²', benchmarkRate: 15500 }),
    manualItem({ name: 'Service ducts and sleeves', description: 'Utility ducts, sleeves, and service crossings.', unit: 'm', benchmarkRate: 22500 }),
    manualItem({ name: 'Power and lighting to marine edge', description: 'Power supply and lighting to marine operating areas.', unit: 'Sum', benchmarkRate: 4250000 }),
  ]),
  catalogSection(COASTAL_CODE, 'finishes_accessories', 'Finishes / accessories', 'Final marine accessories and finishing items.', [
    manualItem({ name: 'Safety ladders and bollards', description: 'Marine ladders, bollards, and edge safety accessories.', unit: 'Nr', benchmarkRate: 76000 }),
    manualItem({ name: 'Mooring accessories', description: 'Chains, cleats, and other mooring accessories.', unit: 'Set', benchmarkRate: 385000 }),
    manualItem({ name: 'Completion survey and as-built', description: 'Final marine survey and as-built documentation.', unit: 'Sum', benchmarkRate: 920000 }),
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
    manualItem({ name: 'Clear foundation footprint', description: 'Clear site area and establish foundation footprint.', unit: 'm²', benchmarkRate: 620 }),
    manualItem({ name: 'Detailed setting out', description: 'Set out foundation grids, benchmarks, and batter boards.', unit: 'Sum', benchmarkRate: 420000 }),
    manualItem({ name: 'Access and haul roads', description: 'Temporary access for excavation and concrete placement.', unit: 'Sum', benchmarkRate: 780000 }),
  ]),
  catalogSection(FOUNDATION_CODE, 'excavation', 'Excavation', 'Excavation to foundations, raft, or pile caps.', [
    manualItem({ name: 'Excavate footing pits', description: 'Excavate foundation pits and trenches.', unit: 'm³', benchmarkRate: 4400 }),
    manualItem({ name: 'Excavate pile cap areas', description: 'Excavate pile cap, raft, and deepened zones.', unit: 'm³', benchmarkRate: 5200 }),
    manualItem({ name: 'Dewatering', description: 'Dewatering and groundwater control for foundation pits.', unit: 'Sum', benchmarkRate: 950000 }),
    manualItem({ name: 'Spoil disposal', description: 'Cart away surplus excavated material.', unit: 'm³', benchmarkRate: 2650 }),
  ]),
  catalogSection(FOUNDATION_CODE, 'blinding_fill_compaction', 'Blinding / fill / compaction', 'Blinding concrete, fill, and layer compaction.', [
    formulaRateItem({ name: 'Blinding concrete', description: 'Blinding concrete to foundation beds.', unit: 'm³', inputs: buildRateInputs({ materials: 42000, labour: 9500, plant: 6000, transport: 3500, overhead: 4000 }) }),
    manualItem({ name: 'Imported fill', description: 'Selected imported fill and compaction under slab zones.', unit: 'm³', benchmarkRate: 10200 }),
    manualItem({ name: 'DPM below raft/slab', description: 'Damp proof membrane below raft or slab areas.', unit: 'm²', benchmarkRate: 1380 }),
    manualItem({ name: 'Layer compaction tests', description: 'Compaction tests and approvals to fill layers.', unit: 'Nr', benchmarkRate: 92000 }),
  ]),
  catalogSection(FOUNDATION_CODE, 'reinforcement_formwork', 'Reinforcement / formwork', 'Rebar and formwork for foundation elements.', [
    manualItem({ name: 'Footing reinforcement', description: 'Reinforcement to pad, strip, and combined footings.', unit: 'kg', benchmarkRate: 1650 }),
    manualItem({ name: 'Pile cap reinforcement', description: 'Reinforcement to pile caps and ground beams.', unit: 'kg', benchmarkRate: 1720 }),
    manualItem({ name: 'Foundation formwork', description: 'Formwork to footings, caps, beams, and raft edges.', unit: 'm²', benchmarkRate: 15800 }),
    manualItem({ name: 'Anchor bolts / templates', description: 'Anchor bolts, holding down bolts, and templates.', unit: 'Set', benchmarkRate: 18500 }),
  ]),
  catalogSection(FOUNDATION_CODE, 'raft_pilecaps_groundbeams', 'Raft / pile caps / ground beams', 'Main structural concrete foundation elements.', [
    formulaRateItem({ name: 'Raft concrete', description: 'Concrete to raft slab and thickened zones.', unit: 'm³', inputs: buildRateInputs({ materials: 86000, labour: 13500, plant: 11000, transport: 4600, overhead: 6200 }) }),
    formulaRateItem({ name: 'Pile cap concrete', description: 'Concrete to pile caps and pedestals.', unit: 'm³', inputs: buildRateInputs({ materials: 89000, labour: 14200, plant: 11600, transport: 4700, overhead: 6400 }) }),
    formulaRateItem({ name: 'Ground beam concrete', description: 'Concrete to ground beams and tie beams.', unit: 'm³', inputs: buildRateInputs({ materials: 84500, labour: 12800, plant: 10200, transport: 4300, overhead: 5900 }) }),
    manualItem({ name: 'Pile testing and trimming', description: 'Pile integrity tests, load tests, and pile head trimming.', unit: 'Nr', benchmarkRate: 620000 }),
  ]),
  catalogSection(FOUNDATION_CODE, 'backfilling_waterproofing', 'Backfilling / waterproofing', 'Completion items to buried foundation works.', [
    manualItem({ name: 'Selected backfilling', description: 'Selected backfill around completed foundation works.', unit: 'm³', benchmarkRate: 5200 }),
    manualItem({ name: 'Bituminous coating', description: 'Bituminous coating to buried faces.', unit: 'm²', benchmarkRate: 3450 }),
    manualItem({ name: 'Anti-termite treatment', description: 'Anti-termite treatment to formation and fill.', unit: 'm²', benchmarkRate: 1280 }),
    manualItem({ name: 'Waterproof membrane details', description: 'Waterproof membrane and joint treatment details.', unit: 'm²', benchmarkRate: 6200 }),
  ]),
  catalogSection(FOUNDATION_CODE, 'testing_handover', 'Testing / handover', 'QA checks, as-built, and handover.', [
    manualItem({ name: 'Cube and material testing', description: 'Concrete cubes, slump tests, and material QA.', unit: 'Sum', benchmarkRate: 520000 }),
    manualItem({ name: 'As-built foundation survey', description: 'Final as-built survey of completed foundations.', unit: 'Sum', benchmarkRate: 260000 }),
    manualItem({ name: 'Completion handover package', description: 'Snag resolution and handover documentation.', unit: 'Sum', benchmarkRate: 180000 }),
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
    manualItem({ name: 'Trench excavation', description: 'Excavate trenches to line and level for pipelines or ducts.', unit: 'm³', benchmarkRate: 4300 }),
    manualItem({ name: 'Excavate road crossings', description: 'Excavate or break road crossings and hard areas.', unit: 'm³', benchmarkRate: 9200 }),
    manualItem({ name: 'Support to trench sides', description: 'Temporary trench support and side protection.', unit: 'm²', benchmarkRate: 14800 }),
    manualItem({ name: 'Spoil disposal', description: 'Dispose surplus excavated or unsuitable material.', unit: 'm³', benchmarkRate: 2800 }),
  ]),
  catalogSection(WATER_CODE, 'bedding_surround', 'Bedding / pipe surround', 'Bedding and selected surround materials.', [
    manualItem({ name: 'Sand bedding', description: 'Sand bedding to utilities or pipelines.', unit: 'm³', benchmarkRate: 8400 }),
    manualItem({ name: 'Selected pipe surround', description: 'Selected surround and sidefill material.', unit: 'm³', benchmarkRate: 7600 }),
    manualItem({ name: 'Warning tape / marker mesh', description: 'Warning tape or marker mesh above utilities.', unit: 'm', benchmarkRate: 450 }),
  ]),
  catalogSection(WATER_CODE, 'pipe_installation', 'Pipe installation', 'Main pipe or utility installation works.', [
    manualItem({ name: 'HDPE / uPVC pipe laying', description: 'Supply and lay water or utility pipework complete.', unit: 'm', benchmarkRate: 18500 }),
    manualItem({ name: 'Ductile iron pipe laying', description: 'Supply and lay ductile iron or heavy-duty pressure pipe.', unit: 'm', benchmarkRate: 42500 }),
    manualItem({ name: 'Fittings and specials', description: 'Bends, tees, reducers, couplings, and specials.', unit: 'Set', benchmarkRate: 265000 }),
    manualItem({ name: 'Valves and hydrants', description: 'Valves, hydrants, and valve accessories.', unit: 'Nr', benchmarkRate: 385000 }),
  ]),
  catalogSection(WATER_CODE, 'chambers_valve_pits', 'Chambers / valve pits', 'Valve chambers, inspection pits, and access structures.', [
    manualItem({ name: 'Valve chambers', description: 'Reinforced concrete valve chambers complete.', unit: 'Nr', benchmarkRate: 285000 }),
    manualItem({ name: 'Inspection chambers', description: 'Inspection chambers and access pits complete.', unit: 'Nr', benchmarkRate: 235000 }),
    manualItem({ name: 'Covers and frames', description: 'Heavy-duty covers and frames complete.', unit: 'Nr', benchmarkRate: 82000 }),
  ]),
  catalogSection(WATER_CODE, 'concrete_works', 'Concrete works', 'Concrete to thrust blocks, chambers, and supports.', [
    formulaRateItem({ name: 'Concrete thrust blocks', description: 'Concrete thrust blocks and pipe supports.', unit: 'm³', inputs: buildRateInputs({ materials: 79000, labour: 11800, plant: 9200, transport: 3900, overhead: 5200 }) }),
    formulaRateItem({ name: 'Concrete chambers', description: 'Concrete to chambers, bases, and covers.', unit: 'm³', inputs: buildRateInputs({ materials: 81500, labour: 12200, plant: 9500, transport: 4000, overhead: 5400 }) }),
    manualItem({ name: 'Reinforcement to chambers', description: 'Reinforcement cutting, bending, and fixing.', unit: 'kg', benchmarkRate: 1680 }),
    manualItem({ name: 'Formwork to chambers', description: 'Formwork to pits, walls, and cover slabs.', unit: 'm²', benchmarkRate: 16200 }),
  ]),
  catalogSection(WATER_CODE, 'testing_commissioning', 'Testing / commissioning', 'Pressure tests, flushing, and commissioning.', [
    manualItem({ name: 'Hydrostatic testing', description: 'Pressure testing of installed pipeline sections.', unit: 'm', benchmarkRate: 950 }),
    manualItem({ name: 'Flushing and disinfection', description: 'Flush and disinfect completed water mains.', unit: 'm', benchmarkRate: 1250 }),
    manualItem({ name: 'Commissioning and authority inspection', description: 'Commissioning and authority witness inspections.', unit: 'Sum', benchmarkRate: 680000 }),
  ]),
  catalogSection(WATER_CODE, 'reinstatement_finishing', 'Reinstatement / finishing', 'Surface reinstatement and final finishing.', [
    manualItem({ name: 'Road reinstatement', description: 'Reinstate asphalt, concrete, or paving surfaces after trenching.', unit: 'm²', benchmarkRate: 12800 }),
    manualItem({ name: 'Topsoil and verge reinstatement', description: 'Reinstate verges, topsoil, and grassed areas.', unit: 'm²', benchmarkRate: 3200 }),
    manualItem({ name: 'Marker posts and signage', description: 'Marker posts, warning signs, and utility markers.', unit: 'Nr', benchmarkRate: 28500 }),
    manualItem({ name: 'Final cleanup', description: 'Completion cleaning and handover.', unit: 'Sum', benchmarkRate: 220000 }),
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
  const initialSelectedSource = hasFormula ? 'formula' : 'manual';
  const formulaCalculatedRate = hasFormula ? (formulaRate ?? 0) : 0;
  const resolvedUnitRate = hasFormula
    ? (formulaCalculatedRate || catalogBenchmarkRate)
    : catalogBenchmarkRate;
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
    useBenchmark: false,
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
