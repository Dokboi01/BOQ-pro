/* global process */

/**
 * market-price-proposals.js  (Vercel API route)
 *
 * GET  /api/market-price-proposals?status=pending   — list proposals
 * PATCH /api/market-price-proposals                 — approve / reject / edit a proposal
 * POST  /api/market-price-proposals/apply           — apply all approved proposals to materials
 */

import { handleOptions, readJsonBody, sendJson } from './_lib/http.js';
import { requireFirebaseAuth } from './_lib/firebase-auth.js';
import {
  listCollectionDocuments,
  patchDocumentByPath,
  createDocument,
  listDocumentsByField,
} from './_lib/firestore.js';
import { buildMaterialBenchmarkPayload } from '../src/utils/materialBenchmarks.js';

// ─── Auth Guard ───────────────────────────────────────────────────────────────

const isAdmin = (claims) => Boolean(claims?.admin);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const slugify = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  let claims;
  try {
    claims = await requireFirebaseAuth(req);
  } catch (err) {
    return sendJson(res, 401, { error: err.message || 'Unauthorized.' });
  }

  if (!isAdmin(claims)) {
    return sendJson(res, 403, { error: 'Admin access required.' });
  }

  // ── GET — List proposals ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const status = String(req.query?.status || '').trim() || null;
      const all = await listCollectionDocuments('market_price_proposals');
      const filtered = status
        ? all.filter((p) => p.status === status)
        : all;

      // Sort: pending first, then by proposedAt desc
      filtered.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return (b.proposedAt || '').localeCompare(a.proposedAt || '');
      });

      return sendJson(res, 200, { proposals: filtered, total: filtered.length });
    } catch (err) {
      return sendJson(res, 500, { error: err.message || 'Failed to list proposals.' });
    }
  }

  // ── PATCH — Approve / Reject / Edit ──────────────────────────────────────
  if (req.method === 'PATCH') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON body.' });
    }

    const { proposalId, action, overrides } = body || {};

    if (!proposalId || !['approve', 'reject', 'edit'].includes(action)) {
      return sendJson(res, 400, { error: 'proposalId and action (approve|reject|edit) are required.' });
    }

    try {
      const reviewedAt = new Date().toISOString();
      const reviewedBy = String(claims?.email || claims?.user_id || 'admin');

      let update = {
        reviewedAt,
        reviewedBy,
        status: action === 'approve' ? 'approved'
          : action === 'reject' ? 'rejected'
            : 'pending', // 'edit' keeps status as pending until explicitly approved
      };

      // Allow desk to override the proposed values before approving
      if (overrides && typeof overrides === 'object') {
        if (overrides.proposedPrice !== undefined) update.proposedPrice = Number(overrides.proposedPrice);
        if (overrides.proposedBenchmark !== undefined) update.proposedBenchmark = Number(overrides.proposedBenchmark);
        if (overrides.proposedRange !== undefined) update.proposedRange = String(overrides.proposedRange);
        if (overrides.proposedTrend !== undefined) update.proposedTrend = String(overrides.proposedTrend);
        if (overrides.proposedDelta !== undefined) update.proposedDelta = String(overrides.proposedDelta);
        if (overrides.deskNote !== undefined) update.deskNote = String(overrides.deskNote);
      }

      await patchDocumentByPath(`market_price_proposals/${proposalId}`, update);

      // If approving, immediately apply to the materials collection
      if (action === 'approve') {
        const allMaterials = await listCollectionDocuments('materials');
        const allProposals = await listCollectionDocuments('market_price_proposals');
        const proposal = allProposals.find((p) => p.id === proposalId) || {};
        const merged = { ...proposal, ...update };

        const materialId = merged.materialId || slugify(merged.materialName);
        const existing = allMaterials.find(
          (m) => m.id === materialId || slugify(m.name) === slugify(merged.materialName)
        );

        if (existing) {
          const payload = buildMaterialBenchmarkPayload({
            ...existing,
            price: merged.proposedPrice,
            benchmark: merged.proposedBenchmark,
            trend: merged.proposedTrend,
            delta: merged.proposedDelta,
            range: merged.proposedRange,
            approvalStatus: 'approved',
            approvedAt: reviewedAt,
            approvedBy: reviewedBy,
            updatedAt: reviewedAt,
            verifiedBy: reviewedBy,
            benchmarkDeskNote: merged.deskNote || merged.aiNote || 'Approved by market desk.',
            sources: [
              {
                label: `Market desk approval (${new Date(reviewedAt).toLocaleDateString('en-NG')})`,
                type: 'desk-approval',
                region: 'Nigeria',
                rate: merged.proposedPrice,
                capturedAt: reviewedAt,
                note: merged.deskNote || merged.aiNote || '',
              },
              ...(Array.isArray(existing.sources) ? existing.sources.slice(0, 4) : []),
            ],
          });

          const targetId = existing.id || materialId;
          await patchDocumentByPath(`materials/${targetId}`, payload);

          // Mark proposal as applied
          await patchDocumentByPath(`market_price_proposals/${proposalId}`, {
            status: 'applied',
            appliedAt: reviewedAt,
          });
        }

        return sendJson(res, 200, {
          success: true,
          action,
          proposalId,
          materialUpdated: Boolean(existing),
        });
      }

      return sendJson(res, 200, { success: true, action, proposalId });
    } catch (err) {
      console.error('[market-price-proposals] PATCH failed:', err);
      return sendJson(res, 500, { error: err.message || 'Failed to update proposal.' });
    }
  }

  return sendJson(res, 405, { error: 'Method not allowed.' });
}
