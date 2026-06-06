import { patchDocumentByPath, listCollectionDocuments } from './firestore.js';
import {
  createMarketIndexDocId,
  createMarketMaterialDocId,
  syncMarketIndicesFromFeed,
  syncMaterialsFromMarketFeed,
  selfUpdateMarketData,
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

  const { materials: driftedMaterials, indices: driftedIndices } = selfUpdateMarketData({
    materials: materialSync.materials,
    indices: indexSync.indices,
    asOfDate: new Date(),
  });

  for (const material of driftedMaterials) {
    const docId = material.id || slugifyMaterialName(material.name);
    const payload = buildMaterialBenchmarkPayload(material);
    await patchDocumentByPath(`materials/${docId}`, payload);
  }

  for (const indexEntry of driftedIndices) {
    const docId = indexEntry.id || slugifyIndexLabel(indexEntry.label);
    const { id: _id, ...indexPayload } = indexEntry;
    await patchDocumentByPath(`market_indices/${docId}`, {
      ...indexPayload,
    });
  }

  return {
    materials: {
      ...materialSync.summary,
      driftedCount: driftedMaterials.filter((m, i) => m.nextReviewAt !== materialSync.materials[i]?.nextReviewAt).length,
    },
    indices: indexSync.summary,
  };
}
