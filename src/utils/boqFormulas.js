const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const numberOrNull = (value) => value === null || value === undefined || (typeof value === 'string' && !value.trim()) ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const formatFormulaValue = (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
const cloneInput = (input = {}) => ({
  id: String(input.id || '').trim(), label: String(input.label || input.id || '').trim(),
  unit: String(input.unit || '').trim(), type: input.type === 'text' ? 'text' : 'number',
  value: input.type === 'text' ? String(input.value || '') : input.value,
  defaultValue: input.defaultValue ?? input.value, placeholder: String(input.placeholder || '').trim(),
  helpText: String(input.helpText || '').trim(),
});
export const normalizeEditableInputs = (inputs = []) => (Array.isArray(inputs) ? inputs : []).map(cloneInput).filter((x) => x.id && x.label);
export const editableInputsToValueMap = (inputs = []) => normalizeEditableInputs(inputs).reduce((a, x) => (a[x.id] = x.value, a), {});
export const isFormulaDrivenItem = (item) => !!item && item.defaultFormulaType && item.defaultFormulaType !== 'manual' && Array.isArray(item.editableInputs) && item.editableInputs.length > 0;

const lex = (source) => {
  const tokens = []; let i = 0;
  while (i < source.length) {
    if (/\s/.test(source[i])) { i++; continue; }
    const m = source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|^[A-Za-z_][A-Za-z0-9_]*|^[()+\-*/]/i);
    if (!m) throw Error(`Unsupported character or operation near "${source.slice(i, i + 8)}".`);
    tokens.push(m[0]); i += m[0].length;
  }
  return tokens;
};
const parseArithmetic = (tokens, values) => {
  let i = 0;
  const primary = () => {
    const t = tokens[i++];
    if (t === '+' || t === '-') { const n = primary(); return t === '-' ? -n : n; }
    if (t === '(') { const n = expr(); if (tokens[i++] !== ')') throw Error('Missing closing parenthesis.'); return n; }
    if (t === undefined) throw Error('Formula ends unexpectedly.');
    if (/^(?:\d|\.)/.test(t)) return Number(t);
    if (!Object.hasOwn(values, t)) throw Error(`Missing formula input "${t}".`);
    const n = numberOrNull(values[t]);
    if (n === null) throw Error(`Input "${t}" must be a finite number.`);
    return n;
  };
  const term = () => { let n = primary(); while (tokens[i] === '*' || tokens[i] === '/') { const op = tokens[i++], b = primary(); if (op === '/' && b === 0) throw Error('Division by zero.'); n = op === '*' ? n * b : n / b; } return n; };
  const expr = () => { let n = term(); while (tokens[i] === '+' || tokens[i] === '-') { const op = tokens[i++], b = term(); n = op === '+' ? n + b : n - b; } return n; };
  const result = expr(); if (i !== tokens.length) throw Error(`Unexpected token "${tokens[i]}".`); return result;
};
export const validateFormulaExpression = (expression, inputMap = {}, { allowNegative = true } = {}) => {
  const source = String(expression || '').trim();
  if (!source) return { valid: false, value: null, error: 'Formula expression is empty.' };
  try {
    const tokens = lex(source); const names = tokens.filter((t) => SAFE_IDENTIFIER_PATTERN.test(t));
    for (const name of names) if (!Object.hasOwn(inputMap, name)) throw Error(`Missing formula input "${name}".`);
    const value = parseArithmetic(tokens, inputMap);
    if (!Number.isFinite(value)) throw Error('Formula result is not finite.');
    if (!allowNegative && value < 0) throw Error('Formula result cannot be negative.');
    return { valid: true, value, error: '' };
  } catch (e) { return { valid: false, value: null, error: e.message || 'Invalid formula expression.' }; }
};
export const evaluateFormulaExpression = (expression, inputMap = {}) => {
  const result = validateFormulaExpression(expression, inputMap); return result.valid ? result.value : null;
};
export const getUnresolvedFormulaVariables = (expression, inputMap = {}) => {
  try { return [...new Set(lex(String(expression || '')).filter((t) => SAFE_IDENTIFIER_PATTERN.test(t) && !Object.hasOwn(inputMap, t)))]; } catch { return []; }
};
export const validateFormulaInputs = (inputs = [], { allowNegative = false } = {}) => {
  for (const input of normalizeEditableInputs(inputs)) {
    if (input.type === 'text') continue;
    const value = numberOrNull(input.value);
    if (value === null) return { valid: false, error: `${input.label} must be a number.` };
    if (!allowNegative && value < 0) return { valid: false, error: `${input.label} cannot be negative.` };
  }
  return { valid: true, error: '' };
};
export const validateBoqFormulaItem = (item) => {
  if (!isFormulaDrivenItem(item)) return { valid: true, error: '' };
  const ids = normalizeEditableInputs(item.editableInputs).map((x) => x.id);
  if (new Set(ids).size !== ids.length) return { valid: false, error: 'Formula inputs contain duplicate IDs.' };
  if (item.defaultFormulaType === 'expression') {
    const inputs = validateFormulaInputs(item.editableInputs);
    if (!inputs.valid) return inputs;
    return validateFormulaExpression(item.formulaExpression || item.formulaText, editableInputsToValueMap(item.editableInputs), { allowNegative: false });
  }
  if (item.defaultFormulaType === 'input-sum') return validateFormulaInputs(item.editableInputs);
  return { valid: false, error: `Unsupported formula type "${item.defaultFormulaType}".` };
};
export const evaluateBoqFormulaRate = (item) => {
  if (!isFormulaDrivenItem(item)) return null;
  const validation = validateFormulaInputs(item.editableInputs);
  if (!validation.valid) return null;
  const values = editableInputsToValueMap(item.editableInputs);
  if (item.defaultFormulaType === 'expression') return evaluateFormulaExpression(item.formulaExpression || item.formulaText, values);
  if (item.defaultFormulaType === 'input-sum') { const result = Object.values(values).reduce((s, v) => s + (numberOrNull(v) ?? NaN), 0); return Number.isFinite(result) ? result : null; }
  return null;
};
export const getFormulaDisplayText = (item) => String(item?.formulaText || item?.formulaExpression || '').trim();
const buildWorkedExampleFromInputs = (item, inputs = []) => {
  const normalized = normalizeEditableInputs(inputs); if (!normalized.length) return '';
  const values = editableInputsToValueMap(normalized);
  const result = item?.defaultFormulaType === 'expression' ? evaluateFormulaExpression(item.formulaExpression || item.formulaText, values) : normalized.reduce((s, x) => s + (numberOrNull(x.value) ?? 0), 0);
  if (result === null) return `Example unavailable: ${validateBoqFormulaItem({ ...item, editableInputs: normalized }).error}`;
  return `Example: ${normalized.map((x) => `${x.label} ${formatFormulaValue(x.value)}${x.unit ? ` ${x.unit}` : ''}`).join(' + ')} = N${formatFormulaValue(result)}`;
};
export const buildWorkedExampleText = (item) => buildWorkedExampleFromInputs(item, item?.exampleInputs?.length ? item.exampleInputs : item?.editableInputs);
export const getWorkedExamplePreview = (item, { preferEditableInputs = false } = {}) => (
  !preferEditableInputs && item?.workedExample
    ? item.workedExample
    : buildWorkedExampleFromInputs(item, preferEditableInputs ? item?.editableInputs : (item?.exampleInputs?.length ? item.exampleInputs : item?.editableInputs))
);
