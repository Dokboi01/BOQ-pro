/**
 * BOQ Pro — Engineering Rate Breakdown Engine
 * Maps each BOQ item description to its correct materials, labour, and plant
 * based on Nigerian construction market standards (2025/2026).
 *
 * Resolution order:
 *  1. Exact description keyword match (most specific)
 *  2. Section/category fallback (e.g. "all concrete in substructure")
 *  3. Structure-type default
 */

// ─── LABOUR POOL (shared across breakdowns) ────────────────────────────────

const LABOUR = {
    mason: { name: 'Mason / Blocklayer', unit: 'Day', rate: 8000 },
    concreteMixer: { name: 'Concrete Finisher', unit: 'Day', rate: 7500 },
    steel_fixer: { name: 'Steel Fixer / Bender', unit: 'Day', rate: 8500 },
    carpenter: { name: 'Carpenter / Formworker', unit: 'Day', rate: 8500 },
    tiler: { name: 'Tiler (Floor/Wall)', unit: 'Day', rate: 8000 },
    painter: { name: 'Painter (Skilled)', unit: 'Day', rate: 6500 },
    plumber: { name: 'Plumber (Skilled)', unit: 'Day', rate: 9000 },
    electrician: { name: 'Electrician (Skilled)', unit: 'Day', rate: 9500 },
    general: { name: 'General Labour', unit: 'Day', rate: 4500 },
    driver: { name: 'Plant Operator / Driver', unit: 'Day', rate: 10000 },
    welder: { name: 'Welder / Fabricator', unit: 'Day', rate: 10000 },
    pipelayer: { name: 'Pipe Layer (Civil)', unit: 'Day', rate: 7500 },
    road_ganger: { name: 'Road Ganger (Foreman)', unit: 'Day', rate: 12000 },
    surveyor: { name: 'Site Surveyor / Engineer', unit: 'Day', rate: 25000 },
    roofing: { name: 'Roofing Specialist', unit: 'Day', rate: 9000 },
};

// ─── PLANT POOL ────────────────────────────────────────────────────────────

const PLANT = {
    concreteMixer: { name: 'Concrete Mixer (350L)', unit: 'Day', rate: 15000 },
    vibrator: { name: 'Poker Vibrator', unit: 'Day', rate: 5000 },
    excavator: { name: 'Excavator (0.3m³)', unit: 'Day', rate: 125000 },
    roller: { name: 'Smooth Drum Roller (8T)', unit: 'Day', rate: 95000 },
    gradingMachine: { name: 'Motor Grader', unit: 'Day', rate: 120000 },
    dumpTruck: { name: 'Dump Truck (10T)', unit: 'Day', rate: 55000 },
    crane: { name: 'Mobile Crane (20T)', unit: 'Day', rate: 280000 },
    generator: { name: 'Generator (25KVA)', unit: 'Day', rate: 18000 },
    scaffolding: { name: 'Scaffolding (Erect/Strike)', unit: 'Day', rate: 25000 },
    pileRig: { name: 'Piling Rig', unit: 'Day', rate: 350000 },
    asphaltLayer: { name: 'Asphalt Paving Machine', unit: 'Day', rate: 200000 },
    waterTanker: { name: 'Water Tanker', unit: 'Day', rate: 40000 },
    compactor: { name: 'Plate Compactor (Hand)', unit: 'Day', rate: 12000 },
    pump: { name: 'Submersible Water Pump', unit: 'Day', rate: 18000 },
    formwork: { name: 'Steel Formwork (Hire)', unit: 'Day', rate: 20000 },
};

// ─── HELPER ────────────────────────────────────────────────────────────────

const id = () => Date.now() + Math.floor(Math.random() * 10000);

const labour = (key, qty) => ({ id: id(), ...LABOUR[key], qty });
const plant = (key, qty) => ({ id: id(), ...PLANT[key], qty });
const mat = (name, qty, unit, rate) => ({ id: id(), name, qty, unit, rate });

// ─── BREAKDOWN DEFINITIONS PER ITEM TYPE ──────────────────────────────────
// Each entry has: keywords[], materials[], labor[], plant[]

const BREAKDOWNS = [

    // ══════════════════════════════════════════════════════════
    // CONCRETE WORKS (all types)
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['blinding', 'concrete 1:3:6', 'lean concrete'],
        materials: [
            mat('OPC Cement (50kg)', 4.5, 'Bags', 12500),
            mat('Sharp Sand', 0.45, 'm³', 22000),
            mat('Granite (20mm)', 0.9, 'm³', 35000),
            mat('Water', 200, 'L', 50),
        ],
        labor: [labour('concreteMixer', 0.5), labour('general', 1)],
        plant: [plant('concreteMixer', 0.1), plant('vibrator', 0.1)],
    },
    {
        keywords: ['strip foundation', 'column base', 'pad foundation', 'concrete 1:2:4', 'structural concrete grade 25', 'grade c25'],
        materials: [
            mat('OPC Cement (50kg)', 7, 'Bags', 12500),
            mat('Sharp Sand', 0.45, 'm³', 22000),
            mat('Granite (20mm)', 0.9, 'm³', 35000),
            mat('Water', 250, 'L', 50),
            mat('Curing Compound', 0.5, 'L', 4500),
        ],
        labor: [labour('concreteMixer', 1), labour('general', 2)],
        plant: [plant('concreteMixer', 0.2), plant('vibrator', 0.2)],
    },
    {
        keywords: ['grade 30', 'grade c30', 'grade 35', 'grade c35', 'grade c35/45', 'grade c35/45', 'high performance', 'hpc', 'raft foundation', 'pile cap', 'ground beam', 'reinforced concrete', 'rc slab', 'suspended slab', 'floor slab', 'bridge deck', 'abutment'],
        materials: [
            mat('OPC Cement (50kg)', 8, 'Bags', 12500),
            mat('Sharp Sand', 0.4, 'm³', 22000),
            mat('Granite (10mm)', 0.85, 'm³', 36500),
            mat('Water (potable)', 250, 'L', 50),
            mat('Admixture (plasticiser)', 0.5, 'L', 3500),
            mat('Curing Membrane', 0.5, 'L', 4500),
        ],
        labor: [labour('concreteMixer', 1.5), labour('steel_fixer', 1), labour('general', 2)],
        plant: [plant('concreteMixer', 0.3), plant('vibrator', 0.3), plant('generator', 0.1)],
    },
    {
        keywords: ['column', 'beam', 'lintel'],
        materials: [
            mat('OPC Cement (50kg)', 8, 'Bags', 12500),
            mat('Sharp Sand', 0.4, 'm³', 22000),
            mat('Granite (10mm)', 0.85, 'm³', 36500),
            mat('Water', 200, 'L', 50),
        ],
        labor: [labour('concreteMixer', 1), labour('carpenter', 1), labour('steel_fixer', 1), labour('general', 2)],
        plant: [plant('concreteMixer', 0.3), plant('vibrator', 0.25), plant('formwork', 1)],
    },

    // ══════════════════════════════════════════════════════════
    // REINFORCEMENT STEEL
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['reinforcement', 'brc mesh', 'high yield steel', 'high tensile', 'steel bar', 'rebar', 'y12', 'y16', 'y25', 'r10'],
        materials: [
            mat('Reinforcement Steel (16mm)', 1050, 'kg', 1140),
            mat('Binding Wire (annealed)', 15, 'kg', 850),
            mat('Bar Spacers (plastic)', 50, 'Nr', 120),
        ],
        labor: [labour('steel_fixer', 1.5), labour('general', 1)],
        plant: [plant('generator', 0.1)],
    },

    // ══════════════════════════════════════════════════════════
    // FORMWORK / SHUTTERING
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['formwork', 'shuttering', 'falsework'],
        materials: [
            mat('Plywood Formwork (18mm)', 0.12, 'Sheet', 8500),
            mat('Hardwood Timber (2"×4")', 0.5, 'Length', 2200),
            mat('Nails (75mm)', 0.2, 'kg', 600),
            mat('Release Agent / Oil', 0.5, 'L', 1200),
        ],
        labor: [labour('carpenter', 1.2), labour('general', 0.5)],
        plant: [],
    },

    // ══════════════════════════════════════════════════════════
    // MASONRY — BLOCK WALLS
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['225mm', 'sandcrete block', 'hollow block', '225 block', '9-inch', 'nine inch'],
        materials: [
            mat('9-Inch Hollow Block', 12.5, 'Block', 650),
            mat('OPC Cement (50kg)', 1.2, 'Bags', 12500),
            mat('Sharp Sand', 0.07, 'm³', 22000),
            mat('Water', 50, 'L', 50),
        ],
        labor: [labour('mason', 1), labour('general', 0.5)],
        plant: [],
    },
    {
        keywords: ['150mm block', '6 inch block', 'partition block', '150mm sandcrete', '6-inch'],
        materials: [
            mat('6-Inch Hollow Block', 14, 'Block', 500),
            mat('OPC Cement (50kg)', 0.9, 'Bags', 12500),
            mat('Sharp Sand', 0.05, 'm³', 22000),
            mat('Water', 40, 'L', 50),
        ],
        labor: [labour('mason', 0.8), labour('general', 0.4)],
        plant: [],
    },

    // ══════════════════════════════════════════════════════════
    // ROOFING
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['long span', 'alumin', 'roofing sheet', 'iron sheet', 'corrugated'],
        materials: [
            mat('Aluminium Long-Span Roofing (0.55mm)', 1.1, 'm²', 3800),
            mat('Self-Drilling Roofing Screws', 10, 'Nr', 120),
            mat('Ridge Cap (Aluminium)', 0.1, 'm', 3500),
            mat('Roofing Felt/Underlay', 1.1, 'm²', 500),
        ],
        labor: [labour('roofing', 0.5), labour('general', 0.3)],
        plant: [],
    },
    {
        keywords: ['stone coated', 'gerard', 'stone-coated'],
        materials: [
            mat('Gerard Stone-Coated Roof Tile', 1.1, 'm²', 6500),
            mat('Roofing Felt (15lb)', 1.1, 'm²', 500),
            mat('Roofing Battens (treated)', 4, 'm', 600),
            mat('Roofing Screws (stainless)', 12, 'Nr', 150),
        ],
        labor: [labour('roofing', 0.7), labour('general', 0.3)],
        plant: [],
    },
    {
        keywords: ['roof truss', 'purlin', 'rafter', 'hardwood timber roof'],
        materials: [
            mat('Roofing Timber (Purlin 2"×3"×18ft)', 0.8, 'Length', 2800),
            mat('Hardwood Timber (2"×4"×12ft)', 0.5, 'Length', 2200),
            mat('Nails (Round Wire, 100mm)', 0.3, 'kg', 600),
            mat('Wood Preservative (Cuprinol)', 0.2, 'L', 2500),
        ],
        labor: [labour('carpenter', 1), labour('general', 0.5)],
        plant: [],
    },

    // ══════════════════════════════════════════════════════════
    // FINISHES — PLASTERING
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['plaster', 'render', 'screeding', 'sand and cement plaster'],
        materials: [
            mat('OPC Cement (50kg)', 0.4, 'Bags', 12500),
            mat('River Sand', 0.05, 'm³', 22000),
            mat('Water', 30, 'L', 50),
            mat('Bonding SBR Liquid', 0.1, 'L', 2800),
        ],
        labor: [labour('mason', 0.5), labour('general', 0.2)],
        plant: [],
    },

    // ══════════════════════════════════════════════════════════
    // FINISHES — TILING
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['floor tile', 'vitrified', 'ceramic tile', 'granite tile', 'porcelain', 'wall tile'],
        materials: [
            mat('Granite Tile (600×600mm)', 1.05, 'm²', 7500),
            mat('OPC Cement (50kg)', 0.4, 'Bags', 12500),
            mat('River Sand', 0.05, 'm³', 22000),
            mat('Tile Adhesive (25kg)', 0.5, 'Bag', 4500),
            mat('Tile Grout (2kg)', 0.2, 'Bag', 1800),
        ],
        labor: [labour('tiler', 0.8), labour('general', 0.3)],
        plant: [],
    },

    // ══════════════════════════════════════════════════════════
    // FINISHES — PAINTING
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['emulsion paint', 'internal paint', 'internal wall paint', 'ceiling paint', 'pop ceiling'],
        materials: [
            mat('Emulsion Paint (20L)', 0.12, 'Bucket', 28500),
            mat('Primer (5L)', 0.05, 'Tin', 8500),
            mat('Sandpaper (120 grit)', 0.3, 'Sheet', 250),
            mat('Paint Roller & Tray', 0.1, 'Set', 2500),
        ],
        labor: [labour('painter', 0.6), labour('general', 0.2)],
        plant: [],
    },
    {
        keywords: ['external paint', 'gloss paint', 'weather shield', 'texcote', 'acrylic'],
        materials: [
            mat('Gloss Paint (Exterior, 20L)', 0.14, 'Bucket', 32000),
            mat('Primer/Sealer (5L)', 0.06, 'Tin', 9000),
            mat('Sandpaper (80 grit)', 0.3, 'Sheet', 250),
        ],
        labor: [labour('painter', 0.7), labour('general', 0.2)],
        plant: [plant('scaffolding', 0.3)],
    },

    // ══════════════════════════════════════════════════════════
    // WATERPROOFING
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['waterproof', 'bituminous', 'membrane', 'tanking', 'sbs', 'app membrane', 'damp proof'],
        materials: [
            mat('Bituminous Membrane (3mm SBS)', 1.1, 'm²', 3800),
            mat('Primer (Bituminous)', 0.2, 'L', 2200),
            mat('Gas Torch (rental)', 0.05, 'Day', 5000),
        ],
        labor: [labour('mason', 0.5), labour('general', 0.2)],
        plant: [],
    },
    {
        keywords: ['crystalline', 'waterproofing admixture', 'integral waterproof'],
        materials: [
            mat('Crystalline Waterproofing Admixture (25kg)', 0.5, 'Bag', 45000),
            mat('OPC Cement (50kg)', 0.3, 'Bags', 12500),
            mat('Water', 30, 'L', 50),
        ],
        labor: [labour('mason', 0.4), labour('general', 0.2)],
        plant: [],
    },

    // ══════════════════════════════════════════════════════════
    // ROAD — EARTHWORKS
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['site clearance', 'vegetation removal', 'topsoil removal', 'scarification', 'strip'],
        materials: [
            mat('Diesel (excavator)', 8, 'L', 1100),
            mat('Herbicide/Weedicide', 0.2, 'L', 4500),
        ],
        labor: [labour('general', 0.1), labour('driver', 0.1)],
        plant: [plant('excavator', 0.05), plant('dumpTruck', 0.05)],
    },
    {
        keywords: ['excavation', 'cut to spoil', 'earthwork', 'borrow pit', 'borrow fill', 'subgrade', 'filling'],
        materials: [
            mat('Laterite (Filling)', 1.3, 'm³', 12000),
            mat('Diesel (plant fuel)', 15, 'L', 1100),
        ],
        labor: [labour('driver', 1), labour('general', 0.5)],
        plant: [plant('excavator', 0.3), plant('dumpTruck', 0.5), plant('compactor', 0.2), plant('waterTanker', 0.1)],
    },

    // ══════════════════════════════════════════════════════════
    // ROAD — PAVEMENT
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['base course', 'sub-base', 'crushed rock base', 'granular base', 'gravel base'],
        materials: [
            mat('Granite (20mm)', 1.4, 'm³', 35000),
            mat('Crushed Stone Dust (Quarry Fines)', 0.3, 'm³', 18000),
            mat('Water (compaction)', 200, 'L', 50),
        ],
        labor: [labour('road_ganger', 0.2), labour('driver', 0.5)],
        plant: [plant('gradingMachine', 0.2), plant('roller', 0.3), plant('waterTanker', 0.1)],
    },
    {
        keywords: ['binder course', 'wearing course', 'asphaltic concrete', 'asphalt', 'bituminous surface'],
        materials: [
            mat('Asphalt Concrete (Wearing Course)', 1.05, 'Ton', 48000),
            mat('Bitumen (60/70 Penetration Grade)', 0.06, 'Drum', 178000),
            mat('Diesel (paving machine)', 12, 'L', 1100),
        ],
        labor: [labour('road_ganger', 0.3), labour('driver', 1)],
        plant: [plant('asphaltLayer', 0.5), plant('roller', 0.5)],
    },
    {
        keywords: ['prime coat', 'tack coat', 'bituminous primer', 'mc-30', 'rc-70'],
        materials: [
            mat('Bitumen (Cold Mix)', 0.02, 'Drum', 185000),
            mat('Diesel (sprayer)', 5, 'L', 1100),
        ],
        labor: [labour('road_ganger', 0.2), labour('driver', 0.3)],
        plant: [plant('waterTanker', 0.3)],
    },
    {
        keywords: ['interlocking pav', 'block paving', 'cobblestone', 'kerb'],
        materials: [
            mat('Interlocking Paving Stones (80mm)', 1.05, 'm²', 4200),
            mat('Sharp Sand (bedding)', 0.05, 'm³', 22000),
            mat('OPC Cement (pointing)', 0.2, 'Bags', 12500),
        ],
        labor: [labour('mason', 0.5), labour('general', 0.3)],
        plant: [plant('compactor', 0.1)],
    },

    // ══════════════════════════════════════════════════════════
    // DRAINAGE
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['u-drain', 'drain channel', 'drainage channel', 'u-channel', 'concrete drain'],
        materials: [
            mat('OPC Cement (50kg)', 8, 'Bags', 12500),
            mat('Sharp Sand', 0.5, 'm³', 22000),
            mat('Granite (20mm)', 1.0, 'm³', 35000),
            mat('Reinforcement Steel (12mm)', 15, 'kg', 1150),
        ],
        labor: [labour('mason', 1), labour('concreteMixer', 1), labour('general', 2)],
        plant: [plant('concreteMixer', 0.2), plant('vibrator', 0.2)],
    },
    {
        keywords: ['manhole', 'catch pit', 'inspection chamber'],
        materials: [
            mat('OPC Cement (50kg)', 18, 'Bags', 12500),
            mat('Sharp Sand', 1.2, 'm³', 22000),
            mat('Granite (20mm)', 2.0, 'm³', 35000),
            mat('Reinforcement Steel (12mm)', 80, 'kg', 1150),
            mat('Cast Iron Cover Frame', 1, 'Nr', 55000),
        ],
        labor: [labour('mason', 3), labour('steel_fixer', 1), labour('general', 3)],
        plant: [plant('concreteMixer', 0.5), plant('vibrator', 0.3)],
    },
    {
        keywords: ['uPVC pipe', 'precast pipe', 'sewage pipe', 'drain pipe', 'pipe culvert'],
        materials: [
            mat('uPVC Pipe (4-inch, Class B)', 1.05, 'Length', 6500),
            mat('uPVC Junction/Coupler', 0.1, 'Nr', 3500),
            mat('Granular Bedding Material', 0.2, 'm³', 18000),
            mat('OPC Cement (pointing)', 0.5, 'Bags', 12500),
        ],
        labor: [labour('pipelayer', 0.5), labour('general', 0.5)],
        plant: [plant('excavator', 0.1)],
    },

    // ══════════════════════════════════════════════════════════
    // PILING
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['bored pile', 'precast pile', 'piling', 'pile'],
        materials: [
            mat('OPC Cement (50kg)', 12, 'Bags', 12500),
            mat('Sharp Sand', 0.6, 'm³', 22000),
            mat('Granite (10mm)', 1.2, 'm³', 36500),
            mat('Reinforcement Steel (25mm)', 85, 'kg', 1130),
            mat('Bentonite Slurry (50kg)', 2, 'Bag', 8500),
        ],
        labor: [labour('concreteMixer', 2), labour('steel_fixer', 2), labour('driver', 1)],
        plant: [plant('pileRig', 1), plant('concreteMixer', 0.5), plant('vibrator', 0.3), plant('pump', 0.5)],
    },

    // ══════════════════════════════════════════════════════════
    // STRUCTURAL STEEL
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['structural steel', 'steel truss', 'h-section', 'i-beam', 'hot rolled', 'steel frame', 'steel column', 'steel beam', 'steel roof truss', 'fabricat'],
        materials: [
            mat('Structural Steel (H-Section)', 1050, 'kg', 1350),
            mat('Welding Electrodes (3.2mm)', 5, 'Pkt', 4500),
            mat('Anti-Rust Primer Paint', 0.5, 'L', 3500),
            mat('Bolts, Nuts & Washers (M20)', 8, 'Nr', 800),
        ],
        labor: [labour('welder', 2), labour('general', 1)],
        plant: [plant('crane', 0.3), plant('generator', 0.5)],
    },

    // ══════════════════════════════════════════════════════════
    // MEP — PLUMBING
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['plumbing', 'sanitary', 'water supply', 'ppr pipe', 'hot and cold', 'water pipe'],
        materials: [
            mat('PPR Hot & Cold Water Pipe (25mm)', 1.1, 'Length', 3200),
            mat('PPR Fittings (Elbows, Tees)', 3, 'Nr', 1800),
            mat('Thread Sealant (PTFE Tape)', 2, 'Roll', 350),
            mat('GI Pipe (2-inch)', 0.5, 'Length', 4800),
        ],
        labor: [labour('plumber', 1), labour('general', 0.5)],
        plant: [],
    },

    // ══════════════════════════════════════════════════════════
    // MEP — ELECTRICAL
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['electrical', 'wiring', 'cable', 'conduit', 'armoured cable', 'power cable'],
        materials: [
            mat('Armoured Cable (25mm² 4-Core)', 1.05, 'm', 22500),
            mat('PVC Conduit (20mm)', 2.5, 'Length', 850),
            mat('Cable Ties & Clips', 10, 'Nr', 80),
            mat('Junction Box (4-way)', 0.5, 'Nr', 2500),
        ],
        labor: [labour('electrician', 1), labour('general', 0.5)],
        plant: [],
    },

    // ══════════════════════════════════════════════════════════
    // GEOTECHNICAL
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['gabion', 'rip-rap', 'stone protection', 'erosion'],
        materials: [
            mat('Gabion Basket (2m×1m×1m)', 1, 'Unit', 28000),
            mat('Granite (Random Rock)', 1.2, 'm³', 32000),
            mat('Galvanized Wire (for ties)', 0.5, 'kg', 1800),
        ],
        labor: [labour('mason', 1), labour('general', 2)],
        plant: [plant('excavator', 0.1)],
    },
    {
        keywords: ['geotextile', 'filter fabric', 'non-woven', 'separation layer'],
        materials: [
            mat('Geotextile Non-Woven Fabric (200g)', 1.05, 'm²', 850),
            mat('Overlapping & Pins', 0.1, 'm²', 200),
        ],
        labor: [labour('general', 0.1)],
        plant: [],
    },
    {
        keywords: ['backfilling', 'granular backfill', 'selected fill', 'compaction in layer'],
        materials: [
            mat('Laterite (Filling)', 1.25, 'm³', 12000),
            mat('Water (compaction)', 100, 'L', 50),
        ],
        labor: [labour('general', 0.5), labour('driver', 0.2)],
        plant: [plant('compactor', 0.3), plant('waterTanker', 0.1)],
    },

    // ══════════════════════════════════════════════════════════
    // WINDOWS & DOORS
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['aluminium window', 'casement window', 'glass window', 'sliding window'],
        materials: [
            mat('Aluminium Window Frame (Standard)', 1.05, 'm²', 18500),
            mat('6mm Float Glass', 1.0, 'm²', 8500),
            mat('Silicon Sealant (310ml)', 2, 'Cartridge', 2500),
            mat('Window Fittings (handles/hinges)', 1, 'Set', 3500),
        ],
        labor: [labour('carpenter', 0.6), labour('general', 0.2)],
        plant: [],
    },

    // ══════════════════════════════════════════════════════════
    // EXTERNAL WORKS
    // ══════════════════════════════════════════════════════════
    {
        keywords: ['fence wall', 'boundary wall', 'perimeter fence'],
        materials: [
            mat('9-Inch Hollow Block', 4, 'Block', 650),
            mat('OPC Cement (50kg)', 0.5, 'Bags', 12500),
            mat('Sharp Sand', 0.03, 'm³', 22000),
            mat('Reinforcement Steel (12mm)', 2, 'kg', 1150),
        ],
        labor: [labour('mason', 0.3), labour('general', 0.2)],
        plant: [],
    },
];

// ──────────────────────────────────────────────────────────────────────────
// STRUCTURE-TYPE DEFAULTS (fallback when no keyword matches)
// ──────────────────────────────────────────────────────────────────────────

const STRUCTURE_DEFAULTS = {
    'Residential Building': {
        materials: [
            mat('OPC Cement (50kg)', 6.5, 'Bags', 12500),
            mat('Sharp Sand', 0.45, 'm³', 22000),
            mat('Granite (20mm)', 0.9, 'm³', 35000),
        ],
        labor: [labour('mason', 1), labour('general', 2)],
        plant: [plant('concreteMixer', 0.2)],
    },
    'Commercial Building': {
        materials: [
            mat('OPC Cement (50kg)', 8, 'Bags', 12500),
            mat('Sharp Sand', 0.4, 'm³', 22000),
            mat('Granite (10mm)', 0.85, 'm³', 36500),
            mat('Reinforcement Steel (16mm)', 50, 'kg', 1140),
        ],
        labor: [labour('concreteMixer', 1.5), labour('steel_fixer', 1), labour('general', 2)],
        plant: [plant('concreteMixer', 0.3), plant('vibrator', 0.3)],
    },
    'Road Construction': {
        materials: [
            mat('Laterite (Filling)', 1.2, 'm³', 12000),
            mat('Granite (20mm)', 0.5, 'm³', 35000),
            mat('Diesel (plant fuel)', 10, 'L', 1100),
        ],
        labor: [labour('road_ganger', 0.5), labour('driver', 1), labour('general', 1)],
        plant: [plant('gradingMachine', 0.3), plant('roller', 0.3)],
    },
    'Bridge / Flyover': {
        materials: [
            mat('OPC Cement (50kg)', 10, 'Bags', 12500),
            mat('Sharp Sand', 0.5, 'm³', 22000),
            mat('Granite (10mm)', 1.0, 'm³', 36500),
            mat('Reinforcement Steel (25mm)', 120, 'kg', 1130),
            mat('Admixture (waterproofing)', 0.5, 'L', 4500),
        ],
        labor: [labour('concreteMixer', 2), labour('steel_fixer', 2), labour('general', 3)],
        plant: [plant('concreteMixer', 0.5), plant('vibrator', 0.5), plant('crane', 0.2)],
    },
    'Box Culvert': {
        materials: [
            mat('OPC Cement (50kg)', 9, 'Bags', 12500),
            mat('Sharp Sand', 0.45, 'm³', 22000),
            mat('Granite (20mm)', 0.9, 'm³', 35000),
            mat('Reinforcement Steel (12mm)', 60, 'kg', 1150),
        ],
        labor: [labour('concreteMixer', 1.5), labour('steel_fixer', 1.5), labour('general', 2)],
        plant: [plant('concreteMixer', 0.3), plant('vibrator', 0.3), plant('pump', 0.3)],
    },
    'Retaining Wall': {
        materials: [
            mat('OPC Cement (50kg)', 9, 'Bags', 12500),
            mat('Sharp Sand', 0.45, 'm³', 22000),
            mat('Granite (20mm)', 0.9, 'm³', 35000),
            mat('Reinforcement Steel (16mm)', 80, 'kg', 1140),
            mat('Bituminous Membrane (3mm SBS)', 1, 'm²', 3800),
        ],
        labor: [labour('concreteMixer', 1.5), labour('steel_fixer', 1.5), labour('general', 2)],
        plant: [plant('concreteMixer', 0.3), plant('vibrator', 0.3)],
    },
};

// ──────────────────────────────────────────────────────────────────────────
// MAIN LOOKUP FUNCTION
// ──────────────────────────────────────────────────────────────────────────

/**
 * Get the engineering-correct rate breakdown for a BOQ item.
 *
 * @param {string} description   - The item description from the BOQ
 * @param {string} structureType - One of STRUCTURE_TYPES values
 * @returns {{ materials, labor, plant, overheads, profit }}
 */
export const getBreakdownForItem = (description, structureType) => {
    const desc = (description || '').toLowerCase();

    // 1. Keyword match (most specific)
    for (const breakdown of BREAKDOWNS) {
        const matched = breakdown.keywords.some(kw => desc.includes(kw.toLowerCase()));
        if (matched) {
            return {
                materials: breakdown.materials.map(m => ({ ...m, id: id() })),
                labor: breakdown.labor.map(l => ({ ...l, id: id() })),
                plant: breakdown.plant.map(p => ({ ...p, id: id() })),
                overheads: 15,
                profit: 10,
            };
        }
    }

    // 2. Structure-type default
    const def = STRUCTURE_DEFAULTS[structureType];
    if (def) {
        return {
            materials: def.materials.map(m => ({ ...m, id: id() })),
            labor: def.labor.map(l => ({ ...l, id: id() })),
            plant: def.plant.map(p => ({ ...p, id: id() })),
            overheads: 15,
            profit: 10,
        };
    }

    // 3. Absolute fallback — generic concrete mix
    return {
        materials: [
            mat('OPC Cement (50kg)', 6.5, 'Bags', 12500),
            mat('Sharp Sand', 0.45, 'm³', 22000),
            mat('Granite (20mm)', 0.9, 'm³', 35000),
        ],
        labor: [labour('mason', 1), labour('general', 2)],
        plant: [plant('concreteMixer', 0.2)],
        overheads: 15,
        profit: 10,
    };
};

export default getBreakdownForItem;
