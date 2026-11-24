const DEFINITIONS = {
  m: ['length', 1], mm: ['length', .001], cm: ['length', .01], km: ['length', 1000],
  m2: ['area', 1], m3: ['volume', 1], litre: ['volume', .001], kg: ['mass', 1], tonne: ['mass', 1000],
  'm3-km': ['volume-distance', 1], 'tonne-km': ['mass-distance', 1000], '%': ['ratio', .01],
  no: ['count', 1], item: ['count', 1], set: ['count', 1], pair: ['count', 1], test: ['count', 1], sum: ['lump-sum', 1], day: ['time', 1],
  week: ['time', 7], month: ['time', 30], hour: ['time', 1 / 24],
};
const ALIASES = { 'm²':'m2', sqm:'m2', 'm³':'m3', cum:'m3', 'm³-km':'m3-km', 'ton-km':'tonne-km', 'tons-km':'tonne-km', lm:'m', metre:'m', meter:'m', nr:'no', nos:'no', pcs:'no', pc:'no', each:'no', tons:'tonne', ton:'tonne', t:'tonne', l:'litre', liters:'litre', litres:'litre', hrs:'hour', hr:'hour', days:'day', wk:'week', weeks:'week', months:'month' };
export const normalizeMeasurementUnit = (unit = '') => {
  const key = String(unit).trim().toLowerCase().replace(/[.\s]+/g, '');
  const normalized = ALIASES[key] || key;
  return Object.hasOwn(DEFINITIONS, normalized) ? normalized : '';
};
export const isSupportedMeasurementUnit = (unit) => Boolean(normalizeMeasurementUnit(unit));
export const getMeasurementDimension = (unit) => DEFINITIONS[normalizeMeasurementUnit(unit)]?.[0] || null;
export const convertMeasurement = (value, from, to) => {
  const f = normalizeMeasurementUnit(from), t = normalizeMeasurementUnit(to);
  if (!Number.isFinite(Number(value))) return { valid: false, error: 'Quantity must be a finite number.' };
  if (!f || !t) return { valid: false, error: `Unsupported measurement unit: ${!f ? from : to}.` };
  if (DEFINITIONS[f][0] !== DEFINITIONS[t][0]) return { valid: false, error: `Cannot convert ${from} to ${to}: units have incompatible dimensions.` };
  return { valid: true, value: Number(value) * DEFINITIONS[f][1] / DEFINITIONS[t][1] };
};
