/* global process */

/**
 * materialPriceResearcher.js
 *
 * Uses Gemini (with OpenAI fallback) to research current Nigerian construction
 * material prices and returns structured pending proposals for market desk review.
 *
 * This module does NOT write to Firestore — it only returns proposals.
 * The caller decides whether to persist them.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// ─── AI Clients ──────────────────────────────────────────────────────────────

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  return apiKey ? new GoogleGenerativeAI(apiKey) : null;
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey }) : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const slugify = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const clamp = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatNaira = (value) =>
  `₦${Math.round(clamp(value)).toLocaleString('en-NG')}`;

/**
 * Returns true if a material is overdue for AI reconfirmation.
 * A material is overdue if nextReviewAt is in the past or missing.
 */
function isOverdueForReview(material, asOfDate = new Date()) {
  const nextReview = material?.nextReviewAt;
  if (!nextReview) return true;
  const reviewTime = new Date(nextReview).getTime();
  return !Number.isNaN(reviewTime) && asOfDate.getTime() > reviewTime;
}

/**
 * Parses a raw AI JSON response into an array, handling markdown wrapping.
 */
function parseAIResponse(raw) {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : (parsed.proposals || parsed.materials || parsed.results || []);
}

/**
 * Validates and normalises a single AI proposal object.
 * Ensures all required fields are present and types are correct.
 */
function normaliseProposal(raw, original) {
  const proposedPrice = clamp(raw?.proposedPrice || raw?.price);
  const proposedBenchmark = clamp(raw?.proposedBenchmark || raw?.benchmark || proposedPrice * 0.97);
  const currentPrice = clamp(original?.price || original?.currentRead);

  if (proposedPrice <= 0) return null;

  const delta = currentPrice > 0
    ? `${proposedPrice >= currentPrice ? '+' : ''}${(((proposedPrice - currentPrice) / currentPrice) * 100).toFixed(1)}%`
    : '0.0%';

  const trend = currentPrice > 0
    ? (proposedPrice > currentPrice * 1.005 ? 'up' : proposedPrice < currentPrice * 0.995 ? 'down' : 'stable')
    : 'stable';

  const low = Math.round(proposedBenchmark * 0.93);
  const high = Math.round(proposedPrice * 1.05);
  const proposedRange = raw?.proposedRange || `${formatNaira(low)} - ${formatNaira(high)}`;

  return {
    materialName: original.name,
    materialId: original.id || slugify(original.name),
    category: original.category || '',
    unit: original.unit || '',
    currentPrice,
    currentBenchmark: clamp(original?.benchmark),
    proposedPrice,
    proposedBenchmark: Math.round(proposedBenchmark),
    proposedRange,
    proposedTrend: raw?.proposedTrend || trend,
    proposedDelta: raw?.proposedDelta || delta,
    aiNote: String(raw?.aiNote || raw?.note || '').trim().slice(0, 400),
    confidence: clamp(raw?.confidence) || 0.65,
  };
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildResearchPrompt(batch, capturedAt) {
  const dateLabel = new Date(capturedAt).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const materialsList = batch
    .map((m) => {
      const currentPrice = clamp(m.price || m.currentRead);
      const lastUpdated = m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('en-NG') : 'unknown';
      return `- ${m.name} (${m.category}, per ${m.unit}): currently ₦${currentPrice.toLocaleString('en-NG')}, last updated ${lastUpdated}`;
    })
    .join('\n');

  return {
    systemPrompt: `You are a senior Nigerian construction market analyst with deep expertise in building material pricing across Lagos, Abuja, Port Harcourt, and major regional hubs. You have up-to-date knowledge of the Nigerian construction supply chain, cement import dynamics, steel rebar markets, aggregate haulage costs, and the impact of FX rates and diesel prices on material costs.

Your task is to estimate the current fair-market retail prices for Nigerian construction materials as of ${dateLabel}. You must base your estimates on:
1. Known market trends and price trajectories for each material category
2. Recent inflationary pressures in the Nigerian economy (FX, diesel, port charges)
3. Supply and demand dynamics specific to each material
4. The last known prices provided — use them as a reference anchor, not as a ceiling or floor

Be realistic. Do not simply copy the current prices — provide genuine market-informed estimates. If you believe a price has changed, say so and explain why briefly.`,

    userPrompt: `Research and estimate the current Nigerian market prices for the following construction materials as of ${dateLabel}.

Current reference prices (may be outdated):
${materialsList}

For EACH material, return a JSON object in this exact schema:
{
  "name": "exact material name from the list",
  "proposedPrice": <integer - retail market price per unit in Nigerian Naira>,
  "proposedBenchmark": <integer - conservative planning benchmark, typically 3-5% below proposedPrice>,
  "proposedRange": "₦X,XXX - ₦X,XXX",
  "proposedTrend": "up" | "down" | "stable",
  "proposedDelta": "+X.X%" or "-X.X%",
  "aiNote": "1-2 sentence explanation of price drivers and any notable market development",
  "confidence": <0.5 to 0.95 - how confident you are in this estimate>
}

Return ONLY a valid JSON array of these objects, one per material. No markdown, no explanation outside the JSON.`,
  };
}

// ─── AI Runners ───────────────────────────────────────────────────────────────

async function runGemini(systemPrompt, userPrompt) {
  const client = getGeminiClient();
  if (!client) throw new Error('GEMINI_API_KEY not configured.');
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
  });
  const result = await model.generateContent(`${systemPrompt}\n\n---\n\n${userPrompt}`);
  return result.response.text();
}

async function runOpenAI(systemPrompt, userPrompt) {
  const client = getOpenAIClient();
  if (!client) throw new Error('OPENAI_API_KEY not configured.');
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  return response.choices?.[0]?.message?.content || '[]';
}

async function runWithFallback(systemPrompt, userPrompt) {
  const preferGemini = Boolean(process.env.GEMINI_API_KEY);
  const providers = preferGemini
    ? [() => runGemini(systemPrompt, userPrompt), () => runOpenAI(systemPrompt, userPrompt)]
    : [() => runOpenAI(systemPrompt, userPrompt), () => runGemini(systemPrompt, userPrompt)];

  let lastError;
  for (const provider of providers) {
    try {
      return await provider();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('No AI provider configured for market research.');
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Researches current Nigerian market prices for materials that are overdue
 * for reconfirmation.
 *
 * @param {object} options
 * @param {Array}  options.materials   - Array of current Firestore material docs
 * @param {Date}   [options.asOfDate]  - Reference date (defaults to now)
 * @param {number} [options.batchSize] - How many materials per AI call (default 8)
 * @param {boolean}[options.forceAll]  - If true, research ALL materials, not just overdue ones
 * @returns {Promise<Array>} Array of validated proposal objects
 */
export async function researchMaterialPrices({
  materials = [],
  asOfDate = new Date(),
  batchSize = 8,
  forceAll = false,
} = {}) {
  const capturedAt = asOfDate.toISOString();

  // Filter to materials that need research
  const targets = forceAll
    ? materials
    : materials.filter((m) => isOverdueForReview(m, asOfDate));

  if (targets.length === 0) {
    return { proposals: [], skippedCount: materials.length, researchedCount: 0 };
  }

  // Split into batches
  const batches = [];
  for (let i = 0; i < targets.length; i += batchSize) {
    batches.push(targets.slice(i, i + batchSize));
  }

  const allProposals = [];
  const errors = [];

  for (const batch of batches) {
    try {
      const { systemPrompt, userPrompt } = buildResearchPrompt(batch, capturedAt);
      const raw = await runWithFallback(systemPrompt, userPrompt);
      const parsed = parseAIResponse(raw);

      // Match each parsed result back to its original material doc
      for (const rawProposal of parsed) {
        const originalName = String(rawProposal?.name || '').trim();
        const original = batch.find(
          (m) => slugify(m.name) === slugify(originalName)
        ) || batch.find(
          (m) => m.name.toLowerCase().includes(originalName.toLowerCase().slice(0, 12))
        );

        if (!original) continue;

        const proposal = normaliseProposal(rawProposal, original);
        if (proposal) {
          allProposals.push({
            ...proposal,
            status: 'pending',
            actor: 'Quantra Market Bot',
            proposedAt: capturedAt,
            reviewedAt: null,
            reviewedBy: null,
            snapshotId: `ai-research-${asOfDate.getFullYear()}-${String(asOfDate.getMonth() + 1).padStart(2, '0')}-${String(asOfDate.getDate()).padStart(2, '0')}`,
          });
        }
      }
    } catch (err) {
      console.error('[MaterialPriceResearcher] Batch research failed:', err.message);
      errors.push({ batch: batch.map((m) => m.name), error: err.message });
    }
  }

  return {
    proposals: allProposals,
    researchedCount: targets.length,
    skippedCount: materials.length - targets.length,
    proposalCount: allProposals.length,
    errorCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Checks whether an AI research run is due, based on the last research timestamp
 * stored in Firestore config.
 *
 * @param {object|null} configDoc   - The Firestore config/market_sync document
 * @param {number}      cycleDays   - How often to run AI research (default 14)
 * @param {Date}        asOfDate    - Reference date
 * @returns {boolean}
 */
export function isAIResearchDue(configDoc = null, cycleDays = 14, asOfDate = new Date()) {
  const lastResearch = configDoc?.lastAIResearchAt;
  if (!lastResearch) return true;
  const lastTime = new Date(lastResearch).getTime();
  if (Number.isNaN(lastTime)) return true;
  const cycleMs = cycleDays * 24 * 60 * 60 * 1000;
  return asOfDate.getTime() - lastTime >= cycleMs;
}
