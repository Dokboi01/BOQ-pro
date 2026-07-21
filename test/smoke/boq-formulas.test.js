import { describe, it, expect } from 'vitest';
import {
  normalizeEditableInputs,
  editableInputsToValueMap,
  isFormulaDrivenItem,
  evaluateFormulaExpression,
  getUnresolvedFormulaVariables,
  evaluateBoqFormulaRate,
  buildWorkedExampleText,
  getWorkedExamplePreview,
} from '../../src/utils/boqFormulas.js';

describe('BOQ formula engine', () => {
  describe('normalizeEditableInputs', () => {
    it('drops inputs missing an id (label falls back to id when blank)', () => {
      const inputs = normalizeEditableInputs([
        { id: 'width', label: 'Width', value: 5 },
        { id: '', label: 'No id', value: 1 },
        { id: 'no-label', label: '', value: 1 },
      ]);
      expect(inputs.map((input) => input.id)).toEqual(['width', 'no-label']);
      expect(inputs.find((input) => input.id === 'no-label').label).toBe('no-label');
    });

    it('coerces numeric inputs and clamps invalid values to 0', () => {
      const [input] = normalizeEditableInputs([
        { id: 'qty', label: 'Qty', value: 'not-a-number' },
      ]);
      expect(input.value).toBe(0);
    });

    it('preserves text inputs as strings', () => {
      const [input] = normalizeEditableInputs([
        { id: 'note', label: 'Note', type: 'text', value: 'hello' },
      ]);
      expect(input.type).toBe('text');
      expect(input.value).toBe('hello');
    });
  });

  describe('editableInputsToValueMap', () => {
    it('builds an id -> value map', () => {
      const map = editableInputsToValueMap([
        { id: 'length', label: 'Length', value: 4 },
        { id: 'width', label: 'Width', value: 3 },
      ]);
      expect(map).toEqual({ length: 4, width: 3 });
    });
  });

  describe('isFormulaDrivenItem', () => {
    it('requires a non-manual formula type and at least one editable input', () => {
      expect(isFormulaDrivenItem({
        defaultFormulaType: 'expression',
        editableInputs: [{ id: 'a', label: 'A', value: 1 }],
      })).toBe(true);

      expect(isFormulaDrivenItem({
        defaultFormulaType: 'manual',
        editableInputs: [{ id: 'a', label: 'A', value: 1 }],
      })).toBe(false);

      expect(isFormulaDrivenItem({
        defaultFormulaType: 'expression',
        editableInputs: [],
      })).toBe(false);

      expect(isFormulaDrivenItem(null)).toBe(false);
    });
  });

  describe('evaluateFormulaExpression', () => {
    it('evaluates arithmetic over the provided variables', () => {
      expect(evaluateFormulaExpression('length * width', { length: 4, width: 3 })).toBe(12);
      expect(evaluateFormulaExpression('(a + b) / 2', { a: 10, b: 20 })).toBe(15);
    });

    it('returns 0 for an empty or blank expression', () => {
      expect(evaluateFormulaExpression('', { a: 1 })).toBe(0);
      expect(evaluateFormulaExpression('   ', { a: 1 })).toBe(0);
    });

    it('treats unknown variables as 0 rather than throwing', () => {
      expect(evaluateFormulaExpression('length * width', { length: 5 })).toBe(0);
    });

    it('rejects expressions containing characters outside the safe arithmetic charset', () => {
      // Anything that isn't digits/operators/identifiers is rejected outright by the
      // regex guard before it ever reaches `new Function`, regardless of whether the
      // JS engine would consider it valid syntax.
      expect(evaluateFormulaExpression('console.log("pwned")', {})).toBe(0);
      expect(evaluateFormulaExpression('require("fs")', {})).toBe(0);
      expect(evaluateFormulaExpression('a; while(true){}', {})).toBe(0);
      expect(evaluateFormulaExpression('[1,2,3]', {})).toBe(0);
      expect(evaluateFormulaExpression('${1+1}', {})).toBe(0);
    });

    it('rejects function calls and property access, even without quotes', () => {
      // The charset alone allows `.` (for decimals) and `(` (for grouping), which
      // together would let a bare, quote-free call like `console.log(a)` slip past
      // the charset check and actually execute. This must be blocked explicitly.
      expect(evaluateFormulaExpression('console.log(a)', { a: 1 })).toBe(0);
      expect(evaluateFormulaExpression('Math.random()', {})).toBe(0);
      expect(evaluateFormulaExpression('a.constructor(b)', { a: 1, b: 2 })).toBe(0);
    });

    it('still evaluates decimal literals correctly', () => {
      expect(evaluateFormulaExpression('1.5 * a', { a: 2 })).toBe(3);
      expect(evaluateFormulaExpression('0.15 * area', { area: 100 })).toBeCloseTo(15);
    });

    it('does not let a malicious variable name leak outside the sandboxed evaluator', () => {
      // Variable names are constrained to safe identifiers, so a poisoned key in
      // inputMap is simply dropped rather than being injected as a function parameter.
      const result = evaluateFormulaExpression('a', {
        'a); return process': 1,
        a: 7,
      });
      expect(result).toBe(7);
    });

    it('returns 0 instead of throwing on a runtime error (e.g. division producing NaN paths)', () => {
      expect(evaluateFormulaExpression('a / b / (', { a: 1, b: 2 })).toBe(0);
    });
  });

  describe('getUnresolvedFormulaVariables', () => {
    it('returns an empty list when every referenced variable has an input', () => {
      expect(getUnresolvedFormulaVariables('length * width', { length: 4, width: 3 })).toEqual([]);
    });

    it('flags a typo\'d variable name so a silent 0 rate is not shipped unexplained', () => {
      // This is the exact failure mode evaluateFormulaExpression can't catch on its
      // own: `lenght` silently evaluates as 0 instead of erroring.
      expect(getUnresolvedFormulaVariables('lenght * width', { length: 4, width: 3 }))
        .toEqual(['lenght']);
      expect(evaluateFormulaExpression('lenght * width', { length: 4, width: 3 })).toBe(0);
    });

    it('lists each unresolved identifier once, in order of first appearance', () => {
      expect(getUnresolvedFormulaVariables('a + b + a', { b: 1 })).toEqual(['a']);
      expect(getUnresolvedFormulaVariables('x * y', {})).toEqual(['x', 'y']);
    });

    it('returns an empty list for blank or unsafe expressions (nothing meaningful to flag)', () => {
      expect(getUnresolvedFormulaVariables('', { a: 1 })).toEqual([]);
      // Rejected by the function-call guard, same as evaluateFormulaExpression — an
      // unsafe expression has no well-defined "variables", so there's nothing to flag.
      expect(getUnresolvedFormulaVariables('console.log(a)', { a: 1 })).toEqual([]);
    });
  });

  describe('evaluateBoqFormulaRate', () => {
    it('returns null for non-formula-driven items', () => {
      expect(evaluateBoqFormulaRate({ defaultFormulaType: 'manual' })).toBeNull();
    });

    it('evaluates an expression-type formula from editable inputs', () => {
      const item = {
        defaultFormulaType: 'expression',
        formulaExpression: 'length * width * depth',
        editableInputs: [
          { id: 'length', label: 'Length', value: 2 },
          { id: 'width', label: 'Width', value: 3 },
          { id: 'depth', label: 'Depth', value: 4 },
        ],
      };
      expect(evaluateBoqFormulaRate(item)).toBe(24);
    });

    it('sums all input values for an input-sum formula', () => {
      const item = {
        defaultFormulaType: 'input-sum',
        editableInputs: [
          { id: 'a', label: 'A', value: 10 },
          { id: 'b', label: 'B', value: 15 },
        ],
      };
      expect(evaluateBoqFormulaRate(item)).toBe(25);
    });
  });

  describe('getWorkedExamplePreview', () => {
    it('prefers an explicit worked example over generated text', () => {
      const item = { workedExample: 'Explicit example text' };
      expect(getWorkedExamplePreview(item)).toBe('Explicit example text');
    });
  });

  describe('buildWorkedExampleText', () => {
    it('generates worked example text from example inputs when no explicit text is set', () => {
      const item = {
        defaultFormulaType: 'input-sum',
        exampleInputs: [
          { id: 'a', label: 'Cement bags', unit: 'bags', value: 6 },
        ],
      };
      const text = buildWorkedExampleText(item);
      expect(text).toContain('Cement bags');
      expect(text).toContain('6');
    });
  });
});
