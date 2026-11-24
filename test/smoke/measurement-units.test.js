import { describe, it, expect } from 'vitest';
import { convertMeasurement } from '../../src/utils/units.js';
import { getUnitScaleFactor, normalizeUnit } from '../../src/utils/pricing.js';

describe('measurement unit validation', () => {
  it('normalizes the construction units used in BOQs', () => {
    expect(normalizeUnit('m²')).toBe('m2');
    expect(normalizeUnit('No.')).toBe('no');
    expect(normalizeUnit('wat')).toBe('');
  });
  it.each([['km', 'm', 1000], ['cm', 'm', .01], ['mm', 'm', .001]])('converts length %s to %s', (from, to, factor) => {
    expect(convertMeasurement(1, from, to)).toEqual({ valid: true, value: factor });
  });
  it('converts area and volume by matching dimensions', () => {
    expect(convertMeasurement(1, 'm²', 'm2')).toEqual({ valid: true, value: 1 });
    expect(convertMeasurement(1000, 'litre', 'm3')).toEqual({ valid: true, value: 1 });
  });
  it('converts mass and time', () => {
    expect(convertMeasurement(1, 'tonne', 'kg').value).toBe(1000);
    expect(convertMeasurement(1, 'week', 'day').value).toBe(7);
    expect(getUnitScaleFactor('', 'general', 'm3', 'litre')).toBe(.001);
  });
  it('rejects incompatible and unknown units', () => {
    expect(convertMeasurement(1, 'm', 'kg').valid).toBe(false);
    expect(convertMeasurement(1, 'mystery', 'm').valid).toBe(false);
    expect(getUnitScaleFactor('', 'general', 'm', 'kg')).toBeNull();
  });
});
