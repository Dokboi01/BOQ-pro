import {
  buildWorkedExampleText,
  evaluateBoqFormulaRate,
  normalizeEditableInputs,
} from '../utils/boqFormulas';

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

const normalizeKeywords = (keywords = []) => (
  (Array.isArray(keywords) ? keywords : [])
    .map((keyword) => String(keyword || '').trim())
    .filter(Boolean)
);

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
  code,
  name,
  description,
  unit,
  benchmarkRate = 0,
  defaultFormulaType = 'manual',
  formulaText = '',
  formulaExpression = '',
  editableInputs = [],
  exampleInputs = [],
  workedExample = '',
  notes = '',
  category = 'General',
  keywords = [],
  pickerHint = '',
  isRecommended = false,
}) => {
  const normalizedEditableInputs = normalizeEditableInputs(editableInputs);
  const normalizedExampleInputs = normalizeEditableInputs(
    Array.isArray(exampleInputs) && exampleInputs.length > 0
      ? exampleInputs
      : normalizedEditableInputs
  );

  const item = {
    code,
    name,
    description,
    unit,
    benchmarkRate,
    defaultFormulaType,
    formulaText,
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
  };

  if (defaultFormulaType !== 'manual' && !item.workedExample) {
    item.workedExample = buildWorkedExampleText(item);
  }

  return item;
};

const manualItem = ({
  code,
  name,
  description,
  unit,
  benchmarkRate,
  notes = '',
  category = 'General',
  keywords = [],
  pickerHint = '',
  isRecommended = false,
}) => baseCatalogItem({
  code,
  name,
  description,
  unit,
  benchmarkRate,
  notes,
  category,
  keywords,
  pickerHint,
  isRecommended,
});

const formulaRateItem = ({
  code,
  name,
  description,
  unit,
  inputs,
  formulaText = expressionText,
  formulaExpression = expressionFormula,
  notes = '',
  category = 'General',
  keywords = [],
  pickerHint = '',
  isRecommended = false,
}) => {
  const benchmarkRate = evaluateBoqFormulaRate({
    defaultFormulaType: 'expression',
    formulaExpression,
    editableInputs: inputs,
  });

  return baseCatalogItem({
    code,
    name,
    description,
    unit,
    benchmarkRate,
    defaultFormulaType: 'expression',
    formulaText,
    formulaExpression,
    editableInputs: inputs,
    exampleInputs: inputs,
    notes,
    category,
    keywords,
    pickerHint,
    isRecommended,
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
    'Road preliminaries, traffic control, and QA startup.',
    createPreliminariesItems(ROAD_CODE, { includeTraffic: true }),
    {
      trade: 'Preliminaries',
      pickerPrompt: 'Start with road-specific preliminaries such as mobilization, traffic management, HSE, supervision, and temporary facilities.',
      emptyStateMessage: 'Pick the enabling items needed to open and run the road site safely before pricing the production bills.',
    }
  ),
  catalogSection(ROAD_CODE, 'site_clearance_demolition', 'Site clearance / demolition', 'Clearing, grubbing, and demolition works.', [
    manualItem({ name: 'Clearing and grubbing', description: 'Clear right-of-way and grub roots within the carriageway corridor.', unit: 'm²', benchmarkRate: 520 }),
    manualItem({ name: 'Strip topsoil', description: 'Strip topsoil to approved depth and stockpile or dispose.', unit: 'm³', benchmarkRate: 1850 }),
    manualItem({ name: 'Demolish failed pavement', description: 'Saw cut, break, and remove failed pavement sections.', unit: 'm²', benchmarkRate: 8200 }),
    manualItem({ name: 'Remove existing culverts and obstructions', description: 'Remove obsolete culverts, kerbs, and buried obstructions.', unit: 'Sum', benchmarkRate: 1850000 }),
    manualItem({ name: 'Cart away unsuitable material', description: 'Load and cart away unsuitable or demolished material.', unit: 'm³', benchmarkRate: 2600 }),
  ]),
  catalogSection(ROAD_CODE, 'earthworks', 'Earthworks', 'Formation shaping, excavation, fill, and compaction.', [
    manualItem({ name: 'Cut to spoil', description: 'Excavate cut sections to line and level.', unit: 'm³', benchmarkRate: 3200 }),
    manualItem({ name: 'Imported selected fill', description: 'Imported selected fill for embankment and formation.', unit: 'm³', benchmarkRate: 10200 }),
    manualItem({ name: 'Compaction to specification', description: 'Spread, water, and compact fill to required density.', unit: 'm²', benchmarkRate: 820 }),
    manualItem({ name: 'Borrow pit haulage', description: 'Haul approved fill material from borrow pit to site.', unit: 'm³', benchmarkRate: 2150 }),
    manualItem({ name: 'Formation trimming', description: 'Trim road formation and prepare final earthwork profile.', unit: 'm²', benchmarkRate: 620 }),
  ]),
  catalogSection(ROAD_CODE, 'subgrade', 'Subgrade', 'Subgrade preparation and stabilization.', [
    manualItem({ name: 'Proof rolling', description: 'Proof roll prepared formation and treat soft spots.', unit: 'm²', benchmarkRate: 480 }),
    manualItem({ name: 'Subgrade trimming', description: 'Fine trim and compact subgrade to level and camber.', unit: 'm²', benchmarkRate: 560 }),
    formulaRateItem({ name: 'Subgrade stabilization', description: 'Imported sand, cement, or selected material stabilization.', unit: 'm³', inputs: buildRateInputs({ materials: 5800, labour: 950, plant: 520, transport: 330, overhead: 400 }) }),
    manualItem({ name: 'Capping layer', description: 'Capping layer placed and compacted to thickness.', unit: 'm³', benchmarkRate: 14500 }),
  ]),
  catalogSection(ROAD_CODE, 'sub_base', 'Sub-base', 'Granular sub-base construction.', [
    manualItem({ name: 'Granular sub-base material', description: 'Supply, spread, and compact granular sub-base.', unit: 'm³', benchmarkRate: 28800 }),
    manualItem({ name: 'Sub-base compaction control', description: 'Watering and compaction of sub-base to specification.', unit: 'm²', benchmarkRate: 820 }),
    manualItem({ name: 'Localized edge support', description: 'Additional sub-base support at widened edges and junctions.', unit: 'm³', benchmarkRate: 30200 }),
  ]),
  catalogSection(ROAD_CODE, 'base_course', 'Base course', 'Crushed stone base or treated base course.', [
    manualItem({ name: 'Crushed stone base', description: 'Supply and compact crushed stone base course.', unit: 'm³', benchmarkRate: 35800 }),
    manualItem({ name: 'Treated base adjustments', description: 'Localized treated base or dense graded stone at weak areas.', unit: 'm³', benchmarkRate: 38800 }),
    manualItem({ name: 'Base course compaction', description: 'Final shaping, watering, and compaction of base course.', unit: 'm²', benchmarkRate: 920 }),
  ]),
  catalogSection(ROAD_CODE, 'surfacing', 'Surfacing', 'Bituminous prime coat, binder, and wearing course items.', [
    manualItem({ name: 'Prime coat', description: 'Prime coat application on prepared base.', unit: 'm²', benchmarkRate: 1450 }),
    manualItem({ name: 'Tack coat', description: 'Tack coat emulsion application on prepared surface.', unit: 'm²', benchmarkRate: 980 }),
    formulaRateItem({ name: 'Asphalt binder course', description: 'Asphalt binder course laid and compacted.', unit: 'm²', inputs: buildRateInputs({ materials: 12200, labour: 1800, plant: 1350, transport: 620, overhead: 850 }) }),
    formulaRateItem({ name: 'Asphalt wearing course', description: 'Asphalt wearing course laid and compacted.', unit: 'm²', inputs: buildRateInputs({ materials: 10800, labour: 1700, plant: 1280, transport: 590, overhead: 780 }) }),
  ]),
  catalogSection(ROAD_CODE, 'drainage', 'Drainage', 'Roadside drains, culverts, and catchpit works.', [
    manualItem({ name: 'Concrete side drains', description: 'Concrete or masonry lined roadside drains.', unit: 'm', benchmarkRate: 19200 }),
    manualItem({ name: 'Pipe culverts', description: 'Pipe culverts complete with bedding and surround.', unit: 'm', benchmarkRate: 65000 }),
    manualItem({ name: 'Catchpits and gully inlets', description: 'Catchpits, gully inlets, and related drainage structures.', unit: 'Nr', benchmarkRate: 168000 }),
    manualItem({ name: 'Outfall protection', description: 'Stone pitching and erosion protection at drain outfalls.', unit: 'm²', benchmarkRate: 28500 }),
  ]),
  catalogSection(ROAD_CODE, 'road_furniture', 'Road furniture', 'Markings, signage, guardrails, and lighting.', [
    manualItem({ name: 'Road markings', description: 'Thermoplastic centerline and edge road markings.', unit: 'm', benchmarkRate: 4200 }),
    manualItem({ name: 'Regulatory signage', description: 'Road signs complete with posts and fittings.', unit: 'Nr', benchmarkRate: 185000 }),
    manualItem({ name: 'Guardrails', description: 'Steel guardrails with terminals and accessories.', unit: 'm', benchmarkRate: 24500 }),
    manualItem({ name: 'Street lighting', description: 'Street lighting poles, luminaires, and cabling.', unit: 'Nr', benchmarkRate: 620000 }),
  ]),
  catalogSection(ROAD_CODE, 'external_finishing', 'External / finishing items', 'Shoulders, kerbs, medians, and ancillary finishing works.', [
    manualItem({ name: 'Granular shoulders', description: 'Granular shoulder construction both sides of carriageway.', unit: 'm²', benchmarkRate: 7600 }),
    manualItem({ name: 'Precast kerbs', description: 'Precast concrete kerbs including bedding and haunching.', unit: 'm', benchmarkRate: 10200 }),
    manualItem({ name: 'Median barriers', description: 'Median barriers and concrete separator works.', unit: 'm', benchmarkRate: 46800 }),
    manualItem({ name: 'Verges and cleanup', description: 'Final verges, tidy-up, and completion cleaning.', unit: 'Sum', benchmarkRate: 980000 }),
  ]),
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
    formulaExpression: catalogItem.formulaExpression || '',
    exampleInputs: normalizeEditableInputs(catalogItem.exampleInputs),
    editableInputs,
    workedExample: catalogItem.workedExample || '',
    category: catalogItem.category || billSectionTitle || 'General',
    keywords: normalizeKeywords(catalogItem.keywords),
    pickerHint: catalogItem.pickerHint || '',
    isRecommended: catalogItem.isRecommended === true,
    quantity,
    qty: quantity,
    // --- new tri-modal rate model ---
    selectedRateSource: initialSelectedSource,
    formulaCalculatedRate,
    resolvedUnitRate,
    manualRate: 0,
    benchmarkMetadata: {
      rate: catalogBenchmarkRate,
      currency: 'NGN',
      region: 'Lagos',
      sourceType: 'catalog',
      sourceNote: 'BOQ-Pro item library benchmark',
      dateCaptured: null,
      confidenceLevel: catalogBenchmarkRate > 0 ? 'medium' : 'low',
    },
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
  formulaExpression: '',
  exampleInputs: [],
  editableInputs: [],
  workedExample: '',
  category: 'Custom',
  keywords: [],
  pickerHint: '',
  isRecommended: false,
  quantity: 0,
  unitRate: 0,
  amount: 0,
  notes: '',
  benchmarkRate: 0,
  qty: 0,
  rate: 0,
  total: 0,
  benchmark: 0,
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
