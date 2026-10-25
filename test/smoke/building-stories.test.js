import { describe, it, expect } from 'vitest';
import {
  BUILDING_STOREY_PRESETS,
  getBuildingStoreyConfig,
  getRelevantBuildingSectionIds,
  getStoreySectionBadge,
  isItemStoreyRecommended,
  getItemStoreyHint,
} from '../../src/data/buildingStories';
import {
  getStructureDefinition,
  STRUCTURE_TYPES,
} from '../../src/data/boqCatalog';

describe('Building Storey Specification & Relevant Bills Flow', () => {
  it('provides comprehensive presets for 1, 2, 3, 4, and 5+ storeys', () => {
    expect(BUILDING_STOREY_PRESETS).toHaveLength(5);
    expect(BUILDING_STOREY_PRESETS.map((p) => p.stories)).toEqual([1, 2, 3, 4, 5]);
  });

  it('correctly classifies 1-storey as Bungalow', () => {
    const config = getBuildingStoreyConfig(1);
    expect(config.badge).toBe('Bungalow');
    expect(config.classification).toContain('Bungalow');
    expect(config.defaultExcludedSectionIds).toContain('structural_frame');
    expect(config.defaultExcludedSectionIds).toContain('vertical_transportation');
  });

  it('correctly classifies 2-storey as Duplex', () => {
    const config = getBuildingStoreyConfig(2);
    expect(config.badge).toContain('Duplex');
    expect(config.defaultExcludedSectionIds).not.toContain('structural_frame');
    expect(config.defaultExcludedSectionIds).toContain('vertical_transportation');
  });

  it('correctly classifies 4-storey and 5+ storey as multi-storey / high-rise with vertical transportation', () => {
    const config4 = getBuildingStoreyConfig(4);
    expect(config4.badge).toBe('4-Storey');
    expect(config4.defaultExcludedSectionIds).toHaveLength(0);

    const config7 = getBuildingStoreyConfig(7);
    expect(config7.stories).toBe(7);
    expect(config7.classification).toContain('7-Storey High-Rise');
    expect(config7.defaultExcludedSectionIds).toHaveLength(0);
  });

  it('filters relevant building sections based on storey count', () => {
    const buildingDef = getStructureDefinition(STRUCTURE_TYPES.BUILDING);
    expect(buildingDef).toBeDefined();
    expect(buildingDef.sections.length).toBeGreaterThan(15);

    const bungalowSections = getRelevantBuildingSectionIds(1, buildingDef.sections);
    expect(bungalowSections).not.toContain('structural_frame');
    expect(bungalowSections).not.toContain('vertical_transportation');
    expect(bungalowSections).toContain('roofing');
    expect(bungalowSections).toContain('substructure_foundations');

    const duplexSections = getRelevantBuildingSectionIds(2, buildingDef.sections);
    expect(duplexSections).toContain('structural_frame');
    expect(duplexSections).not.toContain('vertical_transportation');

    const highRiseSections = getRelevantBuildingSectionIds(5, buildingDef.sections);
    expect(highRiseSections).toContain('structural_frame');
    expect(highRiseSections).toContain('vertical_transportation');
  });

  it('provides explanatory section badges for storey context', () => {
    const bungalowRoofBadge = getStoreySectionBadge('roofing', 1);
    expect(bungalowRoofBadge).toContain('Primary roof envelope');

    const duplexFrameBadge = getStoreySectionBadge('structural_frame', 2);
    expect(duplexFrameBadge).toContain('First floor suspended slab');

    const highRiseLiftBadge = getStoreySectionBadge('vertical_transportation', 5);
    expect(highRiseLiftBadge).toContain('Essential: High-speed passenger');
  });

  it('accurately identifies storey-recommended items in the picker', () => {
    const roofItem = { name: 'Timber roof trusses and purlins', description: 'Hardwood roof structure' };
    expect(isItemStoreyRecommended(roofItem, 1)).toBe(true);
    expect(getItemStoreyHint(roofItem, 1)).toContain('Primary roof covering');

    const suspendedSlabItem = { name: 'Suspended floor slab concrete Grade 30', description: 'Concrete to upper floor slab' };
    expect(isItemStoreyRecommended(suspendedSlabItem, 2)).toBe(true);
    expect(getItemStoreyHint(suspendedSlabItem, 2)).toContain('Key suspended first floor slab');

    const liftItem = { name: 'Passenger lift supply and installation', description: '8-passenger traction elevator' };
    expect(isItemStoreyRecommended(liftItem, 1)).toBe(false);
    expect(isItemStoreyRecommended(liftItem, 5)).toBe(true);
    expect(getItemStoreyHint(liftItem, 5)).toContain('Vertical transportation for 5-storey building');
  });

  it('includes vertical transportation section with realistic items in building catalog', () => {
    const buildingDef = getStructureDefinition(STRUCTURE_TYPES.BUILDING);
    const vertSec = buildingDef.sections.find((s) => s.id === 'vertical_transportation');
    expect(vertSec).toBeDefined();
    expect(vertSec.title).toContain('Vertical Transportation');
    expect(vertSec.availableItems.length).toBeGreaterThan(0);

    const passengerLift = vertSec.availableItems.find((i) => i.name.includes('Passenger lift'));
    expect(passengerLift).toBeDefined();
    expect(passengerLift.benchmarkRate).toBeGreaterThan(20000000);
  });
});
