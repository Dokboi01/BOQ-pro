const sanitizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeUnitString = (unit = '') => (
  String(unit || '')
    .toLowerCase()
    .replace(/\u00b2/g, '2')
    .replace(/\u00b3/g, '3')
    .trim()
);

const tokenizeUnit = (unit = '') => (
  normalizeUnitString(unit)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
);

const normalizeText = (value = '') => (
  String(value || '')
    .toLowerCase()
    .replace(/\u00b2/g, '2')
    .replace(/\u00b3/g, '3')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
);

export const TAKEOFF_FIELD_META = {
  length: { label: 'Length', unit: 'm' },
  width: { label: 'Width', unit: 'm' },
  height: { label: 'Height', unit: 'm' },
  depth: { label: 'Depth', unit: 'm' },
  radius: { label: 'Radius', unit: 'm' },
  innerRadius: { label: 'Inner Radius', unit: 'm' },
  topWidth: { label: 'Top Width', unit: 'm' },
  bottomWidth: { label: 'Bottom Width', unit: 'm' },
  base: { label: 'Base', unit: 'm' },
  thickness: { label: 'Thickness', unit: 'm' },
  footingWidth: { label: 'Footing Width', unit: 'm' },
  footingDepth: { label: 'Footing Depth', unit: 'm' },
  sections: { label: 'Repeats', unit: 'nr' },
  count: { label: 'Count', unit: 'nr' },
  periods: { label: 'Duration', unit: 'periods' },
  lots: { label: 'Lots', unit: 'nr' },
  distance: { label: 'Distance', unit: 'km' },
  volume: { label: 'Volume', unit: 'm3' },
  tonnage: { label: 'Tonnage', unit: 'ton' },
  weight: { label: 'Weight', unit: 'kg' },
  unitWeight: { label: 'Unit Weight', unit: 'kg/m' },
  density: { label: 'Density', unit: 'ton/m3' },
  allowance: { label: 'Allowance', unit: '%' },
};

export const DEFAULT_TAKEOFF_PARAMS = {
  length: 0,
  width: 0,
  height: 0,
  depth: 0,
  radius: 0,
  innerRadius: 0,
  topWidth: 0,
  bottomWidth: 0,
  base: 0,
  thickness: 0.2,
  footingWidth: 0,
  footingDepth: 0,
  sections: 1,
  count: 1,
  periods: 1,
  lots: 1,
  distance: 0,
  volume: 0,
  tonnage: 0,
  weight: 0,
  unitWeight: 0,
  density: 1,
  allowance: 0,
};

const TAKEOFF_TEMPLATE_MAP = {
  'linear-run': { id: 'linear-run', label: 'Linear Run', iconKey: 'ruler', fields: ['length', 'sections'], formula: 'Q = L x N' },
  perimeter: { id: 'perimeter', label: 'Perimeter', iconKey: 'square', fields: ['length', 'width', 'sections'], formula: 'Q = 2 x (L + W) x N' },
  'circular-run': { id: 'circular-run', label: 'Circular Run', iconKey: 'circle', fields: ['radius', 'sections'], formula: 'Q = 2 x pi x r x N' },
  'surface-strip': { id: 'surface-strip', label: 'Surface / Strip Area', iconKey: 'square', fields: ['length', 'width', 'sections'], formula: 'Q = L x W x N' },
  'wall-area': { id: 'wall-area', label: 'Wall / Face Area', iconKey: 'layers', fields: ['length', 'height', 'sections'], formula: 'Q = L x H x N' },
  'circle-area': { id: 'circle-area', label: 'Circular Area', iconKey: 'circle', fields: ['radius', 'sections'], formula: 'Q = pi x r^2 x N' },
  'trapezoid-area': { id: 'trapezoid-area', label: 'Trapezoid Area', iconKey: 'triangle', fields: ['length', 'topWidth', 'bottomWidth', 'sections'], formula: 'Q = L x ((W1 + W2) / 2) x N' },
  'rectangular-volume': { id: 'rectangular-volume', label: 'Rectangular Volume', iconKey: 'square', fields: ['length', 'width', 'depth', 'sections'], formula: 'Q = L x W x D x N' },
  'circular-column': { id: 'circular-column', label: 'Circular Volume', iconKey: 'circle', fields: ['radius', 'height', 'sections'], formula: 'Q = pi x r^2 x H x N' },
  'trapezoidal-volume': { id: 'trapezoidal-volume', label: 'Trapezoidal Section', iconKey: 'layers', fields: ['length', 'topWidth', 'bottomWidth', 'depth', 'sections'], formula: 'Q = L x ((W1 + W2) / 2) x D x N' },
  'triangular-prism': { id: 'triangular-prism', label: 'Triangular Prism', iconKey: 'triangle', fields: ['length', 'base', 'height', 'sections'], formula: 'Q = 0.5 x B x H x L x N' },
  'pipe-ring': { id: 'pipe-ring', label: 'Pipe / Ring Volume', iconKey: 'circle-dot', fields: ['length', 'radius', 'innerRadius', 'sections'], formula: 'Q = pi x (R^2 - r^2) x L x N' },
  cone: { id: 'cone', label: 'Circular Cone', iconKey: 'pyramid', fields: ['radius', 'height', 'sections'], formula: 'Q = (1/3) x pi x r^2 x H x N' },
  culvert: { id: 'culvert', label: 'Box Culvert Section', iconKey: 'square', fields: ['length', 'width', 'height', 'thickness', 'sections'], formula: 'Q = (Outer volume - Inner volume) x N' },
  abutment: { id: 'abutment', label: 'Stem + Footing', iconKey: 'layers', fields: ['length', 'height', 'thickness', 'footingWidth', 'footingDepth', 'sections'], formula: 'Q = (Stem volume + Footing volume) x N' },
  'count-units': { id: 'count-units', label: 'Count Units', iconKey: 'calculator', fields: ['count'], formula: 'Q = N' },
  'lump-sum': { id: 'lump-sum', label: 'Count Lots', iconKey: 'check', fields: ['lots'], formula: 'Q = Lots' },
  duration: { id: 'duration', label: 'Duration x Repeats', iconKey: 'layers', fields: ['periods', 'count'], formula: 'Q = Duration x N' },
  'distance-run': { id: 'distance-run', label: 'Distance Run', iconKey: 'ruler', fields: ['distance', 'sections'], formula: 'Q = Distance x N' },
  'haulage-volume': { id: 'haulage-volume', label: 'Volume-Distance Haulage', iconKey: 'layers', fields: ['volume', 'distance', 'sections'], formula: 'Q = Volume x Distance x N' },
  'haulage-tonnage': { id: 'haulage-tonnage', label: 'Tonnage-Distance Haulage', iconKey: 'layers', fields: ['tonnage', 'distance', 'sections'], formula: 'Q = Tonnage x Distance x N' },
  'direct-weight-kg': { id: 'direct-weight-kg', label: 'Direct Weight', iconKey: 'calculator', fields: ['weight'], formula: 'Q = Weight' },
  'length-weight': { id: 'length-weight', label: 'Length x Unit Weight', iconKey: 'ruler', fields: ['length', 'unitWeight', 'sections'], formula: 'Q = L x kg/m x N' },
  'direct-tonnage': { id: 'direct-tonnage', label: 'Direct Tonnage', iconKey: 'calculator', fields: ['tonnage'], formula: 'Q = Tonnes' },
  'volume-density-ton': { id: 'volume-density-ton', label: 'Volume x Density', iconKey: 'square', fields: ['length', 'width', 'depth', 'density', 'sections'], formula: 'Q = L x W x D x density x N' },
};

const UNIT_FAMILY_TEMPLATES = {
  m: ['linear-run', 'perimeter', 'circular-run'],
  m2: ['surface-strip', 'wall-area', 'circle-area', 'trapezoid-area'],
  m3: ['rectangular-volume', 'trapezoidal-volume', 'triangular-prism', 'circular-column', 'pipe-ring', 'culvert', 'abutment', 'cone'],
  nr: ['count-units'],
  sum: ['lump-sum'],
  day: ['duration'],
  month: ['duration'],
  km: ['distance-run'],
  'm3-km': ['haulage-volume'],
  'ton-km': ['haulage-tonnage'],
  kg: ['direct-weight-kg', 'length-weight'],
  ton: ['direct-tonnage', 'volume-density-ton'],
};

const RECOMMENDATION_RULES = [
  { families: ['m3-km'], templateId: 'haulage-volume', reason: 'This item is measured by hauled volume multiplied by haul distance.' },
  { families: ['ton-km'], templateId: 'haulage-tonnage', reason: 'This item is measured by hauled tonnage multiplied by haul distance.' },
  { families: ['day', 'month'], templateId: 'duration', reason: 'This item is a time-based BOQ line, so duration is the correct quantity basis.' },
  { families: ['sum'], templateId: 'lump-sum', reason: 'This item is billed as a lot or lump sum rather than a geometric quantity.' },
  { families: ['kg'], templateId: 'length-weight', patterns: [/reinforcement|rebar|steel bar|mesh|tie rod|railing|bar\b/], reason: 'Weight for this item is usually derived from measured length multiplied by a unit weight.' },
  { families: ['ton'], templateId: 'volume-density-ton', patterns: [/aggregate|stone|rock|laterite|sand|fill|armour|riprap|base|sub-base|subgrade|surfacing/], reason: 'This material item is often converted from measured volume using a density factor.' },
  { families: ['m3'], templateId: 'culvert', patterns: [/box culvert|culvert|box drain|u drain|u-drain/], reason: 'The item reads like a box or drain section where outer minus inner volume is the right takeoff basis.' },
  { families: ['m3'], templateId: 'pipe-ring', patterns: [/pipe|rcp|hdpe|pvc|ring|circular pipe|cylinder/], reason: 'This item reads like a pipe or annular section, so ring volume is the closest takeoff basis.' },
  { families: ['m3'], templateId: 'abutment', patterns: [/abutment|wing wall|headwall|retaining wall|footing/], reason: 'This item reads like a wall-and-footing concrete element.' },
  { families: ['m3'], templateId: 'trapezoidal-volume', patterns: [/drain|ditch|channel|trench|excavat|shoulder|embankment|slope|backfill|fill/], reason: 'This item reads like a trench, drain, shoulder, or fill section measured from average section times length.' },
  { families: ['m2'], templateId: 'wall-area', patterns: [/wall|paint|painting|plaster|lining|formwork|parapet|fence wall/], reason: 'This item reads like a face or wall measurement, so length by height is the best fit.' },
  { families: ['m2'], templateId: 'trapezoid-area', patterns: [/drain|ditch|channel|shoulder|slope|verge|embankment/], reason: 'This item reads like a variable-width strip or channel face measured by average width times length.' },
  { families: ['m2'], templateId: 'surface-strip', patterns: [/road|walkway|paving|surface|slab|surfacing|prime coat|tack coat|proof rolling|scarification|cleaning|grassing|hydroseeding|topsoil/], reason: 'This item reads like a plan-area or surface treatment measurement.' },
  { families: ['m'], templateId: 'perimeter', patterns: [/perimeter|around|enclosure|hoarding/], reason: 'This item may be measured around an enclosure or perimeter run.' },
  { families: ['m'], templateId: 'linear-run', patterns: [/pipe|drain|kerb|barrier|guardrail|marking|fence|rail|cable|duct|joint|edge|lighting/], reason: 'This item is normally measured along its installed length.' },
];

const detectUnitFamilies = (unit = '') => {
  const tokens = tokenizeUnit(unit);
  const families = new Set();
  const hasToken = (...candidates) => candidates.some((candidate) => tokens.includes(candidate));

  if (hasToken('m3', 'cum', 'cubic') && hasToken('km')) families.add('m3-km');
  if (hasToken('ton', 'tonne', 't') && hasToken('km')) families.add('ton-km');
  if (hasToken('m2', 'sqm', 'square')) families.add('m2');
  if (hasToken('m3', 'cum', 'cubic')) families.add('m3');
  if (hasToken('m', 'lm', 'rm', 'linm', 'mtr', 'meter', 'metre')) families.add('m');
  if (hasToken('kg', 'kilogram')) families.add('kg');
  if (hasToken('ton', 'tonne')) families.add('ton');
  if (hasToken('km')) families.add('km');
  if (hasToken('sum')) families.add('sum');
  if (hasToken('day')) families.add('day');
  if (hasToken('month')) families.add('month');
  if (hasToken('nr', 'no', 'nos', 'pcs', 'pc', 'item', 'set', 'test')) families.add('nr');

  return families.size > 0 ? Array.from(families) : ['nr'];
};

const buildItemHaystack = (item = {}) => normalizeText([
  item?.name,
  item?.description,
  item?.category,
  item?.billSection,
  item?.billSectionTitle,
  item?.formulaText,
  ...(Array.isArray(item?.keywords) ? item.keywords : []),
].join(' '));

const getDefaultTemplateForFamily = (family) => (
  UNIT_FAMILY_TEMPLATES[family]?.[0] || 'count-units'
);

export const getTakeoffConfigForItem = (item = {}) => {
  const unitFamilies = detectUnitFamilies(item?.unit);
  const templateIds = Array.from(new Set(
    unitFamilies.flatMap((family) => UNIT_FAMILY_TEMPLATES[family] || [])
  ));
  const templates = templateIds
    .map((templateId) => TAKEOFF_TEMPLATE_MAP[templateId])
    .filter(Boolean);
  const haystack = buildItemHaystack(item);

  const matchedRule = RECOMMENDATION_RULES.find((rule) => (
    rule.families.some((family) => unitFamilies.includes(family))
    && (!rule.patterns || rule.patterns.some((pattern) => pattern.test(haystack)))
    && templateIds.includes(rule.templateId)
  ));

  const persistedTemplateId = item?.takeoffMeta?.templateId;
  const recommendedTemplateId = templateIds.includes(persistedTemplateId)
    ? persistedTemplateId
    : matchedRule?.templateId || getDefaultTemplateForFamily(unitFamilies[0]);
  const recommendedTemplate = TAKEOFF_TEMPLATE_MAP[recommendedTemplateId] || templates[0] || TAKEOFF_TEMPLATE_MAP['count-units'];

  return {
    primaryFamily: unitFamilies[0] || 'nr',
    unitFamilies,
    templates: templates.length > 0 ? templates : [TAKEOFF_TEMPLATE_MAP['count-units']],
    recommendedTemplateId: recommendedTemplate.id,
    recommendedTemplate,
    recommendedReason: matchedRule?.reason || 'This is the closest calculator match for the item unit and description.',
  };
};

export const computeTakeoffQuantity = (templateId, params = {}) => {
  const values = { ...DEFAULT_TAKEOFF_PARAMS, ...params };
  const length = sanitizeNumber(values.length);
  const width = sanitizeNumber(values.width);
  const height = sanitizeNumber(values.height);
  const depth = sanitizeNumber(values.depth);
  const radius = sanitizeNumber(values.radius);
  const innerRadius = sanitizeNumber(values.innerRadius);
  const topWidth = sanitizeNumber(values.topWidth);
  const bottomWidth = sanitizeNumber(values.bottomWidth);
  const base = sanitizeNumber(values.base);
  const thickness = sanitizeNumber(values.thickness);
  const footingWidth = sanitizeNumber(values.footingWidth);
  const footingDepth = sanitizeNumber(values.footingDepth);
  const sections = Math.max(sanitizeNumber(values.sections), 1);
  const count = Math.max(sanitizeNumber(values.count), 0);
  const periods = Math.max(sanitizeNumber(values.periods), 0);
  const lots = Math.max(sanitizeNumber(values.lots), 0);
  const distance = Math.max(sanitizeNumber(values.distance), 0);
  const volume = Math.max(sanitizeNumber(values.volume), 0);
  const tonnage = Math.max(sanitizeNumber(values.tonnage), 0);
  const weight = Math.max(sanitizeNumber(values.weight), 0);
  const unitWeight = Math.max(sanitizeNumber(values.unitWeight), 0);
  const density = Math.max(sanitizeNumber(values.density), 0);

  switch (templateId) {
    case 'linear-run':
      return length * sections;
    case 'perimeter':
      return (2 * (length + width)) * sections;
    case 'circular-run':
      return (2 * Math.PI * radius) * sections;
    case 'surface-strip':
      return length * width * sections;
    case 'wall-area':
      return length * height * sections;
    case 'circle-area':
      return Math.PI * Math.pow(radius, 2) * sections;
    case 'trapezoid-area':
      return length * ((topWidth + bottomWidth) / 2) * sections;
    case 'rectangular-volume':
      return length * width * depth * sections;
    case 'circular-column':
      return Math.PI * Math.pow(radius, 2) * height * sections;
    case 'trapezoidal-volume':
      return length * ((topWidth + bottomWidth) / 2) * depth * sections;
    case 'triangular-prism':
      return 0.5 * base * height * length * sections;
    case 'pipe-ring':
      return Math.PI * Math.max(0, (Math.pow(radius, 2) - Math.pow(innerRadius, 2))) * length * sections;
    case 'cone':
      return (Math.PI * Math.pow(radius, 2) * height * sections) / 3;
    case 'culvert': {
      const innerWidth = Math.max(0, width - (2 * thickness));
      const innerHeight = Math.max(0, height - (2 * thickness));
      return (((width * height) - (innerWidth * innerHeight)) * length) * sections;
    }
    case 'abutment': {
      const stemVolume = length * height * thickness;
      const footingVolume = length * footingWidth * footingDepth;
      return (stemVolume + footingVolume) * sections;
    }
    case 'count-units':
      return count;
    case 'lump-sum':
      return lots;
    case 'duration':
      return periods * Math.max(count || 1, 1);
    case 'distance-run':
      return distance * sections;
    case 'haulage-volume':
      return volume * distance * sections;
    case 'haulage-tonnage':
      return tonnage * distance * sections;
    case 'direct-weight-kg':
      return weight;
    case 'length-weight':
      return length * unitWeight * sections;
    case 'direct-tonnage':
      return tonnage;
    case 'volume-density-ton':
      return length * width * depth * density * sections;
    default:
      return 0;
  }
};

export const roundTakeoffQuantity = (value) => Number((sanitizeNumber(value) || 0).toFixed(3));
