const clampNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatFormulaValue = (value) => (
  clampNumber(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
);

const cloneInput = (input = {}) => ({
  id: String(input.id || '').trim(),
  label: String(input.label || input.id || '').trim(),
  unit: String(input.unit || '').trim(),
  type: input.type === 'text' ? 'text' : 'number',
  value: input.type === 'text' ? String(input.value || '') : clampNumber(input.value),
  defaultValue: input.type === 'text'
    ? String(input.defaultValue || '')
    : clampNumber(input.defaultValue ?? input.value),
  placeholder: String(input.placeholder || '').trim(),
  helpText: String(input.helpText || '').trim(),
});

export const normalizeEditableInputs = (inputs = []) => (
  (Array.isArray(inputs) ? inputs : [])
    .map(cloneInput)
    .filter((input) => input.id && input.label)
);

export const editableInputsToValueMap = (inputs = []) => (
  normalizeEditableInputs(inputs).reduce((acc, input) => {
    acc[input.id] = input.type === 'text' ? String(input.value || '') : clampNumber(input.value);
    return acc;
  }, {})
);

export const isFormulaDrivenItem = (item) => (
  !!item
  && item.defaultFormulaType
  && item.defaultFormulaType !== 'manual'
  && Array.isArray(item.editableInputs)
  && item.editableInputs.length > 0
);

const SAFE_EXPRESSION_PATTERN = /^[0-9+\-*/().,\sA-Za-z_]+$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
// The charset above allows `.` (needed for decimals like `1.5`) and `(`, which
// together would otherwise let something like `console.log(a)` slip through as
// "safe" and actually execute — these formulas are meant to be pure arithmetic
// over the supplied variables, never function calls or property access.
const FUNCTION_CALL_PATTERN = /[A-Za-z_]\w*\s*\(/;
const NON_DECIMAL_DOT_PATTERN = /(?<!\d)\.|\.(?!\d)/;

export const evaluateFormulaExpression = (expression, inputMap = {}) => {
  const normalizedExpression = String(expression || '').trim();
  if (
    !normalizedExpression
    || !SAFE_EXPRESSION_PATTERN.test(normalizedExpression)
    || FUNCTION_CALL_PATTERN.test(normalizedExpression)
    || NON_DECIMAL_DOT_PATTERN.test(normalizedExpression)
  ) {
    return 0;
  }

  const variableNames = Object.keys(inputMap).filter((key) => SAFE_IDENTIFIER_PATTERN.test(key));
  const variableValues = variableNames.map((key) => clampNumber(inputMap[key]));

  try {
    const evaluator = new Function(...variableNames, `"use strict"; return (${normalizedExpression});`);
    return clampNumber(evaluator(...variableValues));
  } catch {
    return 0;
  }
};

// `evaluateFormulaExpression` treats any identifier missing from `inputMap` as 0
// rather than throwing, so a typo'd variable name (e.g. `lenght` instead of
// `length`) silently produces a wrong — often zero — rate with no error
// anywhere in the UI. This walks the expression's identifier tokens and reports
// which ones won't resolve to a defined input, so callers can surface a warning
// instead of quietly trusting a miscalculated number.
export const getUnresolvedFormulaVariables = (expression, inputMap = {}) => {
  const normalizedExpression = String(expression || '').trim();
  if (
    !normalizedExpression
    || !SAFE_EXPRESSION_PATTERN.test(normalizedExpression)
    || FUNCTION_CALL_PATTERN.test(normalizedExpression)
    || NON_DECIMAL_DOT_PATTERN.test(normalizedExpression)
  ) {
    return [];
  }

  const knownKeys = new Set(Object.keys(inputMap).filter((key) => SAFE_IDENTIFIER_PATTERN.test(key)));
  const referencedIdentifiers = normalizedExpression.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];

  return Array.from(new Set(
    referencedIdentifiers.filter((identifier) => !knownKeys.has(identifier))
  ));
};

export const evaluateBoqFormulaRate = (item) => {
  if (!isFormulaDrivenItem(item)) return null;

  const inputMap = editableInputsToValueMap(item.editableInputs);

  switch (item.defaultFormulaType) {
    case 'expression':
      return evaluateFormulaExpression(item.formulaExpression || item.formulaText, inputMap);
    case 'input-sum':
      return Object.values(inputMap).reduce((sum, value) => sum + clampNumber(value), 0);
    default:
      return null;
  }
};

export const getFormulaDisplayText = (item) => (
  String(item?.formulaText || item?.formulaExpression || '').trim()
);

const buildWorkedExampleFromInputs = (item, inputs = []) => {
  const normalizedInputs = normalizeEditableInputs(inputs);
  if (normalizedInputs.length === 0) return '';

  const inputMap = normalizedInputs.reduce((acc, input) => {
    acc[input.id] = clampNumber(input.value);
    return acc;
  }, {});

  const result = item?.defaultFormulaType === 'expression'
    ? evaluateFormulaExpression(item.formulaExpression || item.formulaText, inputMap)
    : normalizedInputs.reduce((sum, input) => sum + clampNumber(input.value), 0);

  const detail = normalizedInputs
    .map((input) => `${input.label} ${formatFormulaValue(input.value)}${input.unit ? ` ${input.unit}` : ''}`)
    .join(' + ');

  return detail ? `Example: ${detail} = N${formatFormulaValue(result)}` : '';
};

export const buildWorkedExampleText = (item) => {
  const inputs = Array.isArray(item?.exampleInputs) && item.exampleInputs.length > 0
    ? normalizeEditableInputs(item.exampleInputs)
    : normalizeEditableInputs(item?.editableInputs);

  return buildWorkedExampleFromInputs(item, inputs);
};

export const getWorkedExamplePreview = (item, { preferEditableInputs = false } = {}) => {
  if (!item) return '';

  const explicitWorkedExample = String(item.workedExample || '').trim();
  if (explicitWorkedExample) {
    return explicitWorkedExample;
  }

  const preferredInputs = preferEditableInputs
    ? normalizeEditableInputs(item.editableInputs)
    : normalizeEditableInputs(item.exampleInputs);
  const fallbackInputs = normalizeEditableInputs(item.editableInputs);
  const generatedExample = buildWorkedExampleFromInputs(
    item,
    preferredInputs.length > 0 ? preferredInputs : fallbackInputs
  );

  if (generatedExample) {
    return generatedExample;
  }

  if (!isFormulaDrivenItem(item)) {
    return '';
  }

  const formulaText = getFormulaDisplayText(item);
  if (!formulaText) {
    return 'Worked example placeholder: add example inputs to show how this rate is built.';
  }

  return `Worked example placeholder: add example inputs to demonstrate "${formulaText}".`;
};
