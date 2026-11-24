import { describe, it, expect } from 'vitest';
import { validateCatalogue } from '../../src/utils/catalogValidation.js';

describe('catalogue validation', () => {
  it('reports duplicate IDs and codes, missing units, formulas, and structure mismatch', () => {
    const result = validateCatalogue({ building: { sections: [{ id: 'earth', items: [
      { id: 'same', code: 'A', name: 'First', unit: 'm', billSection: 'earth', selectedRateSource: 'manual' },
      { id: 'same', code: 'A', name: 'Second', unit: '', defaultFormulaType: 'expression', editableInputs: [{ id: 'x', label: 'X', value: 1 }], formulaExpression: 'x + missing', structureType: 'road' },
    ] }] } });
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain('duplicate-id');
    expect(codes).toContain('duplicate-code');
    expect(codes).toContain('invalid-unit');
    expect(codes).toContain('invalid-formula');
    expect(codes).toContain('structure-mismatch');
  });
});
