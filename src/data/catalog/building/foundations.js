import { formulaRateItem, manualItem, buildRateInputs } from './helpers';

export const BUILDING_FOUNDATIONS_ITEMS = [
  formulaRateItem({ name: 'Blinding concrete', description: '50mm blinding concrete below foundations.', unit: 'm³', inputs: buildRateInputs({ materials: 42000, labour: 9500, plant: 6000, transport: 3500, overhead: 4000 }) }),
  formulaRateItem({ name: 'Reinforcement to footings', description: 'Cut, bend, and fix reinforcement to foundations.', unit: 'kg', inputs: buildRateInputs({ materials: 1020, labour: 180, plant: 40, transport: 30, overhead: 35 }) }),
  manualItem({ name: 'Formwork to footing sides', description: 'Provide and strike formwork to footing edges and bases.', unit: 'm²', benchmarkRate: 14800 }),
  formulaRateItem({ name: 'Concrete to footings', description: 'Grade 25 concrete to strip and pad footings.', unit: 'm³', inputs: buildRateInputs({ materials: 78000, labour: 12500, plant: 9800, transport: 4200, overhead: 5500 }) }),
  manualItem({ name: 'Damp proof course', description: 'Provide and lay damp proof course membrane at wall base.', unit: 'm', benchmarkRate: 2200 }),
];
