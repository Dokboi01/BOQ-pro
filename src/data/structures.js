// BOQ Pro - Enhanced Structure Types with Comprehensive Components
// Migrated from HTML version with full component details

export const STRUCTURE_CATEGORIES = {
    BUILDING: 'Building',
    ROAD: 'Road',
    BRIDGE: 'Bridge',
    DRAINAGE: 'Drainage',
    COASTAL: 'Coastal / Marine', // Changed from Coastal / Marine Structure to match request
    FOUNDATION: 'Foundation Works'
};

export const STRUCTURE_DATA = {
    [STRUCTURE_CATEGORIES.BUILDING]: {
        icon: '🏠',
        subtypes: {
            'Bungalow': {
                description: 'Single-story professional residential estimate',
                sections: [
                    { id: 'preliminaries', title: '1. PRELIMINARIES', items: [
                        { description: 'Mobilization and demobilization of plant and equipment', unit: 'Sum', qty: 1, rate: 250000 },
                        { description: 'Temporary site office and storage', unit: 'Sum', qty: 1, rate: 150000 },
                        { description: 'Signboard and safety precautions', unit: 'Sum', qty: 1, rate: 75000 }
                    ]},
                    { id: 'substructure', title: '2. SUBSTRUCTURE (Earthworks)', items: [
                        { description: 'Clear site of all bushes, shrubs, and remove top soil', unit: 'm²', qty: 150, rate: 500 },
                        { description: 'Excavation to foundation trenches not exceeding 1.5m deep', unit: 'm³', qty: 45, rate: 2200 },
                        { description: 'Cart away surplus excavated material from site', unit: 'm³', qty: 20, rate: 1500 },
                        { description: 'Laterite filling in layers of 150mm and compacting', unit: 'm³', qty: 60, rate: 8500 },
                        { description: 'Hardcore filling of broken stones or blocks', unit: 'm³', qty: 30, rate: 12000 },
                        { description: 'Anti-termite treatment (Aldrex or similar)', unit: 'm²', qty: 120, rate: 850 }
                    ]},
                    { id: 'concrete_works', title: '3. CONCRETE WORKS', items: [
                        { description: 'Mass concrete (1:4:8) in blinding to foundation', unit: 'm³', qty: 4.5, rate: 65000 },
                        { description: 'Reinforced concrete (1:2:4) in strip foundation footing', unit: 'm³', qty: 12.8, rate: 95000 },
                        { description: 'Reinforced concrete (1:2:4) in floor slab (150mm thick)', unit: 'm³', qty: 18.5, rate: 92000 },
                        { description: 'Concrete Grade 25 in lintels and columns', unit: 'm³', qty: 3.2, rate: 105000 }
                    ]},
                    { id: 'reinforcement', title: '4. REINFORCEMENT', items: [
                        { description: 'High yield reinforcement bars (Y12) in foundation', unit: 'kg', qty: 450, rate: 1250 },
                        { description: 'High yield reinforcement bars (Y10) in floor slab (mesh)', unit: 'kg', qty: 320, rate: 1250 },
                        { description: 'Binding wire', unit: 'kg', qty: 15, rate: 1100 }
                    ]},
                    { id: 'blockwork', title: '5. BLOCKWORK', items: [
                        { description: '225mm hollow sandcrete blocks in foundation', unit: 'm²', qty: 55, rate: 18500 },
                        { description: '225mm hollow sandcrete blocks in superstructure', unit: 'm²', qty: 210, rate: 16500 },
                        { description: '150mm hollow sandcrete blocks in internal partitions', unit: 'm²', qty: 45, rate: 14000 },
                        { description: 'Damp Proof Course (DPC) - 3-ply roofing felt', unit: 'm', qty: 85, rate: 1200 }
                    ]},
                    { id: 'roofing', title: '6. ROOFING WORKS', items: [
                        { description: 'Hardwood timber (50x150mm) for rafters', unit: 'm', qty: 120, rate: 2500 },
                        { description: 'Hardwood timber (50x75mm) for purlins', unit: 'm', qty: 180, rate: 1200 },
                        { description: 'Longspan Aluminum Roofing Sheets (0.55mm thick)', unit: 'm²', qty: 185, rate: 8500 },
                        { description: 'Aluminum ridges and flashing', unit: 'm', qty: 35, rate: 3500 }
                    ]},
                    { id: 'finishes', title: '7. FINISHES (Plastering & Tiling)', items: [
                        { description: 'Internal plastering (12mm thick, 1:4 cement/sand)', unit: 'm²', qty: 420, rate: 3500 },
                        { description: 'External rendering (15mm thick, 1:3 cement/sand)', unit: 'm²', qty: 165, rate: 4200 },
                        { description: 'Vitrified floor tiles (600x600mm) in rooms', unit: 'm²', qty: 110, rate: 12500 },
                        { description: 'Ceramic wall tiles (300x600mm) in bathrooms', unit: 'm²', qty: 45, rate: 9500 },
                        { description: 'Screeding to floor surfaces', unit: 'm²', qty: 120, rate: 2200 }
                    ]},
                    { id: 'painting', title: '8. PAINTING', items: [
                        { description: 'First grade emulsion paint to internal walls', unit: 'm²', qty: 420, rate: 1800 },
                        { description: 'Texcote or similar to external walls', unit: 'm²', qty: 165, rate: 2800 },
                        { description: 'Gloss paint to metal works and doors', unit: 'm²', qty: 25, rate: 3200 }
                    ]},
                    { id: 'mep', title: '9. MEP (Electrical & Plumbing)', items: [
                        { description: 'Electrical conduits and piping (concealed)', unit: 'Sum', qty: 1, rate: 450000 },
                        { description: 'Main distribution board and circuit breakers', unit: 'Nr', qty: 1, rate: 125000 },
                        { description: 'Plumbing pipework (PVC/PPR)', unit: 'Sum', qty: 1, rate: 550000 },
                        { description: 'Sanitary fittings (WC, Wash hand basins, etc.)', unit: 'Set', qty: 4, rate: 185000 }
                    ]}
                ]
            },
            'Duplex': {
                description: 'Two-story luxury residential estimate',
                sections: [
                    { id: 'preliminaries', title: '1. PRELIMINARIES', items: [
                        { description: 'Mobilization & Demobilization', unit: 'Sum', qty: 1, rate: 350000 },
                        { description: 'Water and electricity for the works', unit: 'Sum', qty: 1, rate: 250000 },
                        { description: 'Insurance and bonds', unit: 'Sum', qty: 1, rate: 500000 }
                    ]},
                    { id: 'substructure', title: '2. SUBSTRUCTURE', items: [
                        { description: 'Excavation to foundation trenches', unit: 'm³', qty: 65, rate: 2500 },
                        { description: 'Imported Laterite fill in floor area', unit: 'm³', qty: 80, rate: 9500 },
                        { description: 'Hardcore filling of broken stones', unit: 'm³', qty: 45, rate: 14000 },
                        { description: 'Mass Blinding Grade 15', unit: 'm³', qty: 5.5, rate: 68000 }
                    ]},
                    { id: 'concrete', title: '3. CONCRETE WORKS', items: [
                        { description: 'Concrete Grade 25 in base footing', unit: 'm³', qty: 18, rate: 95000 },
                        { description: 'Concrete Grade 25 in Ground Beam', unit: 'm³', qty: 12, rate: 98000 },
                        { description: 'Reinforced concrete in Columns (Superstructure)', unit: 'm³', qty: 8.5, rate: 115000 },
                        { description: 'Reinforced concrete in Suspended Slab (150mm)', unit: 'm³', qty: 24, rate: 125000 },
                        { description: 'Reinforced concrete in Beams', unit: 'm³', qty: 15, rate: 118000 }
                    ]},
                    { id: 'reinforcement', title: '4. REINFORCEMENT', items: [
                        { description: 'High yield reinforcement Y16', unit: 'kg', qty: 850, rate: 1300 },
                        { description: 'High yield reinforcement Y12', unit: 'kg', qty: 1200, rate: 1300 },
                        { description: 'High yield reinforcement Y20 (for beams)', unit: 'kg', qty: 450, rate: 1350 },
                        { description: 'R8 mild steel links', unit: 'kg', qty: 320, rate: 1250 }
                    ]},
                    { id: 'blockwork', title: '5. BLOCKWORK', items: [
                        { description: '225mm hollow sandcrete blocks', unit: 'm²', qty: 450, rate: 17500 },
                        { description: '150mm hollow sandcrete blocks (partitions)', unit: 'm²', qty: 120, rate: 15000 }
                    ]},
                    { id: 'roofing', title: '6. ROOFING', items: [
                        { description: 'Stone coated roofing tiles (0.55mm)', unit: 'm²', qty: 240, rate: 14500 },
                        { description: 'Hardwood roof structure complete (trusses)', unit: 'Sum', qty: 1, rate: 2800000 }
                    ]}
                ]
            },
            'High-rise Building': {
                description: 'Sky-scrapers and high-density residential towers',
                sections: [
                    { id: 'substructure', title: '1. DEEP FOUNDATION & RETENTION', items: [
                        { description: 'Bored Piles dia 800mm (40m depth)', unit: 'm', qty: 1200, rate: 285000 },
                        { description: 'Diaphragm Wall (Concrete Grade 40)', unit: 'm²', qty: 1500, rate: 450000 },
                        { description: 'Ground Anchors and shoring', unit: 'Nr', qty: 45, rate: 850000 }
                    ]},
                    { id: 'frame', title: '2. STRUCTURAL FRAME', items: [
                        { description: 'Post-tensioned Concrete Slabs', unit: 'm³', qty: 2400, rate: 185000 },
                        { description: 'High Strength Concrete Grade 50 for Columns', unit: 'm³', qty: 850, rate: 165000 },
                        { description: 'Climbing formwork system', unit: 'm²', qty: 4500, rate: 25000 }
                    ]},
                    { id: 'cladding', title: '3. EXTERNAL ENVELOPE', items: [
                        { description: 'Unitized Curtain Wall System', unit: 'm²', qty: 4200, rate: 195000 },
                        { description: 'Aluminum Cladding Panels', unit: 'm²', qty: 1500, rate: 85000 }
                    ]}
                ]
            },
            'Commercial Building': {
                description: 'Plazas, Malls, Multi-use Complexes',
                sections: [
                    { id: 'substructure', title: '1. SUBSTRUCTURE & PILING', items: [
                        { description: 'Mobilization of piling rig', unit: 'Sum', qty: 1, rate: 2500000 },
                        { description: 'Bored Pile Foundation (600mm dia)', unit: 'm', qty: 240, rate: 135000 },
                        { description: 'Excavation for Pad Foundation', unit: 'm³', qty: 150, rate: 3800 },
                        { description: 'Concrete Grade 30 in Ground Beams', unit: 'm³', qty: 45, rate: 105000 }
                    ]},
                    { id: 'superstructure', title: '2. SUPERSTRUCTURE CONCRETE', items: [
                        { description: 'Concrete Grade 35 in Columns', unit: 'm³', qty: 85, rate: 115000 },
                        { description: 'Concrete Grade 35 in Slabs', unit: 'm³', qty: 160, rate: 125000 },
                        { description: 'Formwork to columns and beams', unit: 'm²', qty: 450, rate: 15000 }
                    ]},
                    { id: 'finishing_mep', title: '3. FINISHES & SERVICES', items: [
                        { description: 'Glass curtain walling', unit: 'm²', qty: 320, rate: 185000 },
                        { description: 'Granite floor finishes', unit: 'm²', qty: 450, rate: 35000 },
                        { description: 'HVAC Central Air Conditioning', unit: 'Sum', qty: 1, rate: 25000000 },
                        { description: 'Passenger elevators (2 Nr)', unit: 'Nr', qty: 2, rate: 18000000 }
                    ]}
                ]
            },
            'Hospital': {
                description: 'State-of-the-art medical facility estimate',
                sections: [
                    { id: 'specialized', title: '1. SPECIALIZED CLINICAL WORKS', items: [
                        { description: 'Lead lining for X-ray rooms', unit: 'm²', qty: 120, rate: 85000 },
                        { description: 'Medical Gas Copper Piping', unit: 'm', qty: 450, rate: 12500 },
                        { description: 'Vinyl Antimicrobial Flooring', unit: 'm²', qty: 850, rate: 22000 }
                    ]},
                    { id: 'mep_hospital', title: '2. HOSPITAL MEP', items: [
                        { description: 'HEPA filtration HVAC units', unit: 'Nr', qty: 15, rate: 4500000 },
                        { description: 'Uninterruptible Power Supply (UPS) for surgery', unit: 'Sum', qty: 1, rate: 12000000 }
                    ]}
                ]
            },
            'Warehouse': {
                description: 'Industrial Steel Portal Frame Shed',
                sections: [
                    { id: 'steel_frame', title: '1. STRUCTURAL STEELWORK', items: [
                        { description: 'Hot rolled steel portal frames (Grade S355)', unit: 'Tonne', qty: 45, rate: 1650000 },
                        { description: 'Cold rolled Z-purlins and eaves beams', unit: 'kg', qty: 8500, rate: 1400 },
                        { description: 'Steel erection and site welding', unit: 'Tonne', qty: 45, rate: 350000 }
                    ]},
                    { id: 'foundation_warehouse', title: '2. INDUSTRIAL FLOORING', items: [
                        { description: 'Massive concrete slab Grade 35 (250mm)', unit: 'm³', qty: 450, rate: 110000 },
                        { description: 'Power floated finish with floor hardener', unit: 'm²', qty: 1800, rate: 6500 }
                    ]}
                ]
            }
        }
    },
    [STRUCTURE_CATEGORIES.ROAD]: {
        icon: '🛣️',
        subtypes: {
            'Flexible Pavement': {
                description: 'Professional Asphaltic Road Construction',
                sections: [
                    { id: 'preliminaries', title: '1. PRELIMINARIES', items: [
                        { description: 'Site setup, mobilization & staff camp', unit: 'Sum', qty: 1, rate: 5000000 },
                        { description: 'Survey and setting out', unit: 'km', qty: 1.5, rate: 850000 }
                    ]},
                    { id: 'earthworks', title: '2. EARTHWORKS', items: [
                        { description: 'Site Clearing and Grubbing', unit: 'm²', qty: 15000, rate: 450 },
                        { description: 'Removal of topsoil (200mm)', unit: 'm³', qty: 3000, rate: 1500 },
                        { description: 'Excavation of unsuitable material (soft spots)', unit: 'm³', qty: 850, rate: 2500 },
                        { description: 'Embankment Fill with borrowed laterite', unit: 'm³', qty: 12000, rate: 8500 },
                        { description: 'Compaction and subgrade preparation', unit: 'm²', qty: 12000, rate: 650 }
                    ]},
                    { id: 'pavement', title: '3. PAVEMENT STRUCTURE', items: [
                        { description: 'Capping Layer (Selected fill 300mm)', unit: 'm³', qty: 3600, rate: 12000 },
                        { description: 'Sub-base (Stone base 200mm)', unit: 'm³', qty: 2400, rate: 28000 },
                        { description: 'Base Course (Stone base 200mm)', unit: 'm³', qty: 2400, rate: 32000 },
                        { description: 'Prime Coat (MC1 Cutback Bitumen)', unit: 'm²', qty: 12000, rate: 1200 },
                        { description: 'Tack Coat (S125 Bitumen Emulsion)', unit: 'm²', qty: 12000, rate: 850 }
                    ]},
                    { id: 'surfacing', title: '4. ASPHALTIC SURFACING', items: [
                        { description: 'Asphaltic Concrete Binder Course (60mm)', unit: 'm²', qty: 12000, rate: 16500 },
                        { description: 'Asphaltic Concrete Wearing Course (40mm)', unit: 'm²', qty: 12000, rate: 12500 }
                    ]},
                    { id: 'ancillary', title: '5. ANCILLARY WORKS', items: [
                        { description: 'Concrete Kerbs (Standard 150x300mm)', unit: 'm', qty: 3000, rate: 8500 },
                        { description: 'Road Marking (Thermo-plastic)', unit: 'm', qty: 4500, rate: 4500 },
                        { description: 'Road Signage (Warning/Directional)', unit: 'Nr', qty: 25, rate: 125000 }
                    ]}
                ]
            },
            'CRCP': {
                description: 'Continuously Reinforced Concrete Pavement (Smart Road)',
                sections: [
                    { id: 'preliminaries', title: '1. PRELIMINARIES', items: [
                        { description: 'Mobilization of heavy plant and paving machine', unit: 'Sum', qty: 1, rate: 12000000 },
                        { description: 'Laboratory equipment and quality control', unit: 'Sum', qty: 1, rate: 5000000 }
                    ]},
                    { id: 'earthworks', title: '2. EARTHWORKS', items: [
                        { description: 'Site Clearing', unit: 'm²', qty: 20000, rate: 500 },
                        { description: 'Removal of unsuitable soil', unit: 'm³', qty: 1500, rate: 2800 },
                        { description: 'Imported Laterite Fill', unit: 'm³', qty: 18000, rate: 9500 },
                        { description: 'Sharp sand filling (Sub-base layer)', unit: 'm³', qty: 4500, rate: 6500 }
                    ]},
                    { id: 'pavement_prep', title: '3. PAVEMENT PREPARATION', items: [
                        { description: 'Crushed Rock Stone Base (200mm)', unit: 'm³', qty: 4000, rate: 35000 },
                        { description: 'MC1 application (Internal sealing)', unit: 'm²', qty: 20000, rate: 1200 }
                    ]},
                    { id: 'reinforcement', title: '4. REINFORCEMENT (CRCP)', items: [
                        { description: 'High yield reinforcement Y16 (Main bars)', unit: 'kg', qty: 125000, rate: 1400 },
                        { description: 'High yield reinforcement Y12 (Transverse)', unit: 'kg', qty: 85000, rate: 1400 },
                        { description: 'Chair supports and tie bars', unit: 'Nr', qty: 5000, rate: 4500 }
                    ]},
                    { id: 'concrete', title: '5. CONCRETE PAVEMENT', items: [
                        { description: 'Concrete Grade 40 (Machine Laid)', unit: 'm³', qty: 6000, rate: 115000 },
                        { description: 'Surface finishing and textures', unit: 'm²', qty: 20000, rate: 2500 },
                        { description: 'Curing compounds and protection', unit: 'm²', qty: 20000, rate: 850 }
                    ]},
                    { id: 'ancillary', title: '6. ANCILLARY', items: [
                        { description: 'Edge protection Kerbs', unit: 'm', qty: 4000, rate: 9500 },
                        { description: 'Road Markings', unit: 'm', qty: 6000, rate: 5500 }
                    ]}
                ]
            },
            'Dual Carriageway': {
                description: 'Major split-highway project estimate',
                sections: [
                    { id: 'median', title: '1. MEDIAN & DRAINAGE', items: [
                        { description: 'Concrete Median Barriers', unit: 'm', qty: 4500, rate: 45000 },
                        { description: 'Central Reserve Drainage (U-Drain)', unit: 'm', qty: 4500, rate: 22000 }
                    ]},
                    { id: 'lighting', title: '2. ROAD LIGHTING', items: [
                        { description: 'Solar LED Streetlight Poles', unit: 'Nr', qty: 120, rate: 450000 },
                        { description: 'Underground cabling for lighting', unit: 'm', qty: 5000, rate: 1500 }
                    ]}
                ]
            }
        }
    },
    [STRUCTURE_CATEGORIES.BRIDGE]: {
        icon: '🌉',
        subtypes: {
            'Beam Bridge': {
                description: 'Multi-span concrete beam bridge',
                sections: [
                    { id: 'piling', title: '1. PILE FOUNDATION', items: [
                        { description: 'Bored Cast-in-place Piles (1000mm dia)', unit: 'm', qty: 450, rate: 350000 },
                        { description: 'Reinforcement for piles', unit: 'kg', qty: 65000, rate: 1350 },
                        { description: 'Integrity testing for piles', unit: 'Nr', qty: 24, rate: 250000 }
                    ]},
                    { id: 'pile_cap', title: '2. PILE CAPS & COLUMNS', items: [
                        { description: 'Concrete Grade 35 in Pile Cap', unit: 'm³', qty: 320, rate: 125000 },
                        { description: 'Concrete Grade 35 in Piers/Columns', unit: 'm³', qty: 185, rate: 165000 },
                        { description: 'Reinforcement Y20/Y25/Y32', unit: 'kg', qty: 45000, rate: 1400 }
                    ]},
                    { id: 'superstructure', title: '3. SUPERSTRUCTURE', items: [
                        { description: 'Pre-stressed I-Girders (30m span)', unit: 'Nr', qty: 12, rate: 8500000 },
                        { description: 'Concrete Grade 40 in Deck Slab', unit: 'm³', qty: 450, rate: 185000 },
                        { description: 'Expansion joints (Modular)', unit: 'm', qty: 24, rate: 650000 },
                        { description: 'Elastomeric Bearings', unit: 'Nr', qty: 48, rate: 350000 }
                    ]},
                    { id: 'ancillary', title: '4. ANCILLARY', items: [
                        { description: 'Parapet Railings (Galvanized)', unit: 'm', qty: 120, rate: 125000 },
                        { description: 'Approach slabs', unit: 'm³', qty: 85, rate: 115000 },
                        { description: 'Asphalt wearing course on deck', unit: 'm²', qty: 1200, rate: 18500 }
                    ]}
                ]
            },
            'Arch Bridge': {
                description: 'Reinforced concrete arch span',
                sections: [
                    { id: 'arch_ribs', title: '1. ARCH RIBS', items: [
                        { description: 'High Precision Formwork for Ribs', unit: 'm²', qty: 850, rate: 45000 },
                        { description: 'Concrete Grade 45 in ribs', unit: 'm³', qty: 320, rate: 165000 }
                    ]}
                ]
            }
        }
    },
    [STRUCTURE_CATEGORIES.DRAINAGE]: {
        icon: '🚰',
        subtypes: {
            'Box Culvert': {
                description: 'Triple-Cell Concrete Box Culvert',
                sections: [
                    { id: 'excavation', title: '1. EXCAVATION & PREPS', items: [
                        { description: 'Setting out and profiling', unit: 'Sum', qty: 1, rate: 150000 },
                        { description: 'Excavation for culvert foundation (2m deep)', unit: 'm³', qty: 450, rate: 3500 },
                        { description: 'Dewatering and pumping', unit: 'Day', qty: 10, rate: 75000 },
                        { description: 'Concrete blinding Grade 15 (100mm)', unit: 'm³', qty: 25, rate: 65000 }
                    ]},
                    { id: 'concrete', title: '2. CONCRETE & REINFORCEMENT', items: [
                        { description: 'Concrete Grade 30 in Base Slab', unit: 'm³', qty: 85, rate: 115000 },
                        { description: 'Concrete Grade 30 in Walls & Top Slab', unit: 'm³', qty: 120, rate: 125000 },
                        { description: 'High yield reinforcement Y12/Y16', unit: 'kg', qty: 18000, rate: 1400 },
                        { description: 'Formwork to sides and soffits', unit: 'm²', qty: 420, rate: 15000 }
                    ]},
                    { id: 'ancillary', title: '3. ANCILLARY', items: [
                        { description: 'Stone pitching to wingwalls', unit: 'm²', qty: 85, rate: 25000 },
                        { description: 'Excavated material backfilling', unit: 'm³', qty: 320, rate: 1500 }
                    ]}
                ]
            },
            'U-Drain': {
                description: 'Open concrete line drain',
                sections: [
                    { id: 'u_construction', title: '1. DRAIN CONSTRUCTION', items: [
                        { description: 'Excavation for drain trench', unit: 'm³', qty: 150, rate: 2800 },
                        { description: 'Concrete Grade 25 in walls/base', unit: 'm³', qty: 45, rate: 85000 },
                        { description: 'Precast concrete slabs cover', unit: 'm', qty: 200, rate: 6500 }
                    ]}
                ]
            }
        }
    },
    [STRUCTURE_CATEGORIES.FOUNDATION]: {
        icon: '👇',
        subtypes: {
            'Raft Foundation': {
                description: 'Standard Reinforced Solid Raft',
                sections: [
                    { id: 'earthworks', title: '1. EARTHWORKS', items: [
                        { description: 'Excavation to reduced level', unit: 'm³', qty: 120, rate: 2800 },
                        { description: 'Sand filling and consolidation', unit: 'm³', qty: 65, rate: 7500 },
                        { description: 'Hardcore of broken stones', unit: 'm³', qty: 45, rate: 14000 }
                    ]},
                    { id: 'concrete', title: '2. CONCRETE', items: [
                        { description: 'Blinding concrete 50mm', unit: 'm³', qty: 8.5, rate: 65000 },
                        { description: 'Reinforced Concrete Grade 25 in Raft', unit: 'm³', qty: 65, rate: 105000 },
                        { description: 'Reinforcement Y12 in mesh', unit: 'kg', qty: 2500, rate: 1350 }
                    ]}
                ]
            },
            'Pile Foundation': {
                description: 'Deep foundation for heavy structures',
                sections: [
                    { id: 'piling_only', title: '1. PILING WORKS', items: [
                        { description: 'Driven RC Piles (350x350mm)', unit: 'm', qty: 850, rate: 45000 },
                        { description: 'Pile head treatment and hacking', unit: 'Nr', qty: 45, rate: 15000 }
                    ]}
                ]
            }
        }
    },
    [STRUCTURE_CATEGORIES.COASTAL]: {
        icon: '🌊',
        subtypes: {
            'Shore Protection': {
                description: 'Coastal Revetment with Rock Armour',
                sections: [
                    { id: 'prep', title: '1. PREPARATION', items: [
                        { description: 'Site mobilization for marine craft', unit: 'Sum', qty: 1, rate: 15000000 },
                        { description: 'Dredging to required depth', unit: 'm³', qty: 5000, rate: 8500 }
                    ]},
                    { id: 'revetment', title: '2. REVETMENT', items: [
                        { description: 'Geotextile Filter Membrane', unit: 'm²', qty: 3500, rate: 4500 },
                        { description: 'Quarry Run Rock (Core layer)', unit: 'Tonne', qty: 1200, rate: 22000 },
                        { description: 'Rock Armour (2-4 Tonne stone)', unit: 'Tonne', qty: 2500, rate: 35000 }
                    ]}
                ]
            },
            'Jetty': {
                description: 'Structural landing berth estimate',
                sections: [
                    { id: 'jetty_piling', title: '1. MARINE PILES', items: [
                        { description: 'Anticorrosive coated steel piles', unit: 'm', qty: 450, rate: 650000 },
                        { description: 'Welding of pile caps and bracing', unit: 'Sum', qty: 1, rate: 4500000 }
                    ]}
                ]
            }
        }
    }
};
