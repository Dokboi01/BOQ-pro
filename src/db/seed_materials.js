import { supabase } from './supabase';

const materialsToSeed = [

    // ─── BINDERS ────────────────────────────────────────────────────────────────
    {
        name: 'OPC Cement (50kg)',
        category: 'Binder',
        price: 12500,
        unit: 'Bag',
        trend: 'up',
        benchmark: 11800,
        range: '₦11,200 - ₦13,500',
        delta: '+4.2%',
        history: [11000, 11500, 11800, 12500],
        usage: 'Primary binder for all concrete works, plastering, and block making.',
        regions: { 'Lagos': 12500, 'Abuja': 13200, 'Port Harcourt': 12900, 'Kano': 13800, 'Enugu': 13000 }
    },
    {
        name: 'PPC Cement (50kg)',
        category: 'Binder',
        price: 11800,
        unit: 'Bag',
        trend: 'stable',
        benchmark: 11800,
        range: '₦11,000 - ₦12,500',
        delta: '0.0%',
        history: [11200, 11500, 11800, 11800],
        usage: 'Portland Pozzolana Cement — used for mass concrete, foundations, and coastal works.',
        regions: { 'Lagos': 11800, 'Abuja': 12400, 'Port Harcourt': 12200, 'Kano': 12800 }
    },
    {
        name: 'Hydrated Lime',
        category: 'Binder',
        price: 8500,
        unit: 'Bag',
        trend: 'stable',
        benchmark: 8500,
        range: '₦7,800 - ₦9,200',
        delta: '0.0%',
        history: [8200, 8400, 8500, 8500],
        usage: 'Used in mortar mixes for masonry, soil stabilization, and white-washing.',
        regions: { 'Lagos': 8500, 'Abuja': 9000, 'Port Harcourt': 8800 }
    },

    // ─── AGGREGATES ──────────────────────────────────────────────────────────────
    {
        name: 'Sharp Sand (Clean)',
        category: 'Aggregates',
        price: 28000,
        unit: 'Ton',
        trend: 'stable',
        benchmark: 28000,
        range: '₦26,000 - ₦30,000',
        delta: '0.0%',
        history: [27500, 28000, 28000, 28000],
        usage: 'Essential for concrete production and mortar mixes.',
        regions: { 'Lagos': 28000, 'Abuja': 30000, 'Port Harcourt': 29000, 'Ibadan': 26000 }
    },
    {
        name: 'Granite (20mm)',
        category: 'Aggregates',
        price: 35000,
        unit: 'Ton',
        trend: 'up',
        benchmark: 32000,
        range: '₦30,000 - ₦38,000',
        delta: '+3.5%',
        history: [30000, 31000, 32000, 35000],
        usage: 'Coarse aggregate for structural concrete mixing.',
        regions: { 'Lagos': 35000, 'Abuja': 37000, 'Port Harcourt': 36000, 'Ibadan': 32000 }
    },
    {
        name: 'Granite (10mm)',
        category: 'Aggregates',
        price: 36500,
        unit: 'Ton',
        trend: 'up',
        benchmark: 33500,
        range: '₦31,000 - ₦39,000',
        delta: '+2.8%',
        history: [31000, 32500, 33500, 36500],
        usage: 'Fine coarse aggregate for high-strength mixes, kerbs, and precast units.',
        regions: { 'Lagos': 36500, 'Abuja': 38000, 'Port Harcourt': 37000 }
    },
    {
        name: 'River Sand',
        category: 'Aggregates',
        price: 22000,
        unit: 'Ton',
        trend: 'down',
        benchmark: 24000,
        range: '₦20,000 - ₦26,000',
        delta: '-3.1%',
        history: [25000, 24500, 24000, 22000],
        usage: 'Plastering, block-laying mortar, and general fill material.',
        regions: { 'Lagos': 22000, 'Abuja': 24000, 'Port Harcourt': 23000, 'Ibadan': 20000 }
    },
    {
        name: 'Crushed Stone Dust (Quarry Fines)',
        category: 'Aggregates',
        price: 18000,
        unit: 'Ton',
        trend: 'stable',
        benchmark: 18000,
        range: '₦16,000 - ₦20,000',
        delta: '0.0%',
        history: [17000, 17500, 18000, 18000],
        usage: 'Sub-base compaction fill, concrete filler aggregate, and road pavement sub-grade.',
        regions: { 'Lagos': 18000, 'Abuja': 19500, 'Port Harcourt': 18500 }
    },

    // ─── METALS & STEEL ──────────────────────────────────────────────────────────
    {
        name: 'Reinforcement Steel (12mm)',
        category: 'Metal',
        price: 1150000,
        unit: 'Ton',
        trend: 'down',
        benchmark: 1200000,
        range: '₦1,120,000 - ₦1,250,000',
        delta: '-2.1%',
        history: [1250000, 1220000, 1200000, 1150000],
        usage: 'High-tensile reinforcement for structural concrete elements.',
        regions: { 'Lagos': 1150000, 'Abuja': 1180000, 'Port Harcourt': 1175000, 'Kano': 1200000 }
    },
    {
        name: 'Reinforcement Steel (16mm)',
        category: 'Metal',
        price: 1140000,
        unit: 'Ton',
        trend: 'down',
        benchmark: 1190000,
        range: '₦1,110,000 - ₦1,240,000',
        delta: '-1.8%',
        history: [1240000, 1210000, 1190000, 1140000],
        usage: 'Main structural bars for beams, columns, and slab reinforcement.',
        regions: { 'Lagos': 1140000, 'Abuja': 1170000, 'Port Harcourt': 1160000 }
    },
    {
        name: 'Reinforcement Steel (25mm)',
        category: 'Metal',
        price: 1130000,
        unit: 'Ton',
        trend: 'stable',
        benchmark: 1130000,
        range: '₦1,100,000 - ₦1,200,000',
        delta: '0.0%',
        history: [1180000, 1160000, 1130000, 1130000],
        usage: 'Heavy structural reinforcement for bridge piers, pile caps, and raft foundations.',
        regions: { 'Lagos': 1130000, 'Abuja': 1160000, 'Port Harcourt': 1150000 }
    },
    {
        name: 'BRC Welded Mesh (A252)',
        category: 'Metal',
        price: 85000,
        unit: 'Sheet',
        trend: 'up',
        benchmark: 78000,
        range: '₦75,000 - ₦92,000',
        delta: '+4.5%',
        history: [72000, 75000, 78000, 85000],
        usage: 'Slab-on-grade reinforcement, precast panels, and ground-beam mesh.',
        regions: { 'Lagos': 85000, 'Abuja': 90000, 'Port Harcourt': 88000 }
    },
    {
        name: 'Structural Steel (H-Section)',
        category: 'Metal',
        price: 1350000,
        unit: 'Ton',
        trend: 'up',
        benchmark: 1280000,
        range: '₦1,250,000 - ₦1,420,000',
        delta: '+5.2%',
        history: [1200000, 1250000, 1280000, 1350000],
        usage: 'Structural frames, portal frames, multi-storey steel structures.',
        regions: { 'Lagos': 1350000, 'Abuja': 1380000, 'Port Harcourt': 1370000 }
    },
    {
        name: 'GI Pipe (2-inch)',
        category: 'Metal',
        price: 4800,
        unit: 'Length',
        trend: 'up',
        benchmark: 4400,
        range: '₦4,200 - ₦5,200',
        delta: '+4.0%',
        history: [4000, 4200, 4400, 4800],
        usage: 'Plumbing distribution pipes, scaffolding tubes, handrail posts.',
        regions: { 'Lagos': 4800, 'Abuja': 5100, 'Port Harcourt': 4950 }
    },

    // ─── MASONRY ─────────────────────────────────────────────────────────────────
    {
        name: '9-Inch Hollow Block',
        category: 'Masonry',
        price: 650,
        unit: 'Block',
        trend: 'up',
        benchmark: 580,
        range: '₦580 - ₦720',
        delta: '+5.8%',
        history: [520, 550, 580, 650],
        usage: 'Load-bearing and non-load-bearing external and internal walls.',
        regions: { 'Lagos': 650, 'Abuja': 700, 'Port Harcourt': 680, 'Kano': 620, 'Ibadan': 600 }
    },
    {
        name: '6-Inch Hollow Block',
        category: 'Masonry',
        price: 500,
        unit: 'Block',
        trend: 'up',
        benchmark: 450,
        range: '₦440 - ₦560',
        delta: '+6.2%',
        history: [400, 420, 450, 500],
        usage: 'Partition and lightweight internal walls.',
        regions: { 'Lagos': 500, 'Abuja': 540, 'Port Harcourt': 520, 'Ibadan': 470 }
    },
    {
        name: 'Face Brick (Engineering)',
        category: 'Masonry',
        price: 380,
        unit: 'Piece',
        trend: 'stable',
        benchmark: 380,
        range: '₦350 - ₦420',
        delta: '0.0%',
        history: [360, 370, 380, 380],
        usage: 'Exposed brickwork, feature walls, and high-traffic paving.',
        regions: { 'Lagos': 380, 'Abuja': 410, 'Port Harcourt': 400 }
    },
    {
        name: 'Granite Tile (600×600mm)',
        category: 'Masonry',
        price: 7500,
        unit: 'm²',
        trend: 'up',
        benchmark: 6800,
        range: '₦6,500 - ₦8,200',
        delta: '+3.8%',
        history: [6000, 6500, 6800, 7500],
        usage: 'Floor and wall tiling for commercial and high-end residential finishes.',
        regions: { 'Lagos': 7500, 'Abuja': 8000, 'Port Harcourt': 7800 }
    },

    // ─── SURFACE & BITUMINOUS ───────────────────────────────────────────────────
    {
        name: 'Bitumen (Cold Mix)',
        category: 'Surface',
        price: 185000,
        unit: 'Drum',
        trend: 'up',
        benchmark: 172000,
        range: '₦170,000 - ₦195,000',
        delta: '+7.5%',
        history: [165000, 170000, 172000, 185000],
        usage: 'Asphaltic surface dressing for road pavements.',
        regions: { 'Lagos': 185000, 'Abuja': 192000, 'Port Harcourt': 189000 }
    },
    {
        name: 'Bitumen (60/70 Penetration Grade)',
        category: 'Surface',
        price: 178000,
        unit: 'Drum',
        trend: 'up',
        benchmark: 165000,
        range: '₦160,000 - ₦190,000',
        delta: '+6.3%',
        history: [155000, 160000, 165000, 178000],
        usage: 'Hot-mix asphalt production for wearing courses and binder courses.',
        regions: { 'Lagos': 178000, 'Abuja': 185000, 'Port Harcourt': 182000 }
    },
    {
        name: 'Asphalt Concrete (Wearing Course)',
        category: 'Surface',
        price: 48000,
        unit: 'Ton',
        trend: 'up',
        benchmark: 44000,
        range: '₦42,000 - ₦52,000',
        delta: '+4.8%',
        history: [40000, 42000, 44000, 48000],
        usage: 'Top layer of road pavement — wearing course mix for highway and urban roads.',
        regions: { 'Lagos': 48000, 'Abuja': 50000, 'Port Harcourt': 49000 }
    },
    {
        name: 'Interlocking Paving Stones (80mm)',
        category: 'Surface',
        price: 4200,
        unit: 'm²',
        trend: 'stable',
        benchmark: 4200,
        range: '₦3,900 - ₦4,600',
        delta: '0.0%',
        history: [4000, 4100, 4200, 4200],
        usage: 'Pedestrian and light-vehicle paving, estate roads, drainage channels.',
        regions: { 'Lagos': 4200, 'Abuja': 4400, 'Port Harcourt': 4300 }
    },

    // ─── EARTHWORKS ──────────────────────────────────────────────────────────────
    {
        name: 'Laterite (Filling)',
        category: 'Earthworks',
        price: 12000,
        unit: 'm³',
        trend: 'stable',
        benchmark: 12000,
        range: '₦10,000 - ₦14,000',
        delta: '0.0%',
        history: [11500, 12000, 12000, 12000],
        usage: 'Backfilling and sub-grade material for road construction.',
        regions: { 'Lagos': 12000, 'Abuja': 13000, 'Port Harcourt': 12500, 'Ibadan': 11000 }
    },
    {
        name: 'Soft Excavation (Machine)',
        category: 'Earthworks',
        price: 3500,
        unit: 'm³',
        trend: 'up',
        benchmark: 3200,
        range: '₦3,000 - ₦4,000',
        delta: '+3.2%',
        history: [2800, 3000, 3200, 3500],
        usage: 'Excavation of trenches, foundation pits, and geotechnical investigation trenches.',
        regions: { 'Lagos': 3500, 'Abuja': 3800, 'Port Harcourt': 3600 }
    },
    {
        name: 'Hard Rock Excavation (Blasting)',
        category: 'Earthworks',
        price: 12500,
        unit: 'm³',
        trend: 'stable',
        benchmark: 12000,
        range: '₦11,000 - ₦14,000',
        delta: '+1.8%',
        history: [11000, 11500, 12000, 12500],
        usage: 'Rock-cutting for foundation excavation and road cutting in hilly terrain.',
        regions: { 'Lagos': 12500, 'Abuja': 13500, 'Port Harcourt': 13000, 'Enugu': 11500 }
    },

    // ─── TIMBER & FORMWORK ───────────────────────────────────────────────────────
    {
        name: 'Plywood Formwork (18mm)',
        category: 'Timber',
        price: 8500,
        unit: 'Sheet',
        trend: 'up',
        benchmark: 7800,
        range: '₦7,500 - ₦9,500',
        delta: '+5.1%',
        history: [7000, 7500, 7800, 8500],
        usage: 'Concrete formwork for slabs, beams, columns, and walls.',
        regions: { 'Lagos': 8500, 'Abuja': 9000, 'Port Harcourt': 8800 }
    },
    {
        name: 'Hardwood Timber (2"×4"×12ft)',
        category: 'Timber',
        price: 2200,
        unit: 'Length',
        trend: 'up',
        benchmark: 1950,
        range: '₦1,800 - ₦2,500',
        delta: '+6.1%',
        history: [1700, 1800, 1950, 2200],
        usage: 'Formwork joists, roof purlin, and general carpentry works.',
        regions: { 'Lagos': 2200, 'Abuja': 2400, 'Port Harcourt': 2300 }
    },
    {
        name: 'Roofing Timber (Purlin 2"×3"×18ft)',
        category: 'Timber',
        price: 2800,
        unit: 'Length',
        trend: 'up',
        benchmark: 2500,
        range: '₦2,300 - ₦3,100',
        delta: '+5.4%',
        history: [2200, 2300, 2500, 2800],
        usage: 'Roof purlin and rafter members for timber-framed roofs.',
        regions: { 'Lagos': 2800, 'Abuja': 3000, 'Port Harcourt': 2900, 'Ibadan': 2600 }
    },

    // ─── ROOFING ─────────────────────────────────────────────────────────────────
    {
        name: 'Aluminium Long-Span Roofing (0.55mm)',
        category: 'Roofing',
        price: 3800,
        unit: 'm²',
        trend: 'up',
        benchmark: 3500,
        range: '₦3,300 - ₦4,200',
        delta: '+4.5%',
        history: [3100, 3300, 3500, 3800],
        usage: 'Industrial and commercial roofing; low-pitch roof covering.',
        regions: { 'Lagos': 3800, 'Abuja': 4000, 'Port Harcourt': 3900 }
    },
    {
        name: 'Gerard Stone-Coated Roof Tile',
        category: 'Roofing',
        price: 6500,
        unit: 'm²',
        trend: 'stable',
        benchmark: 6500,
        range: '₦6,000 - ₦7,200',
        delta: '0.0%',
        history: [6200, 6400, 6500, 6500],
        usage: 'Premium residential roofing — durable stone-coated steel tile for pitched roofs.',
        regions: { 'Lagos': 6500, 'Abuja': 6900, 'Port Harcourt': 6700 }
    },
    {
        name: 'PVC Roof Fascia & Soffit Board',
        category: 'Roofing',
        price: 4200,
        unit: 'Length',
        trend: 'stable',
        benchmark: 4000,
        range: '₦3,800 - ₦4,600',
        delta: '+1.2%',
        history: [3800, 3900, 4000, 4200],
        usage: 'Roof eave finish, gutter backing, and architectural fascia profile.',
        regions: { 'Lagos': 4200, 'Abuja': 4500, 'Port Harcourt': 4400 }
    },

    // ─── MEP (MECHANICAL / ELECTRICAL / PLUMBING) ───────────────────────────────
    {
        name: 'uPVC Pipe (4-inch, Class B)',
        category: 'MEP',
        price: 6500,
        unit: 'Length',
        trend: 'up',
        benchmark: 5900,
        range: '₦5,600 - ₦7,200',
        delta: '+5.3%',
        history: [5200, 5600, 5900, 6500],
        usage: 'Foul and storm water drainage, sewerage reticulation piping.',
        regions: { 'Lagos': 6500, 'Abuja': 6900, 'Port Harcourt': 6700 }
    },
    {
        name: 'PPR Hot & Cold Water Pipe (25mm)',
        category: 'MEP',
        price: 3200,
        unit: 'Length',
        trend: 'up',
        benchmark: 2900,
        range: '₦2,600 - ₦3,500',
        delta: '+4.8%',
        history: [2500, 2700, 2900, 3200],
        usage: 'Hot and cold water distribution, potable water supply pipework.',
        regions: { 'Lagos': 3200, 'Abuja': 3400, 'Port Harcourt': 3300 }
    },
    {
        name: 'Armoured Cable (25mm² 4-Core)',
        category: 'MEP',
        price: 22500,
        unit: 'm',
        trend: 'up',
        benchmark: 20000,
        range: '₦19,000 - ₦25,000',
        delta: '+6.2%',
        history: [18000, 19000, 20000, 22500],
        usage: 'Underground power distribution, substation feeder cables.',
        regions: { 'Lagos': 22500, 'Abuja': 24000, 'Port Harcourt': 23500 }
    },
    {
        name: 'PVC Conduit (20mm)',
        category: 'MEP',
        price: 850,
        unit: 'Length',
        trend: 'stable',
        benchmark: 850,
        range: '₦750 - ₦950',
        delta: '0.0%',
        history: [800, 820, 850, 850],
        usage: 'Chase-and-plaster wiring conduit for electrical installations.',
        regions: { 'Lagos': 850, 'Abuja': 900, 'Port Harcourt': 880 }
    },

    // ─── FINISHES ────────────────────────────────────────────────────────────────
    {
        name: 'Emulsion Paint (20L)',
        category: 'Finishes',
        price: 28500,
        unit: 'Bucket',
        trend: 'up',
        benchmark: 26000,
        range: '₦24,000 - ₦31,000',
        delta: '+3.9%',
        history: [23000, 24500, 26000, 28500],
        usage: 'Interior wall and ceiling paint finish — premium washable emulsion.',
        regions: { 'Lagos': 28500, 'Abuja': 30000, 'Port Harcourt': 29500 }
    },
    {
        name: 'Gloss Paint (Exterior, 20L)',
        category: 'Finishes',
        price: 32000,
        unit: 'Bucket',
        trend: 'up',
        benchmark: 29000,
        range: '₦27,000 - ₦35,000',
        delta: '+4.1%',
        history: [26000, 28000, 29000, 32000],
        usage: 'High-durability exterior masonry paint for external walls and facades.',
        regions: { 'Lagos': 32000, 'Abuja': 34000, 'Port Harcourt': 33000 }
    },
    {
        name: 'Ceramic Floor Tile (400×400mm)',
        category: 'Finishes',
        price: 4500,
        unit: 'm²',
        trend: 'stable',
        benchmark: 4500,
        range: '₦4,000 - ₦5,200',
        delta: '0.0%',
        history: [4200, 4400, 4500, 4500],
        usage: 'Interior floor and wall tiling for residential and light-commercial use.',
        regions: { 'Lagos': 4500, 'Abuja': 4800, 'Port Harcourt': 4700 }
    },
    {
        name: 'Gypsum Plasterboard (12.5mm)',
        category: 'Finishes',
        price: 5800,
        unit: 'Sheet',
        trend: 'up',
        benchmark: 5300,
        range: '₦5,000 - ₦6,500',
        delta: '+4.7%',
        history: [4800, 5000, 5300, 5800],
        usage: 'Dry-wall partitions, suspended ceilings, and feature wall linings.',
        regions: { 'Lagos': 5800, 'Abuja': 6200, 'Port Harcourt': 6000 }
    },
    {
        name: 'Aluminium Window Frame (Standard)',
        category: 'Finishes',
        price: 18500,
        unit: 'm²',
        trend: 'up',
        benchmark: 17000,
        range: '₦15,000 - ₦20,000',
        delta: '+5.8%',
        history: [14500, 15500, 17000, 18500],
        usage: 'Aluminium alloy casement and sliding windows for residential and commercial buildings.',
        regions: { 'Lagos': 18500, 'Abuja': 20000, 'Port Harcourt': 19500 }
    },

    // ─── WATERPROOFING ───────────────────────────────────────────────────────────
    {
        name: 'Bituminous Membrane (3mm SBS)',
        category: 'Waterproofing',
        price: 3800,
        unit: 'm²',
        trend: 'up',
        benchmark: 3400,
        range: '₦3,200 - ₦4,200',
        delta: '+5.6%',
        history: [3000, 3200, 3400, 3800],
        usage: 'Basement tanking, flat roof waterproofing, and below-slab barrier membrane.',
        regions: { 'Lagos': 3800, 'Abuja': 4100, 'Port Harcourt': 4000 }
    },
    {
        name: 'Crystalline Waterproofing Admixture (25kg)',
        category: 'Waterproofing',
        price: 45000,
        unit: 'Bag',
        trend: 'stable',
        benchmark: 45000,
        range: '₦42,000 - ₦49,000',
        delta: '0.0%',
        history: [43000, 44000, 45000, 45000],
        usage: 'Integral concrete waterproofing for water tanks, retaining walls, and basements.',
        regions: { 'Lagos': 45000, 'Abuja': 48000, 'Port Harcourt': 47000 }
    },
    {
        name: 'Polyurethane Sealant (600ml)',
        category: 'Waterproofing',
        price: 4200,
        unit: 'Cartridge',
        trend: 'stable',
        benchmark: 4000,
        range: '₦3,800 - ₦4,600',
        delta: '+1.0%',
        history: [3800, 3900, 4000, 4200],
        usage: 'Joint sealing, expansion joints, and caulking in concrete and masonry.',
        regions: { 'Lagos': 4200, 'Abuja': 4500, 'Port Harcourt': 4400 }
    },

    // ─── SPECIALIST / GEOTECHNICAL ───────────────────────────────────────────────
    {
        name: 'Precast Concrete Pile (300mm)',
        category: 'Geotechnical',
        price: 85000,
        unit: 'm',
        trend: 'up',
        benchmark: 78000,
        range: '₦74,000 - ₦92,000',
        delta: '+5.3%',
        history: [70000, 74000, 78000, 85000],
        usage: 'Foundation piling for bridges, high-rise buildings, and soft-ground structures.',
        regions: { 'Lagos': 85000, 'Abuja': 90000, 'Port Harcourt': 88000 }
    },
    {
        name: 'Geotextile Non-Woven Fabric (200g)',
        category: 'Geotechnical',
        price: 850,
        unit: 'm²',
        trend: 'stable',
        benchmark: 820,
        range: '₦780 - ₦950',
        delta: '+0.8%',
        history: [800, 810, 820, 850],
        usage: 'Separation and filtration layer in road sub-base, embankments, and retaining walls.',
        regions: { 'Lagos': 850, 'Abuja': 900, 'Port Harcourt': 880 }
    },
    {
        name: 'Gabion Basket (2m×1m×1m)',
        category: 'Geotechnical',
        price: 28000,
        unit: 'Unit',
        trend: 'stable',
        benchmark: 28000,
        range: '₦25,000 - ₦32,000',
        delta: '0.0%',
        history: [26000, 27000, 28000, 28000],
        usage: 'Riverbank protection, erosion control, retaining walls, and slope stabilization.',
        regions: { 'Lagos': 28000, 'Abuja': 30000, 'Port Harcourt': 29000 }
    },
];

const indicesToSeed = [
    { label: 'Overall CMCI', val: 148.3, delta: '+2.1%', trend: 'up' },
    { label: 'Binder Index', val: 156.2, delta: '+3.2%', trend: 'up' },
    { label: 'Metal Index', val: 128.9, delta: '-0.8%', trend: 'down' },
    { label: 'Aggregates', val: 115.4, delta: '+0.2%', trend: 'up' },
    { label: 'Masonry Index', val: 138.7, delta: '+5.5%', trend: 'up' },
    { label: 'Surface & Roads', val: 162.4, delta: '+6.8%', trend: 'up' },
    { label: 'MEP Index', val: 134.1, delta: '+3.7%', trend: 'up' },
    { label: 'Finishes Index', val: 122.9, delta: '+1.9%', trend: 'up' },
];

export const seedMarketData = async () => {
    console.log('🚀 Starting Market Data Seed...');
    try {
        // Seed Materials
        const { error: matError } = await supabase
            .from('materials')
            .upsert(materialsToSeed, { onConflict: 'name' });

        if (matError) {
            console.error('❌ Materials seed error:', matError.message, '| Code:', matError.code, '| Hint:', matError.hint, '| Details:', matError.details);
            throw matError;
        }
        console.log(`✅ ${materialsToSeed.length} materials seeded successfully.`);

        // Seed Indices
        const { error: idxError } = await supabase
            .from('market_indices')
            .upsert(indicesToSeed, { onConflict: 'label' });

        if (idxError) {
            console.error('❌ Indices seed error:', idxError.message, '| Code:', idxError.code, '| Hint:', idxError.hint, '| Details:', idxError.details);
            throw idxError;
        }
        console.log(`✅ ${indicesToSeed.length} market indices seeded successfully.`);

        return true;
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        return { error: err.message || JSON.stringify(err) };
    }
};
