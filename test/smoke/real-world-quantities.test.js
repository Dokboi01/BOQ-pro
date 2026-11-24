import { describe, it, expect } from 'vitest';
import { computeTakeoffQuantity } from '../../src/utils/takeoff.js';

// Representative, explicitly dimensioned takeoffs. These validate the
// application's geometric quantity engine against hand calculations; they do
// not certify project specifications, bulking, compaction, or deductions.
const fixtures = [
  { project: 'Building', item: 'Foundation excavation', template: 'rectangular-volume', params: { length: 20, width: .6, depth: 1.2 }, expected: 14.4, unit: 'm³', calculation: '20 × 0.6 × 1.2' },
  { project: 'Building', item: 'Strip foundation concrete', template: 'rectangular-volume', params: { length: 20, width: .6, depth: .25 }, expected: 3, unit: 'm³', calculation: '20 × 0.6 × 0.25' },
  { project: 'Building', item: 'Hardcore filling', template: 'rectangular-volume', params: { length: 12, width: 10, depth: .15 }, expected: 18, unit: 'm³', calculation: '12 × 10 × 0.15' },
  { project: 'Building', item: 'Blinding concrete', template: 'rectangular-volume', params: { length: 20, width: .6, depth: .05 }, expected: .6, unit: 'm³', calculation: '20 × 0.6 × 0.05' },
  { project: 'Building', item: 'Reinforced concrete columns', template: 'rectangular-volume', params: { length: .3, width: .3, depth: 3, sections: 4 }, expected: 1.08, unit: 'm³', calculation: '0.3 × 0.3 × 3 × 4' },
  { project: 'Building', item: 'Blockwork wall', template: 'wall-area', params: { length: 30, height: 3 }, expected: 90, unit: 'm²', calculation: '30 × 3 (gross area; openings excluded)' },
  { project: 'Building', item: 'Roof covering', template: 'surface-strip', params: { length: 15, width: 10 }, expected: 150, unit: 'm²', calculation: '15 × 10 (developed roof area supplied)' },
  { project: 'Building', item: 'Floor finish', template: 'surface-strip', params: { length: 12, width: 10 }, expected: 120, unit: 'm²', calculation: '12 × 10' },
  { project: 'Road', item: 'Site clearance', template: 'surface-strip', params: { length: 500, width: 12 }, expected: 6000, unit: 'm²', calculation: '500 × 12' },
  { project: 'Road', item: 'Earthworks cut', template: 'trapezoidal-volume', params: { length: 500, topWidth: 12, bottomWidth: 12, depth: .45 }, expected: 2700, unit: 'm³', calculation: '500 × ((12 + 12) / 2) × 0.45' },
  { project: 'Road', item: 'Subgrade preparation', template: 'surface-strip', params: { length: 500, width: 12 }, expected: 6000, unit: 'm²', calculation: '500 × 12' },
  { project: 'Road', item: 'Sub-base layer', template: 'rectangular-volume', params: { length: 500, width: 12, depth: .2 }, expected: 1200, unit: 'm³', calculation: '500 × 12 × 0.20' },
  { project: 'Road', item: 'Base course', template: 'rectangular-volume', params: { length: 500, width: 12, depth: .15 }, expected: 900, unit: 'm³', calculation: '500 × 12 × 0.15' },
  { project: 'Road', item: 'Flexible pavement surface', template: 'surface-strip', params: { length: 500, width: 7 }, expected: 3500, unit: 'm²', calculation: '500 × 7' },
  { project: 'Road', item: 'Rigid pavement concrete', template: 'rectangular-volume', params: { length: 500, width: 7, depth: .25 }, expected: 875, unit: 'm³', calculation: '500 × 7 × 0.25' },
  { project: 'Road', item: 'Roadside drainage channels (both sides)', template: 'rectangular-volume', params: { length: 500, width: .6, depth: .6, sections: 2 }, expected: 360, unit: 'm³', calculation: '500 × 0.6 × 0.6 × 2' },
  { project: 'Road', item: 'Guardrail', template: 'linear-run', params: { length: 500 }, expected: 500, unit: 'm', calculation: '500' },
  { project: 'Road', item: 'Road signs', template: 'count-units', params: { count: 40 }, expected: 40, unit: 'No.', calculation: '40 signs' },
];

describe('representative Building and Road quantity takeoffs', () => {
  it.each(fixtures)('$project: $item = $expected $unit ($calculation)', ({ template, params, expected }) => {
    expect(computeTakeoffQuantity(template, params)).toBeCloseTo(expected, 8);
  });
});
