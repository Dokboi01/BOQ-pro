import { 
  evaluateBoqFormulaRate,
  buildWorkedExampleText,
  normalizeEditableInputs,
} from '../../../utils/boqFormulas';

const normalizeFormulaBasis = (basis) => {
  if (Array.isArray(basis)) return basis.map((b) => String(b || '').trim()).filter(Boolean);
  if (typeof basis === 'string') return basis.split(',').map((b) => b.trim()).filter(Boolean);
  return [];
};

const normalizeKeywords = (keywords) => {
  const flat = Array.isArray(keywords) ? keywords.flat() : [keywords];
  return [...new Set(flat.map((k) => String(k || '').trim().toLowerCase()).filter(Boolean))];
};

export const numericInput = (id, label, value, unit = '', helpText = '') => ({
  id,
  label,
  type: 'number',
  value,
  defaultValue: value,
  unit,
  helpText,
});

export const buildRateInputs = ({
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
const SEED_BENCHMARK_DATE = '2026-04-18';
const DEFAULT_CATALOG_BENCHMARK_NOTE = 'Catalog seed benchmark. Replace with verified Nigerian market rate.';

export const buildBenchmarkMetadata = ({
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

export const buildSeedBenchmarkMetadata = ({
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

export const baseCatalogItem = ({
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
  rateSourceOptions = ['benchmark', 'formula', 'manual'],
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
      : ['benchmark', 'formula', 'manual'],
  };

  if (defaultFormulaType !== 'manual' && !item.workedExample) {
    item.workedExample = buildWorkedExampleText(item);
  }

  return item;
};

export const manualItem = (args) => baseCatalogItem({ ...args, defaultFormulaType: 'manual' });

export const formulaRateItem = ({
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
  rateSourceOptions = ['benchmark', 'formula', 'manual'],
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
