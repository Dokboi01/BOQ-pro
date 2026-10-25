// Quantra - Building Storey Classification & Relevant Bill Mapping
// Provides storey configurations, relevant bill selection, and item recommendations

export const BUILDING_STOREY_PRESETS = [
  {
    stories: 1,
    id: '1-storey',
    name: '1 Storey (Bungalow)',
    label: '1 Storey',
    shortLabel: '1 Storey',
    classification: 'Bungalow / Single Storey',
    icon: '🏡',
    description: 'Ground floor only. Strip/pad footings, expansive roof envelope, no suspended slabs or upper stair flights.',
    badge: 'Bungalow',
    structuralType: 'Load-bearing Masonry / Ground Frame',
    defaultExcludedSectionIds: ['structural_frame', 'vertical_transportation'],
    sectionRelevance: {
      roofing: 'Primary roof envelope (largest footprint per floor area)',
      substructure_foundations: 'Standard strip / pad footing for ground level',
      concrete_works: 'Oversite slab, blinding & ground lintels',
      structural_frame: 'Optional (typically load-bearing masonry with tie beams)',
      formwork: 'Ground level kicker, beam & lintel shuttering',
      vertical_transportation: 'Not applicable for single-storey',
      mechanical_services: 'Standard single-level ventilation & AC split units',
    },
    keyItemsSummary: 'Ground slab, strip footings, perimeter sandcrete blockwork, wide-span roof trusses & longspan sheets.',
  },
  {
    stories: 2,
    id: '2-storey',
    name: '2 Storey (Duplex)',
    label: '2 Storey',
    shortLabel: '2 Storeys',
    classification: 'Duplex / 2-Storey Residential or Office',
    icon: '🏠',
    description: 'Ground + 1 suspended floor. Reinforced concrete frame, first floor suspended slab, internal staircase, upper roof.',
    badge: 'Duplex / 2-Storey',
    structuralType: 'Reinforced Concrete Frame',
    defaultExcludedSectionIds: ['vertical_transportation'],
    sectionRelevance: {
      structural_frame: 'First floor suspended slab, columns, perimeter beams & staircase',
      formwork: 'Slab soffit formwork, props & staircase waist shuttering',
      reinforcement_works: 'High-yield rebar for suspended beams, slabs & column links',
      roofing: 'Upper floor roof structure and rainwater downpipes',
      vertical_transportation: 'Not typical for 2-storey (stairs standard)',
      water_supply_storage: 'Overhead tank & gravity/booster feed for first floor',
    },
    keyItemsSummary: 'Ground & 1st floor columns, suspended floor slab, RC staircase, beam cages, upper blockwork.',
  },
  {
    stories: 3,
    id: '3-storey',
    name: '3 Storey Building',
    label: '3 Storeys',
    shortLabel: '3 Storeys',
    classification: 'Medium-Rise Multi-Unit / Commercial',
    icon: '🏢',
    description: 'Ground + 2 suspended floors. Continuous column frame, multi-flight stairs, enhanced booster water supply.',
    badge: '3-Storey',
    structuralType: 'Multi-Floor R.C. Frame',
    defaultExcludedSectionIds: ['vertical_transportation'],
    sectionRelevance: {
      structural_frame: 'Continuous multi-level columns, beams, 2 suspended slabs & stairs',
      substructure_foundations: 'Pad footings or raft foundation for increased vertical loads',
      water_supply_storage: 'Dedicated booster pump set required for upper floor pressure',
      mechanical_services: 'Enhanced ventilation, fire hose reels & dry riser provision',
      formwork: 'Multi-tier staging props & suspended soffit shuttering',
    },
    keyItemsSummary: '3-tier column frame, multiple suspended slabs, multi-flight stairs, booster pumps, fire hose reels.',
  },
  {
    stories: 4,
    id: '4-storey',
    name: '4 Storey Building',
    label: '4 Storeys',
    shortLabel: '4 Storeys',
    classification: 'Medium-Rise Apartment / Office Complex',
    icon: '🏬',
    description: 'Ground + 3 suspended floors. Substantial structural frame, lift shaft core provision, dedicated fire suppression.',
    badge: '4-Storey',
    structuralType: 'Heavy R.C. Frame with Lift Core',
    defaultExcludedSectionIds: [],
    sectionRelevance: {
      structural_frame: 'Heavy frame with reinforced lift shaft core & shear walls',
      vertical_transportation: 'Passenger lift recommended for accessibility (4+ floors)',
      mechanical_services: 'Fire sprinkler network & pressurized wet risers',
      substructure_foundations: 'Raft foundation or heavy ground beams recommended',
      water_supply_storage: 'Multi-stage booster pumps & high-capacity overhead tanks',
    },
    keyItemsSummary: 'Lift core walls, passenger lift, 3 suspended slabs, fire sprinkler risers, heavy raft/pad foundations.',
  },
  {
    stories: 5,
    id: '5-plus-storey',
    name: '5+ Storey (High-Rise)',
    label: '5+ Storeys',
    shortLabel: '5+ Storeys',
    classification: 'High-Rise Tower / Multi-Storey Complex',
    icon: '🏙️',
    description: 'Multi-level tower. Concrete shear walls, passenger lifts, wet risers, fire pumps, tower crane placement.',
    badge: 'High-Rise / Multi-Storey',
    structuralType: 'High-Rise Shear Core Frame',
    defaultExcludedSectionIds: [],
    sectionRelevance: {
      vertical_transportation: 'Essential: High-speed passenger & service lifts',
      structural_frame: 'Grade 35/40 concrete, lift core shear walls, crane lifting',
      mechanical_services: 'Central HVAC, fire pump station & automatic sprinklers',
      substructure_foundations: 'Piled foundation / thick raft foundation',
      electrical_installation: 'Dedicated transformer substation, heavy rising mains & busbars',
    },
    keyItemsSummary: 'High-speed lifts, concrete shear core, wet riser pumps, tower crane hire, piled/raft foundation.',
  },
];

export const getBuildingStoreyConfig = (storiesInput) => {
  const num = Math.max(1, parseInt(storiesInput, 10) || 1);
  if (num === 1) return BUILDING_STOREY_PRESETS[0];
  if (num === 2) return BUILDING_STOREY_PRESETS[1];
  if (num === 3) return BUILDING_STOREY_PRESETS[2];
  if (num === 4) return BUILDING_STOREY_PRESETS[3];

  const base = BUILDING_STOREY_PRESETS[4];
  return {
    ...base,
    stories: num,
    name: `${num} Storey High-Rise`,
    label: `${num} Storeys`,
    shortLabel: `${num} Storeys`,
    classification: `${num}-Storey High-Rise Tower`,
    description: `${num}-storey tower structure with reinforced concrete shear core, passenger elevators, and multi-tier building services.`,
  };
};

export const getRelevantBuildingSectionIds = (storiesInput, allSections = []) => {
  const config = getBuildingStoreyConfig(storiesInput);
  const excludedSet = new Set(config.defaultExcludedSectionIds || []);
  return allSections
    .filter((sec) => !excludedSet.has(sec.id))
    .map((sec) => sec.id);
};

export const getStoreySectionBadge = (sectionId, storiesInput) => {
  const config = getBuildingStoreyConfig(storiesInput);
  return config.sectionRelevance?.[sectionId] || null;
};

// Determines whether a specific catalog item has extra relevance to the selected storey count
export const isItemStoreyRecommended = (item, storiesInput) => {
  if (!item) return false;
  const num = Math.max(1, parseInt(storiesInput, 10) || 1);
  const text = `${item.name || ''} ${item.description || ''} ${item.category || ''} ${item.subcategory || ''}`.toLowerCase();

  if (num === 1) {
    // 1-Storey (Bungalow) key items
    if (
      text.includes('strip footing')
      || text.includes('pad footing')
      || text.includes('oversite slab')
      || text.includes('blinding')
      || text.includes('truss')
      || text.includes('roof')
      || text.includes('longspan')
      || text.includes('hardcore')
      || text.includes('dpc')
      || text.includes('damp proof')
      || text.includes('septic tank')
      || text.includes('soakaway')
      || text.includes('225mm block')
    ) {
      return true;
    }
    // Items that DO NOT belong in a bungalow:
    if (
      text.includes('lift shaft')
      || text.includes('passenger lift')
      || text.includes('crane lifting')
      || text.includes('suspended slab')
    ) {
      return false;
    }
  } else if (num === 2) {
    // 2-Storey (Duplex) key items
    if (
      text.includes('suspended')
      || text.includes('staircase')
      || text.includes('column')
      || text.includes('beam')
      || text.includes('first floor')
      || text.includes('soffit')
      || text.includes('formwork to suspended')
      || text.includes('rebar')
      || text.includes('reinforcement')
    ) {
      return true;
    }
    if (text.includes('passenger lift') || text.includes('crane lifting')) {
      return false;
    }
  } else if (num === 3) {
    // 3-Storey key items
    if (
      text.includes('column')
      || text.includes('beam')
      || text.includes('suspended')
      || text.includes('staircase')
      || text.includes('booster pump')
      || text.includes('fire hose')
      || text.includes('raft')
      || text.includes('grade 30')
    ) {
      return true;
    }
  } else {
    // 4+ or 5+ High-Rise key items
    if (
      text.includes('lift')
      || text.includes('elevator')
      || text.includes('shear wall')
      || text.includes('crane')
      || text.includes('fire sprinkler')
      || text.includes('wet riser')
      || text.includes('fire pump')
      || text.includes('raft')
      || text.includes('pile')
      || text.includes('grade 35')
      || text.includes('grade 40')
    ) {
      return true;
    }
  }

  return Boolean(item.isRecommended);
};

export const getItemStoreyHint = (item, storiesInput) => {
  if (!item) return '';
  const num = Math.max(1, parseInt(storiesInput, 10) || 1);
  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();

  if (num === 1) {
    if (text.includes('roof') || text.includes('truss')) return 'Primary roof covering for single-level footprint';
    if (text.includes('strip') || text.includes('footing')) return 'Standard foundation for 1-storey bungalow';
    if (text.includes('oversite') || text.includes('blinding')) return 'Ground floor oversite concrete';
    if (text.includes('suspended') || text.includes('lift')) return 'Upper-floor item (typically omitted for bungalow)';
  } else if (num === 2) {
    if (text.includes('suspended')) return 'Key suspended first floor slab for 2-storey duplex';
    if (text.includes('staircase')) return 'Vertical access between ground and 1st floor';
    if (text.includes('column') || text.includes('beam')) return 'Structural frame carrying first floor and roof';
  } else if (num >= 3) {
    if (text.includes('lift') || text.includes('elevator')) return `Vertical transportation for ${num}-storey building`;
    if (text.includes('booster') || text.includes('pump')) return `Water pressure booster required for ${num} floors`;
    if (text.includes('fire') || text.includes('sprinkler')) return `Life safety & fire suppression network for ${num} floors`;
    if (text.includes('column') || text.includes('shear')) return `Continuous structural load path across ${num} floors`;
  }

  return '';
};
