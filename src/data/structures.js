export const STRUCTURE_TYPES = {
    RESIDENTIAL: 'Residential Building',
    ROAD: 'Road Construction',
    BRIDGE: 'Bridge / Flyover',
    CULVERT: 'Box Culvert',
    RETAINING_WALL: 'Retaining Wall',
    COMMERCIAL: 'Commercial Building'
};

export const STRUCTURE_DATA = {
    [STRUCTURE_TYPES.RESIDENTIAL]: {
        sections: [
            {
                id: 'prelims',
                title: 'A. PRELIMINARIES',
                items: [
                    { description: 'Project Signboard', unit: 'Nr', qty: 1, rate: 25000, benchmark: 25000 },
                    { description: 'Temporary Site Office', unit: 'Sum', qty: 1, rate: 350000, benchmark: 350000 },
                    { description: 'Hoarding & Site Security', unit: 'Sum', qty: 1, rate: 150000, benchmark: 150000 }
                ]
            },
            {
                id: 'substructure',
                title: 'B. SUBSTRUCTURE (UP TO DPC)',
                items: [
                    { description: 'Excavation for column bases not exceeding 1.5m deep', unit: 'm3', qty: 45, rate: 6500, benchmark: 6500 },
                    { description: 'Plain Concrete (1:3:6) in foundations', unit: 'm3', qty: 12, rate: 75000, benchmark: 75000 },
                    { description: 'Reinforced Concrete (1:2:4) in bases', unit: 'm3', qty: 15, rate: 95000, benchmark: 95000 },
                    { description: '225mm Hollow Sandcrete Blockwork in foundation', unit: 'm2', qty: 120, rate: 8500, benchmark: 8500 }
                ]
            },
            {
                id: 'superstructure',
                title: 'C. SUPERSTRUCTURE',
                items: [
                    { description: 'Reinforced Concrete (1:2:4) in Columns', unit: 'm3', qty: 8, rate: 105000, benchmark: 105000 },
                    { description: 'Reinforced Concrete (1:2:4) in Lintels & Beams', unit: 'm3', qty: 5, rate: 105000, benchmark: 105000 },
                    { description: '225mm Hollow Sandcrete Blockwork', unit: 'm2', qty: 250, rate: 9500, benchmark: 9500 }
                ]
            }
        ]
    },
    [STRUCTURE_TYPES.ROAD]: {
        sections: [
            {
                id: 'prelims',
                title: '100. PRELIMINARIES',
                items: [
                    { description: 'Mobilization & Demobilization', unit: 'Sum', qty: 1, rate: 2500000, benchmark: 2500000 },
                    { description: 'Site Survey & Setting Out', unit: 'km', qty: 1, rate: 450000, benchmark: 450000 }
                ]
            },
            {
                id: 'earthworks',
                title: '200. EARTHWORKS',
                items: [
                    { description: 'Site Clearance and removal of vegetable soil', unit: 'm2', qty: 10000, rate: 450, benchmark: 450 },
                    { description: 'Scarification of existing pavement', unit: 'm2', qty: 8500, rate: 350, benchmark: 350 },
                    { description: 'Borrow Fill G15 Material in subgrade', unit: 'm3', qty: 2500, rate: 8500, benchmark: 8500 }
                ]
            },
            {
                id: 'pavement',
                title: '400. PAVEMENT & SURFACING',
                items: [
                    { description: 'Crushed Rock Base Course (200mm)', unit: 'm3', qty: 1500, rate: 28000, benchmark: 28000 },
                    { description: 'Asphaltic Concrete Binder Course (60mm)', unit: 'm2', qty: 7500, rate: 14500, benchmark: 14500 },
                    { description: 'Asphaltic Concrete Wearing Course (40mm)', unit: 'm2', qty: 7500, rate: 11000, benchmark: 11000 }
                ]
            }
        ]
    },
    [STRUCTURE_TYPES.BRIDGE]: {
        sections: [
            {
                id: 'piling',
                title: 'SERIES 1600. PILING & EMBEDDED RETAINING WALLS',
                items: [
                    { description: 'Bored Cast-in-place Piles (800mm dia)', unit: 'm', qty: 450, rate: 250000, benchmark: 250000 },
                    { description: 'Reinforcement Steel in Piles (High Tensile)', unit: 'Ton', qty: 45, rate: 1450000, benchmark: 1450000 }
                ]
            },
            {
                id: 'concrete',
                title: 'SERIES 1700. STRUCTURAL CONCRETE',
                items: [
                    { description: 'Concrete Grade C35/45 in Abutments', unit: 'm3', qty: 120, rate: 155000, benchmark: 155000 },
                    { description: 'Concrete Grade C35/45 in Bridge Deck', unit: 'm3', qty: 350, rate: 165000, benchmark: 165000 },
                    { description: 'Formwork to F3 Finish', unit: 'm2', qty: 850, rate: 18500, benchmark: 18500 }
                ]
            }
        ]
    },
    [STRUCTURE_TYPES.CULVERT]: {
        sections: [
            {
                id: 'excavation',
                title: 'Section 1: EXCAVATION & EARTHWORKS',
                items: [
                    { description: 'Excavation in soft material 0-1.5m deep', unit: 'm3', qty: 250, rate: 4500, benchmark: 4500 },
                    { description: 'Imported Granular Backfill', unit: 'm3', qty: 120, rate: 12500, benchmark: 12500 }
                ]
            },
            {
                id: 'concrete',
                title: 'Section 2: REINFORCED CONCRETE WORKS',
                items: [
                    { description: 'Concrete Grade C25/30 in base slab', unit: 'm3', qty: 85, rate: 95000, benchmark: 95000 },
                    { description: 'Concrete Grade C25/30 in walls & top slab', unit: 'm3', qty: 110, rate: 105000, benchmark: 105000 },
                    { description: 'High tensile reinforcement (12mm-20mm)', unit: 'Ton', qty: 18, rate: 1450000, benchmark: 1450000 }
                ]
            }
        ]
    },
    [STRUCTURE_TYPES.RETAINING_WALL]: {
        sections: [
            {
                id: 'earthworks',
                title: 'A. EARTHWORKS',
                items: [
                    { description: 'Excavation for wall foundation', unit: 'm3', qty: 350, rate: 5500, benchmark: 5500 },
                    { description: 'Compacted laterite backfill behind wall', unit: 'm3', qty: 500, rate: 7500, benchmark: 7500 }
                ]
            },
            {
                id: 'structure',
                title: 'B. REINFORCED CONCRETE STRUCTURE',
                items: [
                    { description: 'Concrete Grade C30 in Base & Stem', unit: 'm3', qty: 220, rate: 115000, benchmark: 115000 },
                    { description: 'Reinforcement bars (Y12, Y16, Y20)', unit: 'Ton', qty: 24, rate: 1450000, benchmark: 1450000 },
                    { description: 'Rough finish formwork to buried surfaces', unit: 'm2', qty: 450, rate: 12500, benchmark: 12500 },
                    { description: 'Fair face formwork to exposed surfaces', unit: 'm2', qty: 380, rate: 18500, benchmark: 18500 }
                ]
            }
        ]
    },
    [STRUCTURE_TYPES.COMMERCIAL]: {
        sections: [
            {
                id: 'prelims',
                title: 'A. PRELIMINARIES & GENERAL',
                items: [
                    { description: 'Insurance of the Works and Third Party', unit: 'Sum', qty: 1, rate: 1200000, benchmark: 1200000 },
                    { description: 'Hoarding & Site Security Lighting', unit: 'Sum', qty: 1, rate: 450000, benchmark: 450000 },
                    { description: 'Project Management & Consultancy Fees', unit: 'Sum', qty: 1, rate: 5000000, benchmark: 5000000 }
                ]
            },
            {
                id: 'substructure',
                title: 'B. FOUNDATION & SUBSTRUCTURE',
                items: [
                    { description: 'Excavation for large raft foundation', unit: 'm3', qty: 1200, rate: 5500, benchmark: 5500 },
                    { description: 'Concrete Grade C30 in Raft Slab', unit: 'm3', qty: 450, rate: 105000, benchmark: 105000 },
                    { description: 'Waterproofing membrane to raft foundation', unit: 'm2', qty: 850, rate: 4500, benchmark: 4500 }
                ]
            },
            {
                id: 'superstructure',
                title: 'C. REINFORCED CONCRETE FRAME',
                items: [
                    { description: 'Reinforced Concrete (1:2:4) in Suspended Slabs', unit: 'm3', qty: 320, rate: 125000, benchmark: 125000 },
                    { description: 'Reinforced Concrete (1:2:4) in Lift Shaft walls', unit: 'm3', qty: 110, rate: 135000, benchmark: 135000 },
                    { description: 'Formwork to suspended soffits', unit: 'm2', qty: 1500, rate: 16500, benchmark: 16500 }
                ]
            }
        ]
    }
};
