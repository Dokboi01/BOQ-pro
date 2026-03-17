import { STRUCTURE_DATA } from './src/data/structures.js';

let errors = 0;
for (const [cat, data] of Object.entries(STRUCTURE_DATA)) {
    for (const [sub, subData] of Object.entries(data.subtypes)) {
        for (const sec of subData.sections) {
            if (!sec.items) {
                console.log(`[ERR] Missing items array in ${cat} -> ${sub} -> ${sec.title}`);
                errors++;
                continue;
            }
            for (const item of sec.items) {
                if (typeof item.description !== 'string') {
                    console.log(`[ERR] Missing description: ${cat} -> ${sub} -> ${sec.title} -> ${JSON.stringify(item)}`);
                    errors++;
                }
                if (typeof item.unit !== 'string') {
                    console.log(`[ERR] Missing unit: ${cat} -> ${sub} -> ${sec.title} -> ${JSON.stringify(item)}`);
                    errors++;
                }
            }
        }
    }
}
if (errors === 0) console.log("✅ STRUCTURE_DATA is perfectly formatted.");
