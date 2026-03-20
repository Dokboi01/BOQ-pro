// BOQ Pro - Expanded professional structure libraries

export const STRUCTURE_CATEGORIES = {
    BUILDING: 'Building',
    ROAD: 'Road',
    BRIDGE: 'Bridge',
    DRAINAGE: 'Drainage',
    COASTAL: 'Coastal / Marine',
    FOUNDATION: 'Foundation Works'
};

const round = (value) => Math.round(value * 100) / 100;

const item = (description, unit, qty, rate, subcategory, materials = []) => ({
    description,
    unit,
    qty,
    rate,
    subcategory,
    materials
});

const section = (id, title, items) => ({ id, title, items });

const scaleSections = (sections, factor = 1) =>
    sections.map((sec) => ({
        ...sec,
        items: sec.items.map((it) => ({
            ...it,
            qty: typeof it.qty === 'number' ? round(it.qty * factor) : it.qty,
            materials: Array.isArray(it.materials) ? [...it.materials] : []
        }))
    }));

const BUILDING_WORKS_SECTIONS = [
    section('preliminaries', '1. PRELIMINARIES', [
        item('Mobilization and demobilization of personnel and light plant', 'Sum', 1, 1200000, 'Site Mobilization', ['Temporary office', 'Safety signage']),
        item('Temporary site fencing, hoarding and controlled access gate', 'm', 180, 9500, 'Site Security', ['Hoarding sheets', 'Steel posts', 'Padlocks']),
        item('Contractor\'s all-risk insurance and statutory permits', 'Sum', 1, 850000, 'Compliance', ['Insurance bond', 'Permit fees']),
        item('Health, safety and environmental management setup', 'Month', 8, 145000, 'HSE', ['PPE kits', 'Fire extinguishers', 'First aid box']),
        item('Site office utilities (water, power, internet and sanitation)', 'Month', 8, 180000, 'Site Utilities', ['Generator fuel', 'Water tanker', 'Toilet cabins'])
    ]),
    section('site_clearance', '2. SITE CLEARANCE, SETTING OUT & EARTHWORKS', [
        item('Clear vegetation, shrubs and debris including disposal', 'm²', 2800, 650, 'Site Clearance', ['Brush cutter', 'Wheel barrow']),
        item('Strip topsoil average depth 150-200mm and stockpile', 'm³', 420, 2900, 'Topsoil Removal', ['Excavator', 'Tipper trucks']),
        item('Detailed survey control points and setting out to approved drawings', 'Sum', 1, 420000, 'Setting Out', ['Total station', 'Profile boards', 'Nylon lines']),
        item('Excavate trench and pad foundations not exceeding 1.5m depth', 'm³', 560, 3800, 'Excavation', ['Excavator', 'Labour']),
        item('Cart away surplus excavated material to approved dump', 'm³', 260, 2600, 'Spoil Disposal', ['Tipper trucks'])
    ]),
    section('filling_compaction', '3. FILLING, COMPACTION, HARDCORE & BLINDING', [
        item('Imported laterite filling in 150mm layers and compact', 'm³', 480, 10500, 'Earth Filling', ['Laterite', 'Vibratory roller', 'Water tanker']),
        item('Sharp sand filling and compaction to reduced level', 'm³', 220, 8200, 'Sand Filling', ['Sharp sand', 'Plate compactor']),
        item('Hardcore filling in layers and machine compaction', 'm³', 260, 14500, 'Hardcore', ['Hardcore', 'Vibratory roller']),
        item('50mm blinding concrete Grade 10 below footing and slab', 'm³', 90, 72000, 'Blinding Concrete', ['Cement', 'Sand', 'Granite', 'Water']),
        item('Anti-termite treatment to hardcore and foundation trenches', 'm²', 1800, 1200, 'Termite Treatment', ['Termicide chemical'])
    ]),
    section('foundation_works', '4. FOUNDATION CONCRETE, REINFORCEMENT & DPC', [
        item('Reinforcement cutting, bending and fixing to strip footings', 'kg', 18500, 1550, 'Footing Reinforcement', ['Y12 bars', 'Y16 bars', 'Binding wire']),
        item('Formwork to footing sides and bases where required', 'm²', 680, 14200, 'Footing Formwork', ['Formwork plywood', 'Timber', 'Nails']),
        item('Concrete Grade 25 to strip footings and pad footings', 'm³', 260, 112000, 'Footing Concrete', ['Cement', 'Granite', 'Sand']),
        item('225mm sandcrete blockwork from footing to DPC level', 'm²', 780, 18800, 'Foundation Blockwork', ['225mm blocks', 'Cement', 'Sand']),
        item('Damp proof course membrane at wall base', 'm', 980, 1850, 'DPC Installation', ['DPC membrane', 'Bitumen primer']),
        item('Backfilling around foundations and compaction in layers', 'm³', 410, 4200, 'Backfilling', ['Selected fill', 'Plate compactor'])
    ]),
    section('frame_columns_beams', '5. COLUMNS, BEAMS, SLABS, LINTELS & STAIRS', [
        item('Reinforcement for columns, beams and suspended slabs', 'kg', 36500, 1600, 'Frame Reinforcement', ['Y10 bars', 'Y12 bars', 'Y16 bars', 'Y20 bars', 'Binding wire']),
        item('Formwork to columns, beams, slab edges and stair waist', 'm²', 2450, 16500, 'Frame Formwork', ['Formwork plywood', '2x3 timber', 'Nails']),
        item('Concrete Grade 30 to columns and beams', 'm³', 520, 124000, 'Column and Beam Concrete', ['Cement', 'Granite', 'Sand']),
        item('Concrete Grade 30 to slabs, landings and staircases', 'm³', 640, 122000, 'Slab and Stair Concrete', ['Cement', 'Granite', 'Admixture']),
        item('Concrete lintels over openings complete with reinforcement', 'm', 520, 8200, 'Lintel Works', ['Y10 bars', 'Cement', 'Sand'])
    ]),
    section('blockwork_super', '6. BLOCKWORK, WALLING & METAL SUPPORTS', [
        item('225mm external wall blockwork in cement mortar', 'm²', 1850, 19600, 'External Blockwork', ['225mm blocks', 'Cement', 'Sand']),
        item('150mm internal partition blockwork', 'm²', 1240, 16800, 'Internal Blockwork', ['150mm blocks', 'Cement', 'Sand']),
        item('Reinforced block pillars to fence and façade features', 'm³', 95, 138000, 'Architectural Block Columns', ['Blocks', 'Y12 bars', 'Cement']),
        item('Metal lintel angle supports to selected wide openings', 'm', 180, 14500, 'Metal Works', ['Steel angles', 'Welding rods', 'Anti-rust primer'])
    ]),
    section('roofing', '7. ROOFING STRUCTURE, SHEETS & CEILING FRAME', [
        item('Treated hardwood roof trusses and bracing', 'm³', 65, 265000, 'Roof Structure', ['Hardwood', 'Bolts', 'Anti-termite']),
        item('Aluminium longspan roofing sheets including ridges', 'm²', 2450, 15800, 'Roofing Sheets', ['Aluminium sheets', 'Ridge caps', 'Roofing nails']),
        item('Rainwater gutters, fascia boards and downpipes', 'm', 820, 14500, 'Roof Drainage', ['Aluminium gutters', 'PVC downpipe', 'Brackets']),
        item('Suspended gypsum ceiling on galvanized channels', 'm²', 1880, 13200, 'Ceiling Works', ['Gypsum board', 'Furring channels', 'Joint compound'])
    ]),
    section('openings', '8. DOORS, WINDOWS & METAL FABRICATION', [
        item('Flush panel internal doors complete with ironmongery', 'Nr', 165, 98000, 'Doors', ['Flush door leaf', 'Door frame', 'Hinges', 'Locksets']),
        item('Steel security external doors complete with frame', 'Nr', 28, 245000, 'Doors', ['Steel door', 'Frame', 'Lockset']),
        item('Powder coated aluminium sliding windows with accessories', 'm²', 860, 96500, 'Windows', ['Aluminium profile', 'Glass', 'Rubber gaskets']),
        item('Burglar proof and balustrade metal works', 'kg', 12800, 2400, 'Metal Works', ['Mild steel', 'Welding rods', 'Red oxide'])
    ]),
    section('finishes', '9. PLASTERING, SCREEDING, FLOOR & WALL FINISHES', [
        item('Internal wall plaster 12mm thick', 'm²', 6100, 4200, 'Plastering', ['Cement', 'Plaster sand']),
        item('External render 15mm thick with waterproof additive', 'm²', 2600, 5200, 'Wall Rendering', ['Cement', 'Sand', 'Waterproof admixture']),
        item('Floor screeding to receive final finishes', 'm²', 3250, 2850, 'Screeding', ['Cement', 'Sharp sand']),
        item('Vitrified tiles to living areas and circulation', 'm²', 2480, 17500, 'Floor Finishes', ['Vitrified tiles', 'Tile adhesive', 'Grout']),
        item('Ceramic wall tiles to wet areas', 'm²', 1240, 14200, 'Wall Finishes', ['Ceramic tiles', 'Tile adhesive', 'Grout'])
    ]),
    section('painting', '10. PAINTING & DECORATIVE COATS', [
        item('Emulsion paint to internal walls and ceilings (3 coats)', 'm²', 7300, 1850, 'Internal Painting', ['Emulsion paint', 'Putty', 'Rollers']),
        item('Textured weather shield paint to external walls', 'm²', 2600, 2950, 'External Painting', ['Textured paint', 'Primer']),
        item('Gloss/enamel paint to metal doors and railings', 'm²', 920, 3350, 'Metal Painting', ['Gloss paint', 'Red oxide primer'])
    ]),
    section('plumbing_sanitary', '11. PLUMBING INSTALLATION & SANITARY FITTINGS', [
        item('Cold and hot water reticulation pipework in PPR', 'm', 4200, 3600, 'Plumbing Installation', ['PPR pipes', 'Elbows', 'Valves']),
        item('Soil and waste pipe network in uPVC', 'm', 1900, 4100, 'Drainage Installation', ['uPVC pipes', 'Fittings', 'Solvent cement']),
        item('Water closets, wash hand basins and accessories', 'Set', 82, 245000, 'Sanitary Fittings', ['Water closet', 'Basin', 'Mixers', 'Bottle trap']),
        item('Manholes, inspection chambers and gully traps', 'Nr', 52, 125000, 'Drainage Installation', ['Concrete rings', 'Covers', 'PVC fittings'])
    ]),
    section('electrical', '12. ELECTRICAL CONDUITS, WIRING & LIGHT FITTINGS', [
        item('Concealed heavy gauge PVC conduits and draw boxes', 'm', 6800, 2100, 'Electrical Conduits', ['PVC conduit', 'Junction boxes']),
        item('Electrical wiring and cabling for power/lighting circuits', 'm', 11800, 1450, 'Electrical Wiring', ['2.5mm cable', '1.5mm cable', '4mm cable']),
        item('Distribution board, breakers and earthing accessories', 'Set', 12, 365000, 'Power Distribution', ['Distribution board', 'MCB', 'Earth rod']),
        item('LED light fittings, switches and sockets complete', 'Nr', 620, 28500, 'Light Fittings', ['LED fittings', 'Switches', 'Socket outlets'])
    ]),
    section('external_works', '13. EXTERNAL WORKS, SEPTIC, SOAKAWAY & LANDSCAPE', [
        item('Concrete interlocking paving to walkways and parking', 'm²', 2150, 9800, 'External Works', ['Interlocking stones', 'Sharp sand', 'Kerbs']),
        item('Septic tank construction complete with ventilation', 'Sum', 1, 2450000, 'Septic Tank', ['Reinforcement bars', 'Concrete', 'Manhole covers']),
        item('Soakaway pit with honeycomb block lining', 'Sum', 1, 1280000, 'Soakaway', ['Honeycomb blocks', 'Granite', 'PVC perforated pipes']),
        item('Perimeter fence wall with gate and anti-climb wire', 'm', 420, 95000, 'Fencing', ['Blocks', 'Steel gate', 'Barbed wire']),
        item('Topsoil spread, turfing, ornamental planting and irrigation sleeves', 'm²', 1300, 6200, 'Landscaping', ['Topsoil', 'Grass', 'Shrubs', 'PVC sleeves'])
    ])
];

const BUILDING_HIGHRISE_EXTRA = [
    section('vertical_transport', '14. HIGH-RISE SPECIALS: CORE, LIFTS & FIRE SYSTEMS', [
        item('Lift shaft formwork and high strength concrete', 'm³', 210, 185000, 'Lift Core Construction', ['Concrete Grade 40', 'Y20 bars', 'Formwork']),
        item('Passenger lift supply and installation', 'Nr', 6, 28500000, 'Vertical Transportation', ['Lift cabin', 'Controller', 'Traction machine']),
        item('Fire alarm and sprinkler network installation', 'Sum', 1, 36000000, 'Fire Protection', ['Sprinkler heads', 'Alarm panel', 'Hydrant accessories'])
    ])
];

const COMMERCIAL_EXTRA = [
    section('commercial_services', '14. COMMERCIAL SERVICES & HVAC', [
        item('Central HVAC ducting and chilled water piping', 'Sum', 1, 58000000, 'HVAC Installation', ['GI ducts', 'Chillers', 'Insulation']),
        item('Smoke extraction and stair pressurization systems', 'Sum', 1, 14200000, 'Life Safety', ['Axial fans', 'Fire dampers']),
        item('Building management system and automation panels', 'Sum', 1, 18500000, 'BMS Integration', ['BMS controller', 'Sensors', 'Network switches'])
    ])
];

const HOSPITAL_EXTRA = [
    section('clinical_specials', '14. HOSPITAL SPECIALIST INSTALLATIONS', [
        item('Medical gas piping to ICU, theatre and wards', 'm', 1850, 16500, 'Medical Gas', ['Copper pipes', 'Outlet valves', 'Pressure gauges']),
        item('Lead lining for X-ray/CT rooms and shielding details', 'm²', 420, 92500, 'Radiology Shielding', ['Lead sheet', 'Plywood backing']),
        item('Antimicrobial seamless vinyl flooring', 'm²', 1850, 24500, 'Clinical Finishes', ['Antimicrobial vinyl', 'Adhesive'])
    ])
];

const WAREHOUSE_EXTRA = [
    section('industrial_steel', '14. INDUSTRIAL STEEL STRUCTURE & FLOOR HARDENER', [
        item('Fabricate and erect steel portal frame structure', 'Tonne', 185, 1750000, 'Steel Frame', ['Steel members', 'Bolts', 'Welding electrodes']),
        item('Cold-rolled purlins, side rails and sag rods', 'kg', 28500, 1650, 'Secondary Members', ['Z-purlins', 'Sag rods']),
        item('Industrial slab power-float with dry shake hardener', 'm²', 5400, 8400, 'Industrial Floor', ['Floor hardener', 'Concrete', 'Curing compound'])
    ])
];

const ROAD_WORKS_SECTIONS = [
    section('road_preliminaries', '1. PRELIMINARIES', [
        item('Project mobilization, traffic diversion and temporary signs', 'Sum', 1, 12500000, 'Preliminaries', ['Traffic cones', 'Sign boards', 'Barricades']),
        item('Topographic survey and setting out of carriageway', 'km', 5.2, 1250000, 'Setting Out', ['Total station', 'Survey pegs']),
        item('Trial pits, geotechnical tests and quality laboratory setup', 'Sum', 1, 6200000, 'Quality Assurance', ['CBR apparatus', 'Sieve set', 'Moisture tester'])
    ]),
    section('clearing_grubbing', '2. CLEARING, GRUBBING & REMOVAL OF TOPSOIL', [
        item('Clearing and grubbing of right-of-way', 'm²', 86500, 520, 'Clearing and Grubbing', ['Bulldozer', 'Chainsaw']),
        item('Strip topsoil average 200mm depth', 'm³', 17300, 1850, 'Removal of Topsoil', ['Excavator', 'Tipper truck']),
        item('Dispose unsuitable material from site', 'm³', 12400, 2400, 'Spoil Disposal', ['Tipper truck'])
    ]),
    section('earthworks_excavation', '3. EARTHWORKS, EXCAVATION & EMBANKMENT FILL', [
        item('Excavate unsuitable soil and weak spots', 'm³', 9800, 3100, 'Excavation', ['Excavator', 'Compactor']),
        item('Imported selected fill for embankment formation', 'm³', 28200, 9800, 'Fill and Embankment', ['Borrow pit laterite', 'Dozer', 'Roller']),
        item('Moisture conditioning and compaction to 95% MDD', 'm²', 52000, 820, 'Compaction', ['Water tanker', 'Vibratory roller'])
    ]),
    section('subgrade', '4. SUBGRADE PREPARATION & CAPPING LAYER', [
        item('Subgrade trimming and proof rolling', 'm²', 52000, 580, 'Subgrade Preparation', ['Motor grader', 'Roller']),
        item('Stabilization with imported sharp sand where required', 'm³', 6250, 7600, 'Subgrade Stabilization', ['Sharp sand', 'Compactor']),
        item('Capping layer 150-300mm thickness', 'm³', 10400, 13800, 'Capping Layer', ['Selected granular fill'])
    ]),
    section('subbase_base', '5. SUB-BASE, BASE COURSE & STONE BASE', [
        item('Granular sub-base 150mm compacted thickness', 'm³', 7800, 28500, 'Sub-base', ['Crushed stone', 'Water tanker']),
        item('Crushed stone base course 200mm thick', 'm³', 10400, 35500, 'Base Course', ['Stone base', 'Roller']),
        item('Additional dense graded stone base at junctions', 'm³', 2600, 38500, 'Stone Base', ['Dense graded aggregate'])
    ]),
    section('bituminous_layers', '6. PRIME COAT, TACK COAT & ASPHALT COURSES', [
        item('Prime coat MC1 application on prepared base', 'm²', 52000, 1450, 'Prime Coat', ['MC1 bitumen']),
        item('Tack coat emulsion to binder/wearing interface', 'm²', 52000, 980, 'Tack Coat', ['Bitumen emulsion']),
        item('Asphalt binder course 60mm compacted', 'm²', 52000, 17600, 'Asphalt Binder Course', ['Asphalt mix', 'Bitumen']),
        item('Asphalt wearing course 40mm compacted', 'm²', 52000, 14500, 'Wearing Course', ['Asphalt mix', 'Bitumen'])
    ]),
    section('pavement_concrete', '7. CRCP / RIGID PAVEMENT COMPONENTS', [
        item('CRCP mesh reinforcement and longitudinal bars at tie-in areas', 'kg', 62500, 1650, 'CRCP Reinforcement', ['Y12 bars', 'Y16 bars', 'Tie bars']),
        item('Concrete pavement Grade 40 at bus bays and intersections', 'm³', 1800, 132000, 'Pavement Concrete', ['Concrete Grade 40', 'Curing compound']),
        item('Saw-cut joints, dowels and sealant details', 'm', 6200, 6200, 'Jointing Works', ['Joint sealant', 'Dowel bars'])
    ]),
    section('shoulders_kerbs', '8. SHOULDERS, KERBS & MEDIAN WORKS', [
        item('Granular shoulder construction both sides', 'm²', 12500, 7200, 'Shoulders', ['Laterite', 'Stone dust']),
        item('Precast concrete kerbs including bedding', 'm', 12400, 9800, 'Kerbs', ['Precast kerbs', 'Cement mortar']),
        item('Median concrete barriers and landscape strips', 'm', 5200, 46000, 'Median Works', ['Concrete barriers', 'Topsoil', 'Plants'])
    ]),
    section('road_furniture', '9. ROAD MARKINGS, SIGNAGE, GUARDRAILS & LIGHTING', [
        item('Thermoplastic centerline and edge road markings', 'm', 36500, 4200, 'Road Markings', ['Thermoplastic paint', 'Glass beads']),
        item('Regulatory and directional signage complete', 'Nr', 210, 185000, 'Signage', ['Aluminium signs', 'Reflective sheeting', 'Posts']),
        item('Steel guardrails with terminal sections', 'm', 4200, 24500, 'Guardrails', ['W-beam rails', 'Posts', 'Bolts']),
        item('Street lighting poles, cabling and luminaires', 'Nr', 260, 620000, 'Street Lighting', ['Lighting pole', 'LED luminaires', 'Electrical cables'])
    ]),
    section('road_drainage', '10. DRAINAGE, CULVERTS & CONCRETE CHANNELS', [
        item('Side drains in concrete or masonry lining', 'm', 12400, 18500, 'Side Drains', ['Concrete', 'Blocks', 'Reinforcement']),
        item('Pipe culverts with headwalls and wingwalls', 'm', 1850, 62000, 'Culverts', ['RCC pipes', 'Concrete', 'Stone pitching']),
        item('In-situ concrete U-channels and catchpits', 'm', 6200, 26500, 'Concrete Channels', ['Concrete', 'Reinforcement bars', 'Formwork'])
    ])
];

const ROAD_CRCP_SECTIONS = [
    section('crcp_preliminaries', '1. PRELIMINARIES & SETTING OUT (CRCP)', [
        item('Survey and setting out of CRCP centerline and levels', 'km', 7.5, 1850000, 'Survey and Setting Out', ['Survey pegs', 'Total station']),
        item('Traffic management and detour installation', 'Sum', 1, 16500000, 'Traffic Management', ['Traffic signs', 'Water barriers']),
        item('Materials laboratory and QA/QC trial mixes', 'Sum', 1, 7800000, 'Quality Assurance', ['Compression machine', 'Cube moulds'])
    ]),
    section('crcp_earthworks', '2. EARTHWORKS & FORMATION (CRCP)', [
        item('Removal of unsuitable soil from formation', 'm³', 14200, 3400, 'Removal of Unsuitable Soil', ['Excavator', 'Tipper truck']),
        item('Imported engineered fill and layer compaction', 'm³', 38500, 10800, 'Imported Fill', ['Selected laterite', 'Roller']),
        item('Sharp sand filling below stone base', 'm³', 9200, 8200, 'Sharp Sand Filling', ['Sharp sand', 'Compactor'])
    ]),
    section('crcp_base', '3. STONE BASE & PRIME LAYER', [
        item('Crushed stone base 200mm thick to lane width', 'm³', 18500, 36800, 'Stone Base 200mm', ['Crushed granite', 'Water tanker']),
        item('MC1 application to base and bond preparation', 'm²', 92000, 1520, 'MC1 Application', ['MC1 cutback bitumen']),
        item('String line setup and rail forms for paving train', 'm', 16500, 4200, 'Paving Setup', ['String lines', 'Rail forms'])
    ]),
    section('crcp_reinforcement', '4. CRCP REINFORCEMENT LAYING', [
        item('Placement of Y16 main longitudinal bars', 'kg', 265000, 1680, 'Y16 Main Bars', ['Y16 bars', 'Binding wire']),
        item('Placement of Y12 running/transverse bars', 'kg', 158000, 1660, 'Y12 Running Bars', ['Y12 bars', 'Binding wire']),
        item('Fabrication of chair supports for bar level control', 'Nr', 38500, 620, 'Chair Supports', ['Mild steel bars']),
        item('Install tie bars and lap splices at lane joints', 'kg', 58500, 1720, 'Tie Bars', ['Tie bars', 'Epoxy'])
    ]),
    section('crcp_concrete', '5. CONCRETE PAVEMENT PLACEMENT', [
        item('Concrete Grade 40 pavement by slipform paver', 'm³', 27500, 138000, 'Concrete Grade 40 Pavement', ['Cement', 'Granite', 'Admixture']),
        item('Surface texturing, broom finish and edge alignment', 'm²', 92000, 3200, 'Surface Finishing', ['Tining rake', 'Straight edges']),
        item('Membrane curing and wet hessian curing regime', 'm²', 92000, 1250, 'Curing', ['Curing compound', 'Hessian cloth']),
        item('Expansion, contraction and terminal joint details', 'm', 6800, 8200, 'Expansion and Contraction', ['Joint sealant', 'Dowel bars']),
        item('Edge protection and shoulder casting concrete', 'm', 13200, 16500, 'Edge Protection and Shoulder Casting', ['Concrete', 'Formwork', 'Reinforcement'])
    ]),
    section('crcp_ancillary', '6. ANCILLARY WORKS & TRAFFIC FURNITURE', [
        item('Concrete shoulders and paved shoulder tie-ins', 'm²', 11500, 9800, 'Shoulders', ['Concrete', 'Reinforcement']),
        item('Road markings and reflective studs', 'm', 42800, 4600, 'Road Markings', ['Thermoplastic paint', 'Reflective studs']),
        item('Signage, guardrails and kilometer posts', 'Sum', 1, 24800000, 'Traffic Furniture', ['Sign boards', 'Guardrails', 'Delineators'])
    ])
];

const ROAD_DUAL_EXTRA = [
    section('dual_specifics', '11. DUAL CARRIAGEWAY SPECIFICS', [
        item('Central median concrete barriers and drainage crossings', 'm', 10400, 48500, 'Median Works', ['Concrete barriers', 'Reinforcement']),
        item('Service ducts and utility sleeves across carriageway', 'm', 3200, 18500, 'Utility Crossings', ['HDPE ducts', 'Marker tape']),
        item('Interchange tapers and acceleration/deceleration lanes', 'm²', 12600, 15800, 'Interchange Works', ['Asphalt mix', 'Road marking paint'])
    ])
];

const BRIDGE_WORKS_SECTIONS = [
    section('bridge_preliminaries', '1. PRELIMINARIES & SITE PREPARATION', [
        item('Bridge alignment survey, benchmarks and setting out', 'Sum', 1, 8200000, 'Setting Out', ['Total station', 'Benchmarks']),
        item('Temporary access roads and working platforms', 'Sum', 1, 15400000, 'Site Preparation', ['Laterite', 'Geotextile', 'Compactor']),
        item('River diversion and cofferdam arrangement where applicable', 'Sum', 1, 24500000, 'Temporary Works', ['Sheet piles', 'Pumps', 'Sand bags'])
    ]),
    section('bridge_piling', '2. PILING & PILE CAPS', [
        item('Bored piles complete in permanent works', 'm', 1850, 385000, 'Piling', ['Reinforcement cage', 'Concrete Grade 35', 'Bentonite']),
        item('Pile integrity tests and load tests', 'Nr', 48, 450000, 'Pile Testing', ['Test kit', 'Load frame']),
        item('Concrete pile caps with reinforcement and formwork', 'm³', 820, 145000, 'Pile Cap', ['Y20 bars', 'Concrete', 'Formwork'])
    ]),
    section('bridge_substructure', '3. ABUTMENTS, PIERS & CAPS', [
        item('Reinforced concrete abutments including wingwalls', 'm³', 950, 158000, 'Abutment', ['Y16 bars', 'Concrete Grade 35']),
        item('Pier shafts with climbing formwork', 'm³', 740, 176000, 'Pier Shaft', ['High strength concrete', 'Form ties']),
        item('Pier caps and diaphragm beam concrete', 'm³', 420, 182000, 'Pier Cap', ['Y20 bars', 'Concrete', 'Admixture'])
    ]),
    section('bridge_superstructure', '4. BEAMS, DECK SLAB & STRUCTURAL CONCRETE', [
        item('Precast/prestressed beam fabrication and installation', 'Nr', 96, 9650000, 'Beam Installation', ['Prestressing strand', 'Concrete', 'Lifting accessories']),
        item('Deck slab reinforcement and concrete placement', 'm³', 1450, 192000, 'Deck Slab', ['Y12 bars', 'Y16 bars', 'Concrete Grade 40']),
        item('Formwork to deck edges, diaphragms and parapets', 'm²', 3850, 18500, 'Formwork', ['Formwork plywood', 'Steel props']),
        item('Bearing seat concrete and shim leveling', 'm³', 115, 165000, 'Concrete', ['Non-shrink grout', 'Concrete'])
    ]),
    section('bridge_fittings', '5. BEARINGS, JOINTS, PARAPETS & APPROACHES', [
        item('Elastomeric or pot bearings supply and installation', 'Nr', 192, 620000, 'Bearings', ['Elastomeric bearings', 'Anchor bolts']),
        item('Expansion joints complete with nosing and seal', 'm', 210, 760000, 'Expansion Joints', ['Joint assembly', 'Sealant']),
        item('Reinforced concrete parapet and crash barriers', 'm', 2850, 82000, 'Parapet', ['Concrete', 'Y12 bars']),
        item('Approach slab construction with dowel connection', 'm³', 520, 136000, 'Approach Slab', ['Concrete', 'Dowel bars'])
    ]),
    section('bridge_finishes', '6. DRAINAGE, WEARING COURSE, RAILINGS & PROTECTION', [
        item('Deck drainage outlets and downpipes', 'Nr', 165, 85000, 'Drainage', ['Drainage scupper', 'uPVC pipes']),
        item('Asphalt wearing surface on bridge deck', 'm²', 6200, 24800, 'Asphalt Wearing Surface', ['Asphalt', 'Bitumen']),
        item('Steel/aluminium railings and anti-climb mesh', 'm', 2850, 125000, 'Railings', ['Galvanized railing', 'Fixings']),
        item('Scour protection, riprap and river training works', 'm³', 4200, 28500, 'Protection Works', ['Rock armour stone', 'Geotextile'])
    ])
];

const ARCH_BRIDGE_EXTRA = [
    section('arch_specifics', '7. ARCH BRIDGE SPECIALIZED WORKS', [
        item('High precision arch rib centering and falsework', 'm²', 1850, 42000, 'Arch Rib Formwork', ['Steel falsework', 'Formwork plywood']),
        item('Arch rib reinforcement cages and anchor blocks', 'kg', 185000, 1720, 'Arch Rib Reinforcement', ['Y20 bars', 'Y25 bars', 'Binding wire']),
        item('High strength concrete Grade 45 for arch ribs', 'm³', 680, 205000, 'Arch Rib Concrete', ['Cement', 'Granite', 'Silica fume'])
    ])
];

const DRAINAGE_WORKS_SECTIONS = [
    section('drn_setting_out', '1. SETTING OUT & EXCAVATION', [
        item('Survey control and drain alignment setting out', 'Sum', 1, 850000, 'Setting Out', ['Total station', 'Profile board']),
        item('Excavation to drain trench and formation level', 'm³', 8400, 3600, 'Excavation', ['Excavator', 'Tipper trucks']),
        item('Dewatering and maintenance of dry trench', 'Day', 60, 145000, 'Dewatering', ['Submersible pump', 'Generator'])
    ]),
    section('drn_bedding_blinding', '2. BEDDING, BLINDING, REINFORCEMENT & FORMWORK', [
        item('Granular bedding layer to base', 'm³', 1850, 9200, 'Bedding', ['Sharp sand', 'Stone dust']),
        item('Concrete blinding to base slab', 'm³', 920, 72000, 'Concrete Blinding', ['Cement', 'Sand', 'Granite']),
        item('Reinforcement for base slab and side walls', 'kg', 98500, 1620, 'Reinforcement', ['Y10 bars', 'Y12 bars', 'Binding wire']),
        item('Formwork to side walls, base kicker and cover slab', 'm²', 4200, 15800, 'Formwork', ['Formwork plywood', 'Timber'])
    ]),
    section('drn_structural', '3. SIDE WALLS, BASE SLAB, COVER SLAB & BACKFILLING', [
        item('Concrete Grade 30 to base slab', 'm³', 1450, 125000, 'Base Slab', ['Concrete', 'Admixture']),
        item('Concrete Grade 30 to side walls', 'm³', 1680, 132000, 'Side Walls', ['Concrete', 'Reinforcement']),
        item('Precast/in-situ cover slab with lifting hooks', 'm³', 860, 138000, 'Cover Slab', ['Concrete', 'Y12 bars']),
        item('Backfilling and compaction to completed drains', 'm³', 6400, 4500, 'Backfilling', ['Selected fill', 'Compactor'])
    ]),
    section('drn_appurtenances', '4. MANHOLES, PIPE LAYING, CATCHPITS & OUTFALL', [
        item('Reinforced concrete manholes complete', 'Nr', 165, 225000, 'Manholes', ['Concrete', 'Manhole cover', 'Reinforcement']),
        item('uPVC/RCC pipe laying to outfall', 'm', 4850, 18500, 'Pipe Laying', ['Pipes', 'Bedding sand', 'Collars']),
        item('Catch pits and gully chambers at inlets', 'Nr', 240, 118000, 'Catch Pits', ['Concrete', 'Gratings']),
        item('Outfall structure and energy dissipation basin', 'Sum', 1, 6200000, 'Outfall Works', ['Concrete', 'Rock pitching'])
    ]),
    section('drn_protection', '5. STONE PITCHING & GRATING INSTALLATION', [
        item('Stone pitching to embankment and channel slopes', 'm²', 3200, 27500, 'Stone Pitching', ['Quarry stone', 'Geotextile']),
        item('Galvanized gratings to channels and inlets', 'm²', 850, 85000, 'Grating Installation', ['Galvanized grating', 'Fixings']),
        item('Toe wall and concrete apron protection', 'm³', 380, 128000, 'Protection Works', ['Concrete', 'Reinforcement'])
    ])
];

const U_DRAIN_EXTRA = [
    section('u_drain_specials', '6. U-DRAIN SPECIALS', [
        item('Precast U-drain units supply and placement', 'm', 2650, 36500, 'Precast U-Drain', ['Precast U-drain units', 'Bedding mortar']),
        item('Joint sealing and anti-leak treatment', 'm', 2650, 4200, 'Joint Sealing', ['Sealant', 'Primer']),
        item('Access covers and maintenance openings', 'Nr', 180, 65000, 'Maintenance Access', ['Cover slabs', 'Handles'])
    ])
];

const FOUNDATION_WORKS_SECTIONS = [
    section('fdn_site_clearance', '1. SITE CLEARANCE, EXCAVATION & DEWATERING', [
        item('Site clearance and topsoil stripping', 'm²', 5200, 680, 'Site Clearance', ['Excavator', 'Labour']),
        item('Excavation to foundation formation level', 'm³', 2450, 3850, 'Excavation', ['Excavator', 'Tipper trucks']),
        item('Dewatering and sump pumping operations', 'Day', 45, 135000, 'Dewatering', ['Pumps', 'Generator'])
    ]),
    section('fdn_fill_blind', '2. SAND FILLING, HARDCORE & BLINDING', [
        item('Imported sharp sand filling and consolidation', 'm³', 1150, 8600, 'Sand Filling', ['Sharp sand', 'Compactor']),
        item('Hardcore placement and compaction', 'm³', 980, 15200, 'Hardcore', ['Hardcore', 'Plate compactor']),
        item('Blinding concrete 50-75mm thick', 'm³', 360, 74000, 'Blinding', ['Cement', 'Sand', 'Granite'])
    ]),
    section('fdn_rebar_formwork', '3. REINFORCEMENT, FORMWORK & FOOTINGS', [
        item('Reinforcement for pad and strip footings', 'kg', 68500, 1640, 'Pad/Strip Reinforcement', ['Y12 bars', 'Y16 bars', 'Binding wire']),
        item('Formwork to sides of pad and strip footings', 'm²', 3150, 14800, 'Footing Formwork', ['Formwork plywood', 'Timber']),
        item('Concrete to pad footings', 'm³', 780, 118000, 'Pad Footing', ['Concrete Grade 25', 'Admixture']),
        item('Concrete to strip footings and trench fill', 'm³', 920, 115000, 'Strip Footing', ['Concrete Grade 25'])
    ]),
    section('fdn_raft_pilecap', '4. RAFT SLAB, PILE CAPS & GROUND BEAMS', [
        item('Raft slab reinforcement and concrete placement', 'm³', 1250, 132000, 'Raft Slab', ['Y12 mesh', 'Concrete']),
        item('Pile cap concrete and reinforcement', 'm³', 620, 145000, 'Pile Cap', ['Y16 bars', 'Y20 bars', 'Concrete']),
        item('Ground beams with starter bars and links', 'm³', 520, 138000, 'Ground Beams', ['Y12 bars', 'Y16 bars', 'Formwork'])
    ]),
    section('fdn_finish', '5. BACKFILL, COMPACTION, DPC & STARTER BARS', [
        item('Backfilling around completed foundation members', 'm³', 1850, 4650, 'Backfilling', ['Selected fill', 'Compactor']),
        item('Final compaction and level regulation', 'm²', 5200, 850, 'Compaction', ['Roller', 'Water tanker']),
        item('Damp proof course membrane installation', 'm', 1680, 1850, 'DPC', ['DPC membrane', 'Bitumen']),
        item('Starter bars and column kickers for superstructure', 'kg', 18500, 1720, 'Starter Bars', ['Y16 bars', 'Binding wire'])
    ])
];

const PILE_FOUNDATION_EXTRA = [
    section('pile_specifics', '6. PILE FOUNDATION SPECIALS', [
        item('Driven/spun pile installation to design depth', 'm', 2200, 58000, 'Pile Driving', ['RC piles', 'Pile hammer']),
        item('Pile head trimming, hacking and blinding', 'Nr', 240, 28500, 'Pile Head Treatment', ['Demolition tools', 'Concrete blinding']),
        item('Pile load tests and dynamic monitoring', 'Nr', 20, 850000, 'Load Testing', ['Load test frame', 'Monitoring gauges'])
    ])
];

const COASTAL_WORKS_SECTIONS = [
    section('marine_mobilization', '1. SITE MOBILIZATION, DREDGING & RECLAMATION', [
        item('Mobilization of marine plant and support barges', 'Sum', 1, 28500000, 'Site Mobilization', ['Barges', 'Tugboat', 'Fuel']),
        item('Capital dredging to required depth and channel profile', 'm³', 48500, 14500, 'Dredging', ['Dredger', 'Discharge pipeline']),
        item('Hydraulic sand filling and land reclamation', 'm³', 92000, 12800, 'Reclamation', ['Sand fill', 'Booster pump'])
    ]),
    section('marine_geotech', '2. GEOTEXTILE, SHEET PILING & RETAINING STRUCTURES', [
        item('Geotextile filter layer installation', 'm²', 28500, 5200, 'Geotextile Installation', ['Geotextile fabric', 'Pins']),
        item('Steel sheet pile driving and anchoring', 'm²', 12400, 118000, 'Sheet Piling', ['Sheet piles', 'Tie rods']),
        item('Concrete retaining wall and capping beam', 'm³', 2350, 182000, 'Retaining Structure', ['Concrete', 'Reinforcement', 'Formwork'])
    ]),
    section('marine_protection', '3. ROCK ARMOUR, REVETMENT & WAVE PROTECTION', [
        item('Rock armour placement to designed gradation', 'Tonne', 82500, 39500, 'Rock Armour', ['Rock armour stone', 'Excavator']),
        item('Concrete revetment slabs with toe beam', 'm²', 12800, 62000, 'Concrete Revetment', ['Concrete', 'Reinforcement', 'Joint filler']),
        item('Wave return walls and crest protection details', 'm', 3800, 86500, 'Wave Protection', ['Concrete', 'Steel reinforcement'])
    ]),
    section('marine_utilities', '4. DRAINAGE OUTLET, ACCESS ROAD & CONCRETE WORKS', [
        item('Marine drainage outfall structure', 'Sum', 1, 12500000, 'Drainage Outlet', ['Concrete', 'HDPE pipes', 'Flap valve']),
        item('Access road to reclaimed area and crest', 'm²', 18500, 13800, 'Access Road', ['Laterite', 'Stone base', 'Asphalt']),
        item('Reinforcement and concrete works to ancillary structures', 'm³', 1650, 168000, 'Concrete Works', ['Cement', 'Y12/Y16 bars', 'Formwork'])
    ]),
    section('marine_erosion', '5. EROSION CONTROL WORKS', [
        item('Gabion mattress and gabion wall installation', 'm³', 5600, 42500, 'Erosion Control', ['Gabion baskets', 'Quarry stone']),
        item('Hydroseeding and slope turfing to embankments', 'm²', 12800, 7500, 'Bioengineering', ['Grass seed', 'Topsoil']),
        item('Monitoring monuments and shoreline instrumentation', 'Nr', 85, 165000, 'Monitoring Works', ['Survey markers', 'Instrumentation'])
    ])
];

const JETTY_EXTRA = [
    section('jetty_structures', '6. JETTY / BERTH STRUCTURAL WORKS', [
        item('Marine piles for jetty deck support', 'm', 1850, 680000, 'Jetty Piling', ['Steel tubular piles', 'Corrosion protection']),
        item('Deck beams and slab for berth platform', 'm³', 1250, 215000, 'Jetty Deck', ['Concrete Grade 40', 'Reinforcement']),
        item('Fender system, bollards and mooring fittings', 'Set', 28, 1850000, 'Marine Furniture', ['Fenders', 'Bollards', 'Anchor bolts'])
    ])
];

const buildSections = (...sectionGroups) => sectionGroups.flatMap((group) => group);

export const STRUCTURE_DATA = {
    [STRUCTURE_CATEGORIES.BUILDING]: {
        icon: '🏠',
        subtypes: {
            'Bungalow': {
                description: 'Single-storey detailed professional BOQ',
                sections: scaleSections(BUILDING_WORKS_SECTIONS, 0.75)
            },
            'Duplex': {
                description: 'Two-storey reinforced frame BOQ',
                sections: scaleSections(BUILDING_WORKS_SECTIONS, 1.1)
            },
            'High-rise Building': {
                description: 'High-density tower with specialist systems',
                sections: buildSections(scaleSections(BUILDING_WORKS_SECTIONS, 2.6), scaleSections(BUILDING_HIGHRISE_EXTRA, 1.4))
            },
            'Commercial Building': {
                description: 'Retail and office complex with MEP depth',
                sections: buildSections(scaleSections(BUILDING_WORKS_SECTIONS, 1.9), COMMERCIAL_EXTRA)
            },
            'Hospital': {
                description: 'Healthcare facility with clinical installations',
                sections: buildSections(scaleSections(BUILDING_WORKS_SECTIONS, 1.6), HOSPITAL_EXTRA)
            },
            'Warehouse': {
                description: 'Industrial warehouse with heavy-duty structural package',
                sections: buildSections(scaleSections(BUILDING_WORKS_SECTIONS, 1.25), WAREHOUSE_EXTRA)
            }
        }
    },
    [STRUCTURE_CATEGORIES.ROAD]: {
        icon: '🛣️',
        subtypes: {
            'Flexible Pavement': {
                description: 'Detailed asphaltic road works BOQ',
                sections: scaleSections(ROAD_WORKS_SECTIONS, 1)
            },
            'CRCP': {
                description: 'Continuously reinforced concrete pavement with full detailing',
                sections: scaleSections(ROAD_CRCP_SECTIONS, 1)
            },
            'Dual Carriageway': {
                description: 'High-capacity dual carriageway with medians and utilities',
                sections: buildSections(scaleSections(ROAD_WORKS_SECTIONS, 1.9), ROAD_DUAL_EXTRA)
            }
        }
    },
    [STRUCTURE_CATEGORIES.BRIDGE]: {
        icon: '🌉',
        subtypes: {
            'Beam Bridge': {
                description: 'Comprehensive beam bridge estimate',
                sections: scaleSections(BRIDGE_WORKS_SECTIONS, 1)
            },
            'Arch Bridge': {
                description: 'Arch bridge with additional specialized rib works',
                sections: buildSections(scaleSections(BRIDGE_WORKS_SECTIONS, 1.2), ARCH_BRIDGE_EXTRA)
            }
        }
    },
    [STRUCTURE_CATEGORIES.DRAINAGE]: {
        icon: '🚰',
        subtypes: {
            'Box Culvert': {
                description: 'Multi-cell drainage and culvert estimate',
                sections: scaleSections(DRAINAGE_WORKS_SECTIONS, 1)
            },
            'U-Drain': {
                description: 'Open drain system with precast and in-situ sections',
                sections: buildSections(scaleSections(DRAINAGE_WORKS_SECTIONS, 0.72), U_DRAIN_EXTRA)
            }
        }
    },
    [STRUCTURE_CATEGORIES.FOUNDATION]: {
        icon: '👇',
        subtypes: {
            'Raft Foundation': {
                description: 'Detailed raft and ground beam foundation package',
                sections: scaleSections(FOUNDATION_WORKS_SECTIONS, 1)
            },
            'Pile Foundation': {
                description: 'Deep foundation with load testing and pile cap works',
                sections: buildSections(scaleSections(FOUNDATION_WORKS_SECTIONS, 1.25), PILE_FOUNDATION_EXTRA)
            }
        }
    },
    [STRUCTURE_CATEGORIES.COASTAL]: {
        icon: '🌊',
        subtypes: {
            'Shore Protection': {
                description: 'Coastal protection with dredging, revetment and armour',
                sections: scaleSections(COASTAL_WORKS_SECTIONS, 1)
            },
            'Jetty': {
                description: 'Marine jetty with structural and shoreline protection works',
                sections: buildSections(scaleSections(COASTAL_WORKS_SECTIONS, 1.25), JETTY_EXTRA)
            }
        }
    }
};
