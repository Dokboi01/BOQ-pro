import { manualItem } from './helpers';

export const BUILDING_EARTHWORKS_ITEMS = [
  manualItem({ name: 'Excavate foundation trenches', description: 'Excavate trench and pad foundations not exceeding stated depth.', unit: 'm³', benchmarkRate: 4200 }),
  manualItem({ name: 'Excavate lift pits and sumps', description: 'Excavate lift pits, service pits, and isolated deeper pockets.', unit: 'm³', benchmarkRate: 5200 }),
  manualItem({ name: 'Imported laterite filling', description: 'Imported selected laterite filling, spread, water, and compact.', unit: 'm³', benchmarkRate: 10800 }),
  manualItem({ name: 'Sand filling and compaction', description: 'Sharp sand filling in layers with compaction to level.', unit: 'm³', benchmarkRate: 8600 }),
  manualItem({ name: 'Dispose surplus excavated material', description: 'Load, haul, and dispose surplus spoil to approved dump.', unit: 'm³', benchmarkRate: 2800 }),
];
