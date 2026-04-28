import { patchDocumentByPath, listCollectionDocuments } from './firestore.js';
import {
  createMarketIndexDocId,
  createMarketMaterialDocId,
  syncMarketIndicesFromFeed,
  syncMaterialsFromMarketFeed,
} from '../../src/utils/materialMarketSync.js';
import { buildMaterialBenchmarkPayload } from '../../src/utils/materialBenchmarks.js';

const slugifyIndexLabel = (label = '') => createMarketIndexDocId(label);
const slugifyMaterialName = (name = '') => createMarketMaterialDocId(name);

export async function runMaterialMarketSync({ actor } = {}) {
  const [existingMaterials, existingIndices] = await Promise.all([
    listCollectionDocuments('materials'),
    listCollectionDocuments('market_indices'),
  ]);

  const materialSync = syncMaterialsFromMarketFeed({
    existingMaterials,
    actor,
  });
  const indexSync = syncMarketIndicesFromFeed(existingIndices);

  for (const material of materialSync.materials) {
    const docId = material.id || slugifyMaterialName(material.name);
    const payload = buildMaterialBenchmarkPayload(material);
    await patchDocumentByPath(`materials/${docId}`, payload);
  }

  for (const indexEntry of indexSync.indices) {
    const docId = indexEntry.id || slugifyIndexLabel(indexEntry.label);
    const { id: _id, ...indexPayload } = indexEntry;
    await patchDocumentByPath(`market_indices/${docId}`, {
      ...indexPayload,
    });
  }

  return {
    materials: materialSync.summary,
    indices: indexSync.summary,
  };
}
