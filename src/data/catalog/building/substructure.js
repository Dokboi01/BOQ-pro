import { formulaRateItem, manualItem, buildRateInputs } from './helpers';

export const BUILDING_SUBSTRUCTURE_ITEMS = [
  manualItem({ name: 'Foundation blockwork', description: '225mm sandcrete blockwork from footing to DPC level.', unit: 'm²', benchmarkRate: 19800 }),
  manualItem({ name: 'Hardcore filling', description: 'Hardcore filling in layers and machine compaction.', unit: 'm³', benchmarkRate: 15500 }),
  formulaRateItem({ name: 'Oversite concrete', description: 'Concrete oversite slab or ground beam blinding works.', unit: 'm³', inputs: buildRateInputs({ materials: 76000, labour: 11000, plant: 9000, transport: 3800, overhead: 5000 }) }),
  manualItem({ name: 'Backfilling around foundations', description: 'Backfill around substructure and compact in layers.', unit: 'm³', benchmarkRate: 4200 }),
  manualItem({ name: 'Termite treatment', description: 'Apply anti-termite treatment to hardcore and formation.', unit: 'm²', benchmarkRate: 1350 }),
];
