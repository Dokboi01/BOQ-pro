import { BOQ_STRUCTURE_LIBRARY } from '../data/boqCatalog';
import { isSupportedMeasurementUnit } from './units';
import { validateBoqFormulaItem } from './boqFormulas';

const editDistance = (left, right) => {
  let row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    const next = [i];
    for (let j = 1; j <= right.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
    row = next;
  }
  return row[right.length];
};

export const validateCatalogue = (library = BOQ_STRUCTURE_LIBRARY) => {
  const issues = []; const ids = new Map(); const codes = new Map();
  const add = (severity, code, message, item) => issues.push({ severity, code, message, itemId: item?.id || '', itemCode: item?.code || '' });
  const structures = Object.entries(library || {});
  for (const [structureType, structure] of structures) {
    if (!structure?.sections || !Array.isArray(structure.sections)) { add('error', 'invalid-structure', `Invalid structure type or sections: ${structureType}.`); continue; }
    const knownSections = new Set(structure.sections.flatMap((section) => [section.id, section.title].filter(Boolean)));
    for (const section of structure.sections) {
      const names = new Map();
      for (const item of section.availableItems || section.items || []) {
      if (!item.id && !item.code) add('error', 'missing-id', 'Catalogue item has neither an ID nor an item code.', item);
      if (!item.code) add('warning', 'missing-code', 'Catalogue item has no item code.', item);
      if (item.id) { if (ids.has(item.id)) add('error', 'duplicate-id', `Duplicate item ID "${item.id}".`, item); else ids.set(item.id, item); }
      if (item.code) { if (codes.has(item.code)) add('error', 'duplicate-code', `Duplicate item code "${item.code}".`, item); else codes.set(item.code, item); }
      if (!String(item.description || item.name || '').trim()) add('error', 'missing-description', 'Item has no description.', item);
      if (!isSupportedMeasurementUnit(item.unit)) {
        const severity = /\s+or\s+/i.test(String(item.unit || '')) ? 'warning' : 'error';
        add(severity, severity === 'warning' ? 'ambiguous-unit' : 'invalid-unit', `Unsupported, ambiguous, or missing measurement unit "${item.unit || ''}".`, item);
      }
      const expectedBillSection = section.title || section.id;
      if (!item.billSection && expectedBillSection) add('warning', 'missing-bill-section', 'Item has no bill section assignment.', item);
      else if (item.billSection && expectedBillSection && item.billSection !== expectedBillSection && item.billSection !== section.id) {
        const misplaced = knownSections.has(item.billSection);
        add(misplaced ? 'error' : 'warning', misplaced ? 'bill-section-mismatch' : 'bill-section-label-variant', `Item section "${item.billSection}" does not exactly match containing section "${expectedBillSection}".`, item);
      }
      if (item.structureType && item.structureType !== structureType) add('error', 'structure-mismatch', `Item structure ${item.structureType} does not match ${structureType}.`, item);
      if (item.defaultFormulaType && item.defaultFormulaType !== 'manual') {
        const valid = validateBoqFormulaItem(item); if (!valid.valid) add('error', 'invalid-formula', valid.error, item);
        if (!String(item.formulaText || item.formulaExpression || '').trim()) add('error', 'missing-formula-description', 'Formula item has no formula description.', item);
        if (!String(item.workedExample || '').trim() && !(Array.isArray(item.exampleInputs) && item.exampleInputs.length > 0)) add('warning', 'missing-worked-example', 'Formula item has no worked example or example inputs.', item);
      }
      if (!item.selectedRateSource && !item.rateSource) add('warning', 'missing-rate-source', 'Item has no explicit rate source.', item);
      const key = String(item.name || item.description || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (key) {
        const similar = [...names.entries()].find(([known]) => known === key || (Math.min(known.length, key.length) >= 8 && Math.abs(known.length - key.length) <= 2 && editDistance(known, key) <= 2));
        if (similar) add('warning', 'similar-name', `Possible duplicate or near-duplicate item name: "${similar[1]}".`, item);
        else names.set(key, item.name || item.description);
      }
      }
    }
  }
  return { valid: !issues.some((x) => x.severity === 'error'), issues, summary: { structures: structures.length, errors: issues.filter((x) => x.severity === 'error').length, warnings: issues.filter((x) => x.severity === 'warning').length } };
};
