const clampNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

export const evaluateFormulaExpression = (expression, inputMap = {}) => {
  const normalizedExpression = String(expression || '').trim();
  if (!normalizedExpression || !SAFE_EXPRESSION_PATTERN.test(normalizedExpression)) {
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

export const buildWorkedExampleText = (item) => {
  const inputs = Array.isArray(item?.exampleInputs) && item.exampleInputs.length > 0
    ? normalizeEditableInputs(item.exampleInputs)
    : normalizeEditableInputs(item?.editableInputs);

  if (inputs.length === 0) return '';

  const inputMap = inputs.reduce((acc, input) => {
    acc[input.id] = clampNumber(input.value);
    return acc;
  }, {});

  const result = item?.defaultFormulaType === 'expression'
    ? evaluateFormulaExpression(item.formulaExpression || item.formulaText, inputMap)
    : Object.values(inputMap).reduce((sum, value) => sum + clampNumber(value), 0);

  const detail = inputs
    .map((input) => `${input.label}: ${clampNumber(input.value).toLocaleString()}${input.unit ? ` ${input.unit}` : ''}`)
    .join(' | ');

  return detail ? `${detail} => ₦${result.toLocaleString()}` : '';
};

