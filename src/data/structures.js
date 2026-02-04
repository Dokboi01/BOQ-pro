// BOQ Pro - Enhanced Structure Types with Comprehensive Components
// Migrated from HTML version with full component details

export const STRUCTURE_TYPES = {
    RESIDENTIAL: 'Residential Building',
    COMMERCIAL: 'Commercial Building',
    ROAD: 'Road Construction',
    BRIDGE: 'Bridge / Flyover',
    CULVERT: 'Box Culvert',
    RETAINING_WALL: 'Retaining Wall'
};

export const STRUCTURE_DATA = {
    [STRUCTURE_TYPES.RESIDENTIAL]: {
        icon: '🏠',
        description: 'Bungalows, Duplexes, Apartments',
        sections: [
            {
                id: 'substructure',
                title: 'A. SUBSTRUCTURE',
                items: [
                    { description: 'Site Clearance and Removal of Debris', unit: 'm²', qty: 0, rate: 500, benchmark: 500 },
                    { description: 'Excavation in Ordinary Soil for Foundation', unit: 'm³', qty: 0, rate: 1800, benchmark: 1800 },
                    { description: 'Anti-termite Treatment (Aldrex or equivalent)', unit: 'm²', qty: 0, rate: 1500, benchmark: 1500 },
                    { description: 'Hardcore Filling and Compaction (150mm thick)', unit: 'm³', qty: 0, rate: 7500, benchmark: 7500 },
                    { description: 'Sharp Sand Filling and Compaction (50mm thick)', unit: 'm³', qty: 0, rate: 5500, benchmark: 5500 },
                    { description: 'Concrete Blinding (1:3:6 mix, 50mm thick)', unit: 'm²', qty: 0, rate: 2250, benchmark: 2250 },
                    { description: 'Strip Foundation Concrete (1:2:4 mix)', unit: 'm³', qty: 0, rate: 73500, benchmark: 73500 },
                    { description: 'Column Base Concrete (1:2:4 mix)', unit: 'm³', qty: 0, rate: 77500, benchmark: 77500 },
                    { description: 'High Yield Steel Reinforcement (Y12, Y16)', unit: 'kg', qty: 0, rate: 1170, benchmark: 1170 },
                    { description: 'Damp Proof Membrane (polythene sheet)', unit: 'm²', qty: 0, rate: 1650, benchmark: 1650 },
                    { description: 'Ground Floor Slab Concrete (1:2:4, 150mm)', unit: 'm³', qty: 0, rate: 75000, benchmark: 75000 },
                    { description: 'BRC Mesh Reinforcement (A142)', unit: 'm²', qty: 0, rate: 2350, benchmark: 2350 }
                ]
            },
            {
                id: 'superstructure',
                title: 'B. SUPERSTRUCTURE',
                items: [
                    { description: '225mm Sandcrete Block Wall', unit: 'm²', qty: 0, rate: 18000, benchmark: 18000 },
                    { description: '150mm Sandcrete Block Wall (partitions)', unit: 'm²', qty: 0, rate: 15500, benchmark: 15500 },
                    { description: 'Reinforced Concrete Columns (225x225mm)', unit: 'm³', qty: 0, rate: 87000, benchmark: 87000 },
                    { description: 'Reinforced Concrete Beams (225x450mm)', unit: 'm³', qty: 0, rate: 87000, benchmark: 87000 },
                    { description: 'Reinforced Concrete Lintels', unit: 'm', qty: 0, rate: 7000, benchmark: 7000 },
                    { description: 'Suspended Slab Concrete (1:2:4, 150mm)', unit: 'm³', qty: 0, rate: 93000, benchmark: 93000 },
                    { description: 'Reinforced Concrete Staircase', unit: 'Sum', qty: 1, rate: 400000, benchmark: 400000 },
                    { description: 'High Yield Steel Reinforcement', unit: 'kg', qty: 0, rate: 1200, benchmark: 1200 },
                    { description: 'Formwork to Columns, Beams and Slabs', unit: 'm²', qty: 0, rate: 10000, benchmark: 10000 }
                ]
            },
            {
                id: 'roofing',
                title: 'C. ROOFING',
                items: [
                    { description: 'Hardwood Roof Trusses', unit: 'm²', qty: 0, rate: 14000, benchmark: 14000 },
                    { description: 'Treated Hardwood Purlins (50x75mm)', unit: 'm', qty: 0, rate: 2650, benchmark: 2650 },
                    { description: 'Long Span Aluminum Roofing Sheets (0.55mm)', unit: 'm²', qty: 0, rate: 8300, benchmark: 8300 },
                    { description: 'Aluminum Ridge Capping', unit: 'm', qty: 0, rate: 3700, benchmark: 3700 },
                    { description: 'Fascia Board (225mm wide)', unit: 'm', qty: 0, rate: 6700, benchmark: 6700 },
                    { description: 'POP Ceiling with Decorative Mouldings', unit: 'm²', qty: 0, rate: 18500, benchmark: 18500 },
                    { description: 'PVC Rain Water Gutter and Fittings', unit: 'm', qty: 0, rate: 5350, benchmark: 5350 }
                ]
            },
            {
                id: 'finishes',
                title: 'D. FINISHES',
                items: [
                    { description: 'Internal Cement Sand Plaster (12mm thick)', unit: 'm²', qty: 0, rate: 8000, benchmark: 8000 },
                    { description: 'External Cement Sand Render (18mm thick)', unit: 'm²', qty: 0, rate: 9000, benchmark: 9000 },
                    { description: 'Floor Screeding (25mm thick)', unit: 'm²', qty: 0, rate: 6000, benchmark: 6000 },
                    { description: 'Vitrified Floor Tiles (600x600mm)', unit: 'm²', qty: 0, rate: 17000, benchmark: 17000 },
                    { description: 'Ceramic Wall Tiles (Kitchen/Bathroom)', unit: 'm²', qty: 0, rate: 13500, benchmark: 13500 },
                    { description: 'Floor Tile Skirting (100mm high)', unit: 'm', qty: 0, rate: 2000, benchmark: 2000 },
                    { description: 'Emulsion Paint to Internal Walls (3 coats)', unit: 'm²', qty: 0, rate: 2700, benchmark: 2700 },
                    { description: 'Texcote/Weather Shield to External Walls', unit: 'm²', qty: 0, rate: 4000, benchmark: 4000 }
                ]
            },
            {
                id: 'doors_windows',
                title: 'E. DOORS & WINDOWS',
                items: [
                    { description: 'Flush Door with Frame (900x2100mm)', unit: 'Nr', qty: 0, rate: 55000, benchmark: 55000 },
                    { description: 'Panel Door with Frame (900x2100mm)', unit: 'Nr', qty: 0, rate: 80000, benchmark: 80000 },
                    { description: 'Steel Security Door', unit: 'Nr', qty: 0, rate: 145000, benchmark: 145000 },
                    { description: 'Aluminum Sliding Window with Netting', unit: 'm²', qty: 0, rate: 23000, benchmark: 23000 },
                    { description: 'Aluminum Casement Window', unit: 'm²', qty: 0, rate: 32500, benchmark: 32500 },
                    { description: 'Steel Burglary Proofing to Windows', unit: 'm²', qty: 0, rate: 13000, benchmark: 13000 },
                    { description: 'Door Locks and Handles', unit: 'Nr', qty: 0, rate: 10000, benchmark: 10000 }
                ]
            },
            {
                id: 'mande',
                title: 'F. M&E SERVICES',
                items: [
                    { description: 'Electrical Installation (Piping, Wiring & Fittings)', unit: 'Sum', qty: 1, rate: 3350000, benchmark: 3350000 },
                    { description: 'Plumbing & Sanitary Installation (Complete)', unit: 'Sum', qty: 1, rate: 2500000, benchmark: 2500000 },
                    { description: 'Septic Tank (2-chamber, concrete/blockwork)', unit: 'Nr', qty: 1, rate: 500000, benchmark: 500000 },
                    { description: 'Soak Away Pit (filled with core stones)', unit: 'Nr', qty: 1, rate: 265000, benchmark: 265000 },
                    { description: 'Overhead Water Tank (2000L) with Steel Stand', unit: 'Nr', qty: 1, rate: 395000, benchmark: 395000 },
                    { description: 'Borehole Drilling and Pump Installation', unit: 'Nr', qty: 1, rate: 800000, benchmark: 800000 }
                ]
            },
            {
                id: 'external',
                title: 'G. EXTERNAL WORKS',
                items: [
                    { description: 'Fence Wall (225mm block, 2.4m high inc. foundation)', unit: 'm', qty: 0, rate: 50000, benchmark: 50000 },
                    { description: 'Steel Gate (sliding/swing designer type)', unit: 'Nr', qty: 1, rate: 395000, benchmark: 395000 },
                    { description: 'Interlocking Paving Stones (60mm thick)', unit: 'm²', qty: 0, rate: 11000, benchmark: 11000 },
                    { description: 'Concrete Drainage Channels (600x600mm)', unit: 'm', qty: 0, rate: 18500, benchmark: 18500 },
                    { description: 'Landscaping and Ornamental Grass Planting', unit: 'm²', qty: 0, rate: 4000, benchmark: 4000 }
                ]
            }
        ]
    },

    [STRUCTURE_TYPES.COMMERCIAL]: {
        icon: '🏢',
        description: 'Offices, Shops, Warehouses',
        sections: [
            {
                id: 'substructure',
                title: 'A. SUBSTRUCTURE',
                items: [
                    { description: 'Site Clearance, Demolition and Removal of Debris', unit: 'm²', qty: 0, rate: 1100, benchmark: 1100 },
                    { description: 'Excavation for Pad Foundation and Basement', unit: 'm³', qty: 0, rate: 3500, benchmark: 3500 },
                    { description: 'Bored Pile Foundation (600mm dia, 15m deep)', unit: 'm', qty: 0, rate: 130000, benchmark: 130000 },
                    { description: 'Pile Cap Reinforced Concrete (1:2:4)', unit: 'm³', qty: 0, rate: 84000, benchmark: 84000 },
                    { description: 'Ground Beam Concrete (Grade 30)', unit: 'm³', qty: 0, rate: 93000, benchmark: 93000 },
                    { description: 'Raft Foundation Concrete Slab (300mm thick)', unit: 'm³', qty: 0, rate: 84000, benchmark: 84000 },
                    { description: 'Vibrated Hardcore Filling (200mm thick)', unit: 'm³', qty: 0, rate: 12000, benchmark: 12000 },
                    { description: 'Double Layer Damp Proof Membrane', unit: 'm²', qty: 0, rate: 2500, benchmark: 2500 },
                    { description: 'Reinforced Ground Floor Slab (175mm thick)', unit: 'm³', qty: 0, rate: 90000, benchmark: 90000 }
                ]
            },
            {
                id: 'superstructure',
                title: 'B. SUPERSTRUCTURE',
                items: [
                    { description: 'Reinforced Concrete Columns (Grade 35)', unit: 'm³', qty: 0, rate: 104000, benchmark: 104000 },
                    { description: 'Reinforced Concrete Beams (Grade 30)', unit: 'm³', qty: 0, rate: 93000, benchmark: 93000 },
                    { description: 'Suspended Floor Slabs (225mm thick)', unit: 'm³', qty: 0, rate: 93000, benchmark: 93000 },
                    { description: 'Reinforced Concrete Shear Wall (Lift shafts)', unit: 'm³', qty: 0, rate: 110000, benchmark: 110000 },
                    { description: '225mm Hollow Sandcrete Block Wall', unit: 'm²', qty: 0, rate: 21000, benchmark: 21000 },
                    { description: 'Aluminum/Glass Curtain Wall (Double Glazed)', unit: 'm²', qty: 0, rate: 145000, benchmark: 145000 },
                    { description: 'Fire Exit Staircase (Concrete)', unit: 'Nr', qty: 0, rate: 630000, benchmark: 630000 },
                    { description: 'High Yield Steel Reinforcement', unit: 'Tonne', qty: 0, rate: 1100000, benchmark: 1100000 }
                ]
            },
            {
                id: 'roofing',
                title: 'C. ROOFING',
                items: [
                    { description: 'Hot Rolled Steel Roof Trusses (fabricated)', unit: 'Tonne', qty: 0, rate: 1550000, benchmark: 1550000 },
                    { description: 'Galvanized Steel Purlins (C-section)', unit: 'm', qty: 0, rate: 4350, benchmark: 4350 },
                    { description: 'Stone Coated/Industrial Aluminum Roofing (0.70mm)', unit: 'm²', qty: 0, rate: 12000, benchmark: 12000 },
                    { description: 'Reinforced Concrete Parapet Wall and Coping', unit: 'm', qty: 0, rate: 23500, benchmark: 23500 },
                    { description: 'APP Bituminous Waterproofing Membrane (4mm)', unit: 'm²', qty: 0, rate: 9500, benchmark: 9500 }
                ]
            },
            {
                id: 'finishes',
                title: 'D. FINISHES',
                items: [
                    { description: 'Cement Sand Plastering/Rendering (18-25mm)', unit: 'm²', qty: 0, rate: 8800, benchmark: 8800 },
                    { description: 'Heavy Duty Floor Screeding (50mm)', unit: 'm²', qty: 0, rate: 9000, benchmark: 9000 },
                    { description: 'Heavy Duty Porcelain Floor Tiles (600x600)', unit: 'm²', qty: 0, rate: 19500, benchmark: 19500 },
                    { description: 'Ceramic Wall Tiles (Toilets/Lobbies)', unit: 'm²', qty: 0, rate: 14000, benchmark: 14000 },
                    { description: 'Acoustic Ceiling Tiles with Aluminum Grid', unit: 'm²', qty: 0, rate: 26500, benchmark: 26500 },
                    { description: 'Premium Gloss/Emulsion Paint (Internal)', unit: 'm²', qty: 0, rate: 4300, benchmark: 4300 },
                    { description: 'Acrylic Weather Shield Paint (External)', unit: 'm²', qty: 0, rate: 6000, benchmark: 6000 }
                ]
            },
            {
                id: 'doors_windows',
                title: 'E. DOORS & WINDOWS',
                items: [
                    { description: 'Heavy Duty Aluminum Framed Glass Entrance Doors', unit: 'Nr', qty: 0, rate: 210000, benchmark: 210000 },
                    { description: 'UL Listed Fire Rated Steel Doors (90 mins)', unit: 'Nr', qty: 0, rate: 295000, benchmark: 295000 },
                    { description: 'Motorized Steel Roller Shutter (Warehouses/Shops)', unit: 'm²', qty: 0, rate: 60000, benchmark: 60000 },
                    { description: 'Fixed Aluminum/Glass Windows with 6mm Tinted Glass', unit: 'm²', qty: 0, rate: 36500, benchmark: 36500 }
                ]
            },
            {
                id: 'mande',
                title: 'F. M&E SERVICES',
                items: [
                    { description: 'Complete Electrical Installation (Industrial Grade)', unit: 'Sum', qty: 1, rate: 8500000, benchmark: 8500000 },
                    { description: 'HVAC System Installation (Central Air)', unit: 'Sum', qty: 1, rate: 12000000, benchmark: 12000000 },
                    { description: 'Fire Alarm & Detection System', unit: 'Sum', qty: 1, rate: 3500000, benchmark: 3500000 },
                    { description: 'Plumbing & Sanitary Installation', unit: 'Sum', qty: 1, rate: 4500000, benchmark: 4500000 },
                    { description: 'Elevator Installation (6-person capacity)', unit: 'Nr', qty: 0, rate: 18000000, benchmark: 18000000 },
                    { description: 'Water Treatment Plant', unit: 'Nr', qty: 1, rate: 2500000, benchmark: 2500000 }
                ]
            }
        ]
    },

    [STRUCTURE_TYPES.ROAD]: {
        icon: '🛣️',
        description: 'Roads, Highways, Access Routes',
        sections: [
            {
                id: 'prelims',
                title: '100. PRELIMINARIES',
                items: [
                    { description: 'Mobilization & Demobilization', unit: 'Sum', qty: 1, rate: 2500000, benchmark: 2500000 },
                    { description: 'Site Survey & Setting Out', unit: 'km', qty: 0, rate: 450000, benchmark: 450000 },
                    { description: 'Temporary Site Facilities', unit: 'Sum', qty: 1, rate: 850000, benchmark: 850000 }
                ]
            },
            {
                id: 'earthworks',
                title: '200. EARTHWORKS',
                items: [
                    { description: 'Site Clearance and removal of vegetable soil', unit: 'm²', qty: 0, rate: 450, benchmark: 450 },
                    { description: 'Scarification of existing pavement', unit: 'm²', qty: 0, rate: 350, benchmark: 350 },
                    { description: 'Borrow Fill G15 Material in subgrade', unit: 'm³', qty: 0, rate: 8500, benchmark: 8500 },
                    { description: 'Compaction of Subgrade to 95% MDD', unit: 'm²', qty: 0, rate: 850, benchmark: 850 },
                    { description: 'Cut to Spoil (Mechanical Excavation)', unit: 'm³', qty: 0, rate: 2500, benchmark: 2500 }
                ]
            },
            {
                id: 'pavement',
                title: '400. PAVEMENT & SURFACING',
                items: [
                    { description: 'Crushed Rock Base Course (200mm)', unit: 'm³', qty: 0, rate: 28000, benchmark: 28000 },
                    { description: 'Asphaltic Concrete Binder Course (60mm)', unit: 'm²', qty: 0, rate: 14500, benchmark: 14500 },
                    { description: 'Asphaltic Concrete Wearing Course (40mm)', unit: 'm²', qty: 0, rate: 11000, benchmark: 11000 },
                    { description: 'Prime Coat (MC-30 emulsion)', unit: 'm²', qty: 0, rate: 850, benchmark: 850 },
                    { description: 'Tack Coat (RC-70)', unit: 'm²', qty: 0, rate: 650, benchmark: 650 }
                ]
            },
            {
                id: 'drainage',
                title: '500. DRAINAGE WORKS',
                items: [
                    { description: 'U-Drain Construction (600x600mm)', unit: 'm', qty: 0, rate: 18500, benchmark: 18500 },
                    { description: 'Precast Concrete Pipes (900mm dia)', unit: 'm', qty: 0, rate: 25000, benchmark: 25000 },
                    { description: 'Catch Pit Construction', unit: 'Nr', qty: 0, rate: 125000, benchmark: 125000 },
                    { description: 'Manhole Construction (1200mm dia)', unit: 'Nr', qty: 0, rate: 185000, benchmark: 185000 }
                ]
            },
            {
                id: 'ancillary',
                title: '700. ANCILLARY WORKS',
                items: [
                    { description: 'Road Marking (Thermoplastic)', unit: 'm²', qty: 0, rate: 8500, benchmark: 8500 },
                    { description: 'Road Signs and Posts', unit: 'Nr', qty: 0, rate: 45000, benchmark: 45000 },
                    { description: 'Speed Bumps (Concrete)', unit: 'Nr', qty: 0, rate: 65000, benchmark: 65000 },
                    { description: 'Street Light installation', unit: 'Nr', qty: 0, rate: 250000, benchmark: 250000 }
                ]
            }
        ]
    },

    [STRUCTURE_TYPES.BRIDGE]: {
        icon: '🌉',
        description: 'River Crossings, Flyovers',
        sections: [
            {
                id: 'piling',
                title: 'SERIES 1600. PILING & EMBEDDED RETAINING WALLS',
                items: [
                    { description: 'Bored Cast-in-place Piles (800mm dia)', unit: 'm', qty: 0, rate: 250000, benchmark: 250000 },
                    { description: 'Reinforcement Steel in Piles (High Tensile)', unit: 'Tonne', qty: 0, rate: 1450000, benchmark: 1450000 }
                ]
            },
            {
                id: 'concrete',
                title: 'SERIES 1700. STRUCTURAL CONCRETE',
                items: [
                    { description: 'Concrete Grade C35/45 in Abutments', unit: 'm³', qty: 0, rate: 155000, benchmark: 155000 },
                    { description: 'Concrete Grade C35/45 in Bridge Deck', unit: 'm³', qty: 0, rate: 165000, benchmark: 165000 },
                    { description: 'Formwork to F3 Finish', unit: 'm²', qty: 0, rate: 18500, benchmark: 18500 },
                    { description: 'Post Tensioning Cables and Stressing', unit: 'Tonne', qty: 0, rate: 2500000, benchmark: 2500000 }
                ]
            },
            {
                id: 'bearings',
                title: 'SERIES 1800. BEARINGS & EXPANSION JOINTS',
                items: [
                    { description: 'Elastomeric Bridge Bearings', unit: 'Nr', qty: 0, rate: 185000, benchmark: 185000 },
                    { description: 'Expansion Joint (Asphaltic Plug Type)', unit: 'm', qty: 0, rate: 95000, benchmark: 95000 }
                ]
            },
            {
                id: 'parapets',
                title: 'SERIES 1900. PARAPETS & SAFETY BARRIERS',
                items: [
                    { description: 'Reinforced Concrete Parapet (1.2m high)', unit: 'm', qty: 0, rate: 45000, benchmark: 45000 },
                    { description: 'Steel Safety Barriers', unit: 'm', qty: 0, rate: 35000, benchmark: 35000 }
                ]
            }
        ]
    },

    [STRUCTURE_TYPES.CULVERT]: {
        icon: '🚰',
        description: 'Box & Pipe Culverts',
        sections: [
            {
                id: 'excavation',
                title: 'Section 1: EXCAVATION & EARTHWORKS',
                items: [
                    { description: 'Excavation in soft material 0-1.5m deep', unit: 'm³', qty: 0, rate: 4500, benchmark: 4500 },
                    { description: 'Excavation in hard material 1.5-3.0m deep', unit: 'm³', qty: 0, rate: 8500, benchmark: 8500 },
                    { description: 'Dewatering and Pumping', unit: 'Sum', qty: 1, rate: 350000, benchmark: 350000 }
                ]
            },
            {
                id: 'foundation',
                title: 'Section 2: FOUNDATION WORKS',
                items: [
                    { description: 'Lean Concrete Foundation (1:3:6)', unit: 'm³', qty: 0, rate: 65000, benchmark: 65000 },
                    { description: 'Bottom Slab Reinforced Concrete (Grade 30)', unit: 'm³', qty: 0, rate: 95000, benchmark: 95000 },
                    { description: 'Reinforcement Steel in Base Slab', unit: 'kg', qty: 0, rate: 1200, benchmark: 1200 }
                ]
            },
            {
                id: 'walls',
                title: 'Section 3: WALLS & TOP SLAB',
                items: [
                    { description: 'RC Walls with Steel Reinforcement', unit: 'm³', qty: 0, rate: 105000, benchmark: 105000 },
                    { description: 'RC Top Slab with Reinforcement', unit: 'm³', qty: 0, rate: 105000, benchmark: 105000 },
                    { description: 'Formwork to Inner/Outer Faces', unit: 'm²', qty: 0, rate: 12500, benchmark: 12500 }
                ]
            },
            {
                id: 'headwalls',
                title: 'Section 4: HEADWALLS & WINGWALLS',
                items: [
                    { description: 'RC Headwalls (incl. Reinforcement)', unit: 'm³', qty: 0, rate: 95000, benchmark: 95000 },
                    { description: 'RC Wingwalls', unit: 'm³', qty: 0, rate: 95000, benchmark: 95000 },
                    { description: 'Apron Slab (500mm thick)', unit: 'm²', qty: 0, rate: 45000, benchmark: 45000 }
                ]
            },
            {
                id: 'backfill',
                title: 'Section 5: BACKFILLING & PROTECTION',
                items: [
                    { description: 'Selected Granular Backfill Material', unit: 'm³', qty: 0, rate: 8500, benchmark: 8500 },
                    { description: 'Compaction in 200mm Layers', unit: 'm³', qty: 0, rate: 2500, benchmark: 2500 },
                    { description: 'Rip-Rap Stone Protection', unit: 'm³', qty: 0, rate: 15000, benchmark: 15000 }
                ]
            }
        ]
    },

    [STRUCTURE_TYPES.RETAINING_WALL]: {
        icon: '🏗️',
        description: 'Gravity, Cantilever, Gabion Walls',
        sections: [
            {
                id: 'foundation',
                title: 'A. FOUNDATION WORKS',
                items: [
                    { description: 'Excavation for Foundation', unit: 'm³', qty: 0, rate: 5500, benchmark: 5500 },
                    { description: 'Blinding Concrete (1:3:6)', unit: 'm³', qty: 0, rate: 65000, benchmark: 65000 },
                    { description: 'Foundation Base Slab Concrete (Grade 30)', unit: 'm³', qty: 0, rate: 95000, benchmark: 95000 },
                    { description: 'Reinforcement in Base Slab', unit: 'kg', qty: 0, rate: 1200, benchmark: 1200 }
                ]
            },
            {
                id: 'wall',
                title: 'B. RETAINING WALL STRUCTURE',
                items: [
                    { description: 'RC Wall Stem with Reinforcement', unit: 'm³', qty: 0, rate: 110000, benchmark: 110000 },
                    { description: 'Formwork to Both Faces', unit: 'm²', qty: 0, rate: 15000, benchmark: 15000 },
                    { description: 'Counterfort/Buttress (if applicable)', unit: 'm³', qty: 0, rate: 105000, benchmark: 105000 }
                ]
            },
            {
                id: 'drainage',
                title: 'C. DRAINAGE SYSTEM',
                items: [
                    { description: 'Weep Holes (100mm PVC pipes)', unit: 'Nr', qty: 0, rate: 2500, benchmark: 2500 },
                    { description: 'Filter Layer (Gravel 50mm thick)', unit: 'm³', qty: 0, rate: 12000, benchmark: 12000 },
                    { description: 'Geotextile Filter Fabric', unit: 'm²', qty: 0, rate: 3500, benchmark: 3500 }
                ]
            },
            {
                id: 'backfill',
                title: 'D. BACKFILLING & FINISHING',
                items: [
                    { description: 'Selected Granular Backfill', unit: 'm³', qty: 0, rate: 8500, benchmark: 8500 },
                    { description: 'Compaction in Layers', unit: 'm³', qty: 0, rate: 2500, benchmark: 2500 },
                    { description: 'Coping/Capping to Top of Wall', unit: 'm', qty: 0, rate: 12500, benchmark: 12500 },
                    { description: 'Rendering/Texcoat to Exposed Face', unit: 'm²', qty: 0, rate: 5500, benchmark: 5500 }
                ]
            }
        ]
    }
};
