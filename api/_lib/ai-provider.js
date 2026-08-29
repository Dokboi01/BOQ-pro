/* global process */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { listCollectionDocuments } from './firestore.js';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_TEXT_LENGTH = 8_000;
const MAX_FILE_LENGTH = 20_000;
const MAX_IMAGE_LENGTH = 7_000_000;

const rateLimitMap = new Map();

const DISALLOWED_PATTERNS = [
  /system:\s*override/i,
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
];

function normalizeProvider(value) {
  return String(value || '').toLowerCase() === 'gemini' ? 'gemini' : 'openai';
}

function normalizeModel(value) {
  return String(value || process.env.OPENAI_MODEL || 'gpt-4o').trim() || 'gpt-4o';
}

function sanitizeText(input, maxLength = MAX_TEXT_LENGTH) {
  if (typeof input !== 'string') return '';

  let output = input.slice(0, maxLength);
  for (const pattern of DISALLOWED_PATTERNS) {
    output = output.replace(pattern, '[filtered]');
  }
  return output.trim();
}

function sanitizeBase64Image(base64Image) {
  if (typeof base64Image !== 'string') return '';
  // Previously silently truncated oversized images with .slice() -- cutting
  // off a base64-encoded image mid-stream doesn't produce a smaller valid
  // image, it produces corrupted bytes that fail to decode (or, worse,
  // decode into visual noise the model would try to "read" anyway). The
  // client now validates file size before upload, so this should only ever
  // trigger if that's bypassed -- reject clearly rather than corrupt silently.
  if (base64Image.length > MAX_IMAGE_LENGTH) {
    const err = new Error('Drawing image is too large to analyze. Please upload a smaller image.');
    err.status = 400;
    throw err;
  }
  return base64Image;
}

function getRequestIdentity({ uid, ip, action }) {
  const safeUid = String(uid || '').trim();
  const safeIp = String(ip || '').trim();
  return `${safeUid || safeIp || 'anonymous'}:${action}`;
}

function checkRateLimit(identity) {
  const now = Date.now();
  const entry = rateLimitMap.get(identity);

  if (entry && now - entry.windowStart < RATE_LIMIT_WINDOW_MS) {
    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
      return { allowed: false, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - entry.windowStart) };
    }

    entry.count += 1;
    return { allowed: true };
  }

  rateLimitMap.set(identity, { windowStart: now, count: 1 });

  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap) {
      if (now - value.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(key);
      }
    }
  }

  return { allowed: true };
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

async function runOpenAIText({ model, systemPrompt, userPrompt }) {
  const client = getOpenAIClient();
  if (!client) throw new Error('OpenAI API key is not configured on the server.');

  const response = await client.chat.completions.create({
    model: normalizeModel(model),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  return response.choices?.[0]?.message?.content || '';
}

async function runGeminiText({ systemPrompt, userPrompt }) {
  const client = getGeminiClient();
  if (!client) throw new Error('Gemini API key is not configured on the server.');

  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(`${systemPrompt}\n\n---\n\n${userPrompt}`);
  return result.response.text();
}

async function runOpenAIVision({ model, systemPrompt, userPrompt, base64Image, mimeType }) {
  const client = getOpenAIClient();
  if (!client) throw new Error('OpenAI API key is not configured on the server.');

  const response = await client.chat.completions.create({
    model: normalizeModel(model),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `${systemPrompt}\n\n${userPrompt}` },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${sanitizeBase64Image(base64Image)}`,
            },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
  });

  return response.choices?.[0]?.message?.content || '';
}

async function runGeminiVision({ systemPrompt, userPrompt, base64Image, mimeType }) {
  const client = getGeminiClient();
  if (!client) throw new Error('Gemini API key is not configured on the server.');

  // The OpenAI vision call forces response_format: json_object; without an
  // equivalent constraint here, Gemini is free to wrap the JSON in prose
  // ("Here's the analysis:\n\n```json...") which parseJsonResponse's simple
  // fence-stripping won't fully clean up, failing to parse and (before the
  // earlier fix) silently falling back to fake data. responseMimeType
  // forces a clean JSON body the same way OpenAI's json_object mode does.
  const model = client.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
  const imagePart = {
    inlineData: {
      data: sanitizeBase64Image(base64Image),
      mimeType,
    },
  };
  const result = await model.generateContent([`${systemPrompt}\n\n${userPrompt}`, imagePart]);
  return result.response.text();
}

async function runWithFallback({ preferredProvider, model, systemPrompt, userPrompt, base64Image = null, mimeType = 'image/png', vision = false }) {
  const provider = normalizeProvider(preferredProvider);
  const candidates = provider === 'openai'
    ? ['openai', 'gemini']
    : ['gemini', 'openai'];

  let lastError = null;

  for (const candidate of candidates) {
    try {
      if (candidate === 'openai') {
        return {
          provider: 'openai',
          model: normalizeModel(model),
          content: vision
            ? await runOpenAIVision({ model, systemPrompt, userPrompt, base64Image, mimeType })
            : await runOpenAIText({ model, systemPrompt, userPrompt }),
        };
      }

      return {
        provider: 'gemini',
        model: vision ? 'gemini-1.5-flash' : 'gemini-2.0-flash',
        content: vision
          ? await runGeminiVision({ systemPrompt, userPrompt, base64Image, mimeType })
          : await runGeminiText({ systemPrompt, userPrompt }),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No AI provider is configured on the server.');
}

function createTextPrompt(prefix, payload) {
  return sanitizeText(`${prefix}\n\n${payload}`, MAX_TEXT_LENGTH);
}

function parseJsonResponse(content) {
  const trimmed = String(content || '').trim();
  const cleaned = trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const candidates = [
      [cleaned.indexOf('{'), cleaned.lastIndexOf('}')],
      [cleaned.indexOf('['), cleaned.lastIndexOf(']')],
    ]
      .filter(([start, end]) => start >= 0 && end > start)
      .map(([start, end]) => cleaned.slice(start, end + 1));

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch {
        // Try the next extractable JSON candidate.
      }
    }

    throw error;
  }
}

const DRAWING_ELEMENT_KEYS = [
  'elements',
  'items',
  'results',
  'structuralElements',
  'boqItems',
  'lineItems',
  'components',
  'quantities',
];

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStructuralDetails(value = {}) {
  if (isObject(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    return { notes: value.trim() };
  }
  return null;
}

function normalizeDrawingElement(entry, fallbackCategory = 'Identified Elements') {
  if (!isObject(entry)) return null;

  const rawItem = entry.item || entry.name || entry.title || entry.element || entry.description;
  const rawDescription = entry.description || entry.scope || entry.notes || rawItem;
  const item = sanitizeText(String(rawItem || '').trim(), 240);
  const description = sanitizeText(String(rawDescription || '').trim(), 500);

  if (!item && !description) return null;

  const rawQuantity = entry.quantity ?? entry.qty ?? entry.measurement ?? entry.takeoff ?? entry.count ?? '';
  const quantity = String(rawQuantity || '').trim() || '1 item';
  const category = sanitizeText(String(
    entry.category
    || entry.section
    || entry.billSection
    || entry.trade
    || fallbackCategory
  ).trim(), 160) || 'Identified Elements';

  return {
    category,
    item: item || description,
    description: description || item,
    quantity,
    structuralDetails: normalizeStructuralDetails(
      entry.structuralDetails
      || entry.details
      || {
        dimensions: entry.dimensions || null,
        reinforcement: entry.reinforcement || null,
        notes: entry.notes || null,
      }
    ),
  };
}

function collectDrawingElements(payload, fallbackCategory = 'Identified Elements') {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => normalizeDrawingElement(entry, fallbackCategory))
      .filter(Boolean);
  }

  if (!isObject(payload)) return [];

  if (Array.isArray(payload.sections)) {
    return payload.sections.flatMap((section) => (
      collectDrawingElements(
        section.items || section.elements || section.lineItems || [],
        section.title || section.category || fallbackCategory
      )
    ));
  }

  for (const key of DRAWING_ELEMENT_KEYS) {
    if (Array.isArray(payload[key])) {
      return collectDrawingElements(payload[key], fallbackCategory);
    }
  }

  const singleElement = normalizeDrawingElement(payload, fallbackCategory);
  return singleElement ? [singleElement] : [];
}

export async function generateRateInsight({ item = {}, context = {}, preferredProvider, model, uid, ip } = {}) {
  const identity = getRequestIdentity({ uid, ip, action: 'rate-insight' });
  const limit = checkRateLimit(identity);
  if (!limit.allowed) {
    const err = new Error('Rate limit exceeded. Please wait before sending another request.');
    err.status = 429;
    err.retryAfterMs = limit.retryAfterMs;
    throw err;
  }

  const description = sanitizeText(item.description || 'Unknown item');
  const region = sanitizeText(context.region || 'Lagos');
  const userRate = Number(item.rate || 0);
  const benchmark = Number(item.benchmark || 0);

  if (!description) {
    const err = new Error('Item description is required.');
    err.status = 400;
    throw err;
  }

  const systemPrompt = 'You are a senior quantity surveyor in Nigeria.';
  const userPrompt = createTextPrompt(
    'Analyze the following BOQ work item and return a concise 2-sentence professional insight.',
    [
      `Item Description: ${description}`,
      `Region: ${region}`,
      `User Rate: ${userRate.toLocaleString()}`,
      `Market Benchmark Rate: ${benchmark ? benchmark.toLocaleString() : 'N/A'}`,
      'Mention whether the rate is realistic and note any price volatility risk.',
    ].join('\n')
  );

  try {
    const result = await runWithFallback({ preferredProvider, model, systemPrompt, userPrompt });
    return {
      provider: result.provider,
      model: result.model,
      summary: String(result.content || '').trim(),
      recommendation: userRate > benchmark * 1.1
        ? 'Negotiate supplier rates - above market benchmark.'
        : 'Rate is within safe market margin.',
      confidence: result.provider === 'openai' ? 95 : 92,
    };
  } catch {
    return {
      summary: 'Unable to reach AI engine. Please check your internet connection.',
      recommendation: 'Manual review required.',
      confidence: 0,
    };
  }
}

export async function generateProjectSummary({ projectData = {}, preferredProvider, model, uid, ip } = {}) {
  const identity = getRequestIdentity({ uid, ip, action: 'project-summary' });
  const limit = checkRateLimit(identity);
  if (!limit.allowed) {
    const err = new Error('Rate limit exceeded. Please wait before sending another request.');
    err.status = 429;
    err.retryAfterMs = limit.retryAfterMs;
    throw err;
  }

  const sectionsDesc = Array.isArray(projectData.sections)
    ? projectData.sections
        .map((section) => {
          const total = (section.items || []).reduce((acc, item) => acc + Number(item.total || 0), 0);
          return `${sanitizeText(section.title || 'Section')}: ₦${total.toLocaleString()}`;
        })
        .join(', ')
    : '';

  const systemPrompt = 'You are a senior quantity surveying consultant.';
  const userPrompt = createTextPrompt(
    'Write a professional 3-sentence executive summary for a project report.',
    [
      `Project: ${sanitizeText(projectData.name || 'Unnamed project')}`,
      `Total Contract Sum: ₦${Number(projectData.totalValue || 0).toLocaleString()}`,
      `Cost Breakdown by Section: ${sectionsDesc || 'N/A'}`,
      'Mention one material cost risk and one professional cost-control recommendation.',
      'Keep it concise and formal.',
    ].join('\n')
  );

  try {
    const result = await runWithFallback({ preferredProvider, model, systemPrompt, userPrompt });
    return {
      provider: result.provider,
      model: result.model,
      summary: String(result.content || '').trim(),
    };
  } catch {
    return {
      summary: 'Unable to generate AI summary. Please review project totals manually.',
    };
  }
}

const SUPPORTED_DRAWING_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function analyzeEngineeringDrawing({ base64Image, contextHint = '', mimeType, preferredProvider, model, uid, ip } = {}) {
  const identity = getRequestIdentity({ uid, ip, action: 'drawing-analysis' });
  const limit = checkRateLimit(identity);
  if (!limit.allowed) {
    const err = new Error('Rate limit exceeded. Please wait before sending another request.');
    err.status = 429;
    err.retryAfterMs = limit.retryAfterMs;
    throw err;
  }

  if (!base64Image) {
    const err = new Error('Drawing image is required.');
    err.status = 400;
    throw err;
  }

  // The vision APIs need an accurate MIME type to decode the image bytes
  // correctly -- previously this was hardcoded to image/png regardless of
  // what was actually uploaded, so a JPEG or WEBP (or anything else the
  // client's file picker allowed through) would be mislabeled and could
  // fail to decode or produce garbled reads. Validate server-side too
  // (not just trusting the client) since this is a real input, not just a
  // UI hint.
  const normalizedMimeType = SUPPORTED_DRAWING_MIME_TYPES.has(mimeType) ? mimeType : null;
  if (!normalizedMimeType) {
    const err = new Error('Unsupported image type. Please upload a PNG, JPG, or WEBP image.');
    err.status = 400;
    throw err;
  }

  const systemPrompt = 'You are a highly experienced senior quantity surveyor and structural engineer.';
  const userPrompt = createTextPrompt(
    'Analyze this engineering drawing/blueprint and return a valid JSON object of measurable BOQ elements.',
    [
      `USER CONTEXT: ${sanitizeText(contextHint || 'None provided. Use your best professional judgment.')}`,
      'Return ONLY valid JSON with this shape: {"elements":[{"category":"","item":"","description":"","quantity":"","structuralDetails":{"dimensions":"","reinforcement":""}}]}.',
      'If the image is not a readable engineering drawing or no measurable construction element can be identified, return {"elements":[]}.',
    ].join('\n')
  );

  try {
    const result = await runWithFallback({
      preferredProvider,
      model,
      systemPrompt,
      userPrompt,
      base64Image,
      mimeType: normalizedMimeType,
      vision: true,
    });

    const parsed = parseJsonResponse(result.content);
    const elements = collectDrawingElements(parsed);

    if (elements.length === 0) {
      const err = new Error('No measurable BOQ elements were identified in the drawing. Please upload a clearer plan, section, detail, or schedule.');
      err.status = 422;
      throw err;
    }

    return elements;
  } catch (error) {
    // Previously fell back to hardcoded fake "results" (same 4 sections every
    // time, regardless of what was actually uploaded) shaped completely
    // differently from a real response (title/confidence/items vs. the
    // documented category/item/description/quantity/structuralDetails) --
    // silently presenting fabricated data as if it were real analysis of the
    // user's drawing. Surface the failure instead so the client's existing
    // error-handling UI (DrawingAnalyzer.jsx) can show it honestly.
    const err = new Error(
      error instanceof SyntaxError
        ? 'AI returned a malformed response. Please try again with a clearer image.'
        : (error?.message || 'Unable to analyze the drawing. Please try again.')
    );
    err.status = error?.status || 502;
    throw err;
  }
}

export async function analyzeStructuralFile({ fileContent, fileName = 'structural_design.csv', preferredProvider, model, uid, ip } = {}) {
  const identity = getRequestIdentity({ uid, ip, action: 'structural-file' });
  const limit = checkRateLimit(identity);
  if (!limit.allowed) {
    const err = new Error('Rate limit exceeded. Please wait before sending another request.');
    err.status = 429;
    err.retryAfterMs = limit.retryAfterMs;
    throw err;
  }

  const content = sanitizeText(String(fileContent || ''), MAX_FILE_LENGTH);
  if (!content) {
    const err = new Error('Structural file content is required.');
    err.status = 400;
    throw err;
  }

  const systemPrompt = 'You are a senior structural engineer and expert quantity surveyor.';
  const userPrompt = createTextPrompt(
    'Parse the structural data and return only a valid JSON array of BOQ sections.',
    [
      `FILE NAME: ${sanitizeText(fileName)}`,
      'FILE CONTENT:',
      content,
      'Return sections with id, title, and items. Return ONLY JSON.',
    ].join('\n')
  );

  try {
    const result = await runWithFallback({ preferredProvider, model, systemPrompt, userPrompt });
    const cleaned = String(result.content || '').replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [
      {
        id: 'ext-sec-1',
        title: 'Structural Frames (AI Extracted)',
        items: [
          { id: Date.now() + 1, description: 'Reinforced Concrete Columns (C1-C12)', unit: 'm3', qty: 4.5, rate: 0, total: 0, qtySource: 'ai-extracted' },
          { id: Date.now() + 2, description: 'Superstructure Beams (B1-B24)', unit: 'm3', qty: 12.8, rate: 0, total: 0, qtySource: 'ai-extracted' },
          { id: Date.now() + 3, description: 'Floor Slab Panels (S1-S8)', unit: 'm2', qty: 145, rate: 0, total: 0, qtySource: 'ai-extracted' },
        ],
      },
    ];
  }
}

const FALLBACK_MATERIALS = [
  { name: 'OPC Cement (50kg)', price: 12500, unit: 'Bag' },
  { name: 'PPC Cement (50kg)', price: 11800, unit: 'Bag' },
  { name: 'Sharp Sand (Clean)', price: 28000, unit: 'Ton' },
  { name: 'Sharp Sand', price: 22000, unit: 'm³' },
  { name: 'Granite (20mm)', price: 35000, unit: 'Ton' },
  { name: 'Granite (10mm)', price: 36500, unit: 'Ton' },
  { name: 'River Sand', price: 22000, unit: 'Ton' },
  { name: 'River Sand', price: 22000, unit: 'm³' },
  { name: 'Reinforcement Steel (12mm)', price: 1150000, unit: 'Ton' },
  { name: 'Reinforcement Steel (16mm)', price: 1140000, unit: 'Ton' },
  { name: 'Reinforcement Steel (25mm)', price: 1130000, unit: 'Ton' },
  { name: 'BRC Welded Mesh (A252)', price: 85000, unit: 'Sheet' },
  { name: '9-Inch Hollow Block', price: 650, unit: 'Block' },
  { name: '6-Inch Hollow Block', price: 500, unit: 'Block' },
  { name: 'Plywood Formwork (18mm)', price: 8500, unit: 'Sheet' },
  { name: 'Hardwood Timber (2"×4"×12ft)', price: 2200, unit: 'Length' },
  { name: 'Roofing Timber (Purlin 2"×3"×18ft)', price: 2800, unit: 'Length' },
  { name: 'Aluminium Long-Span Roofing (0.55mm)', price: 3800, unit: 'm²' },
  { name: 'Gerard Stone-Coated Roof Tile', price: 6500, unit: 'm²' },
  { name: 'uPVC Pipe (4-inch, Class B)', price: 6500, unit: 'Length' },
  { name: 'PPR Hot & Cold Water Pipe (25mm)', price: 3200, unit: 'Length' },
  { name: 'Armoured Cable (25mm² 4-Core)', price: 22500, unit: 'm' },
  { name: 'PVC Conduit (20mm)', price: 850, unit: 'Length' },
  { name: 'Emulsion Paint (20L)', price: 28500, unit: 'Bucket' },
  { name: 'Gloss Paint (Exterior, 20L)', price: 32000, unit: 'Bucket' },
  { name: 'Ceramic Floor Tile (400×400mm)', price: 4500, unit: 'm²' },
  { name: 'Gypsum Plasterboard (12.5mm)', price: 5800, unit: 'Sheet' },
  { name: 'Aluminium Window Frame (Standard)', price: 18500, unit: 'm²' },
  { name: 'Bituminous Membrane (3mm SBS)', price: 3800, unit: 'm²' },
  { name: 'Crystalline Waterproofing Admixture (25kg)', price: 45000, unit: 'Bag' },
  { name: 'Precast Concrete Pile (300mm)', price: 85000, unit: 'm' },
  { name: 'Geotextile Non-Woven Fabric (200g)', price: 850, unit: 'm²' },
  { name: 'Gabion Basket (2m×1m×1m)', price: 28000, unit: 'Unit' },
  { name: 'Laterite (Filling)', price: 12000, unit: 'm³' },
];

const ANCHOR_REGION_COST_PROFILES = {
  Lagos: { materials: 1, labour: 1, plant: 1, transport: 1, site: 1 },
  Abuja: { materials: 1.07, labour: 1.15, plant: 1.1, transport: 1.14, site: 1.05 },
  'Port Harcourt': { materials: 1.05, labour: 1.11, plant: 1.08, transport: 1.15, site: 1.06 },
  Ibadan: { materials: 0.93, labour: 0.91, plant: 0.94, transport: 0.91, site: 0.96 },
  Kano: { materials: 0.95, labour: 0.93, plant: 0.96, transport: 0.95, site: 0.98 },
  Enugu: { materials: 1.02, labour: 1.01, plant: 1.0, transport: 1.03, site: 1.0 },
};

const STATE_MARKETS = [
  { name: 'Abia', code: 'AB', zone: 'South East', benchmarkRegion: 'Enugu', factor: 1.01, aliases: ['Umuahia', 'Aba'] },
  { name: 'Adamawa', code: 'AD', zone: 'North East', benchmarkRegion: 'Abuja', factor: 1.03, aliases: ['Yola'] },
  { name: 'Akwa Ibom', code: 'AK', zone: 'South South', benchmarkRegion: 'Port Harcourt', factor: 1.01, aliases: ['Uyo'] },
  { name: 'Anambra', code: 'AN', zone: 'South East', benchmarkRegion: 'Enugu', factor: 1.04, aliases: ['Awka', 'Onitsha', 'Nnewi'] },
  { name: 'Bauchi', code: 'BA', zone: 'North East', benchmarkRegion: 'Kano', factor: 1.01, aliases: ['Bauchi City'] },
  { name: 'Bayelsa', code: 'BY', zone: 'South South', benchmarkRegion: 'Port Harcourt', factor: 1.04, aliases: ['Yenagoa'] },
  { name: 'Benue', code: 'BE', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 0.96, aliases: ['Makurdi'] },
  { name: 'Borno', code: 'BO', zone: 'North East', benchmarkRegion: 'Kano', factor: 1.05, aliases: ['Maiduguri'] },
  { name: 'Cross River', code: 'CR', zone: 'South South', benchmarkRegion: 'Port Harcourt', factor: 0.99, aliases: ['Calabar'] },
  { name: 'Delta', code: 'DE', zone: 'South South', benchmarkRegion: 'Port Harcourt', factor: 1.0, aliases: ['Asaba', 'Warri'] },
  { name: 'Ebonyi', code: 'EB', zone: 'South East', benchmarkRegion: 'Enugu', factor: 0.97, aliases: ['Abakaliki'] },
  { name: 'Edo', code: 'ED', zone: 'South South', benchmarkRegion: 'Port Harcourt', factor: 0.98, aliases: ['Benin City'] },
  { name: 'Ekiti', code: 'EK', zone: 'South West', benchmarkRegion: 'Lagos', factor: 0.95, aliases: ['Ado Ekiti'] },
  { name: 'Enugu', code: 'EN', zone: 'South East', benchmarkRegion: 'Enugu', factor: 1.0, aliases: ['Coal City'] },
  { name: 'FCT Abuja', code: 'FC', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 1.0, aliases: ['Abuja', 'FCT', 'Federal Capital Territory'] },
  { name: 'Gombe', code: 'GO', zone: 'North East', benchmarkRegion: 'Kano', factor: 1.0, aliases: ['Gombe City'] },
  { name: 'Imo', code: 'IM', zone: 'South East', benchmarkRegion: 'Enugu', factor: 1.02, aliases: ['Owerri'] },
  { name: 'Jigawa', code: 'JI', zone: 'North West', benchmarkRegion: 'Kano', factor: 0.97, aliases: ['Dutse'] },
  { name: 'Kaduna', code: 'KD', zone: 'North West', benchmarkRegion: 'Kano', factor: 1.02, aliases: ['Kaduna City', 'Zaria'] },
  { name: 'Kano', code: 'KN', zone: 'North West', benchmarkRegion: 'Kano', factor: 1.0, aliases: ['Kano City'] },
  { name: 'Katsina', code: 'KT', zone: 'North West', benchmarkRegion: 'Kano', factor: 0.98, aliases: ['Katsina City'] },
  { name: 'Kebbi', code: 'KE', zone: 'North West', benchmarkRegion: 'Kano', factor: 0.99, aliases: ['Birnin Kebbi'] },
  { name: 'Kogi', code: 'KO', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 0.96, aliases: ['Lokoja'] },
  { name: 'Kwara', code: 'KW', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 0.94, aliases: ['Ilorin'] },
  { name: 'Lagos', code: 'LA', zone: 'South West', benchmarkRegion: 'Lagos', factor: 1.0, aliases: ['Ikeja', 'Lekki'] },
  { name: 'Nasarawa', code: 'NA', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 0.97, aliases: ['Lafia'] },
  { name: 'Niger', code: 'NI', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 0.95, aliases: ['Minna'] },
  { name: 'Ogun', code: 'OG', zone: 'South West', benchmarkRegion: 'Lagos', factor: 0.97, aliases: ['Abeokuta', 'Sango Ota'] },
  { name: 'Ondo', code: 'ON', zone: 'South West', benchmarkRegion: 'Lagos', factor: 0.96, aliases: ['Akure'] },
  { name: 'Osun', code: 'OS', zone: 'South West', benchmarkRegion: 'Lagos', factor: 0.95, aliases: ['Osogbo', 'Ile Ife'] },
  { name: 'Oyo', code: 'OY', zone: 'South West', benchmarkRegion: 'Ibadan', factor: 1.0, aliases: ['Ibadan', 'Ogbomoso'] },
  { name: 'Plateau', code: 'PL', zone: 'North Central', benchmarkRegion: 'Abuja', factor: 1.01, aliases: ['Jos'] },
  { name: 'Rivers', code: 'RI', zone: 'South South', benchmarkRegion: 'Port Harcourt', factor: 1.0, aliases: ['Port Harcourt', 'Port_Harcourt', 'PH'] },
  { name: 'Sokoto', code: 'SO', zone: 'North West', benchmarkRegion: 'Kano', factor: 1.0, aliases: ['Sokoto City'] },
  { name: 'Taraba', code: 'TA', zone: 'North East', benchmarkRegion: 'Abuja', factor: 1.02, aliases: ['Jalingo'] },
  { name: 'Yobe', code: 'YO', zone: 'North East', benchmarkRegion: 'Kano', factor: 1.02, aliases: ['Damaturu'] },
  { name: 'Zamfara', code: 'ZA', zone: 'North West', benchmarkRegion: 'Kano', factor: 1.01, aliases: ['Gusau'] },
];

function getRegionalProfileBackend(regionName = 'Lagos') {
  const norm = String(regionName || 'Lagos').toLowerCase().replace(/[_-]+/g, ' ').trim();
  let found = STATE_MARKETS.find(s => 
    s.name.toLowerCase() === norm || 
    s.aliases?.some(a => a.toLowerCase() === norm) || 
    s.code.toLowerCase() === norm
  );
  if (!found) {
    found = STATE_MARKETS.find(s => norm.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(norm));
  }
  const benchmarkRegion = found ? found.benchmarkRegion : 'Lagos';
  const locationFactor = found ? found.factor : 1.0;
  const anchorProfile = ANCHOR_REGION_COST_PROFILES[benchmarkRegion] || ANCHOR_REGION_COST_PROFILES.Lagos;

  return {
    materials: anchorProfile.materials * locationFactor,
    labour: anchorProfile.labour * locationFactor,
    plant: anchorProfile.plant * locationFactor,
    transport: anchorProfile.transport * locationFactor,
    site: anchorProfile.site * locationFactor,
  };
}

export async function generateRateBreakdown({ item = {}, context = {}, preferredProvider, model, uid, ip } = {}) {
  const identity = getRequestIdentity({ uid, ip, action: 'rate-breakdown' });
  const limit = checkRateLimit(identity);
  if (!limit.allowed) {
    const err = new Error('Rate limit exceeded. Please wait before sending another request.');
    err.status = 429;
    err.retryAfterMs = limit.retryAfterMs;
    throw err;
  }

  const description = sanitizeText(item.description || 'Unknown item');
  const unit = sanitizeText(item.unit || 'm2');
  const region = sanitizeText(context.region || 'Lagos');
  const customConstraints = sanitizeText(context.customConstraints || '');
  const quantity = Number(item.qty || item.quantity || 1);

  if (!description) {
    const err = new Error('Item description is required.');
    err.status = 400;
    throw err;
  }

  // Load live material prices if possible
  let materialsList = FALLBACK_MATERIALS;
  try {
    const liveMaterials = await listCollectionDocuments('materials');
    if (liveMaterials && liveMaterials.length > 0) {
      materialsList = liveMaterials.map(m => {
        const regions = m.regions || m.regionRates || {};
        const regionalPrice = regions[region] || m.price || m.rate || 0;
        return {
          name: m.name,
          price: regionalPrice,
          unit: m.unit || 'Unit'
        };
      });
    }
  } catch (err) {
    console.warn('[AI] Failed to load live materials from Firestore:', err.message);
  }

  // Scale standard labor and plant rates dynamically based on the regional profile
  const standardLaborRates = {
    'Mason / Blocklayer': 8000,
    'Concrete Finisher': 7500,
    'Steel Fixer / Bender': 8500,
    'Carpenter / Formworker': 8500,
    'Tiler': 8000,
    'Painter': 6500,
    'Plumber': 9000,
    'Electrician': 9500,
    'General Labour': 4500,
    'Plant Operator / Driver': 10000,
    'Welder': 10000,
    'Site Surveyor / Engineer': 25000,
    'Roofing Specialist': 9000
  };

  const standardPlantRates = {
    'Concrete Mixer (350L)': 15000,
    'Poker Vibrator': 5000,
    'Excavator (0.3m³)': 125000,
    'Smooth Drum Roller (8T)': 95000,
    'Motor Grader': 120000,
    'Dump Truck (10T)': 55000,
    'Mobile Crane (20T)': 280000,
    'Generator (25KVA)': 18000,
    'Scaffolding': 25000,
    'Steel Formwork (Hire)': 20000
  };

  const profile = getRegionalProfileBackend(region);
  const scaledLabor = Object.entries(standardLaborRates).map(([name, baseRate]) => {
    const rate = Math.round((baseRate * profile.labour) / 100) * 100;
    return `- ${name}: ${rate}`;
  }).join('\n');

  const scaledPlant = Object.entries(standardPlantRates).map(([name, baseRate]) => {
    const rate = Math.round((baseRate * profile.plant) / 100) * 100;
    return `- ${name}: ${rate}`;
  }).join('\n');

  const systemPrompt = `You are an expert senior quantity surveyor in Nigeria. Your job is to construct a first-principles rate breakdown to produce exactly ONE UNIT of a BOQ work item (e.g. 1 m2, 1 m3, 1 Nr, 1 m).
  
  Calculation & Engineering Guidelines:
  1. Material quantities (qty) must represent the exact quantity of material needed to produce exactly ONE UNIT of the finished item (e.g. 1 m2 or 1 m3 or 1 Nr).
     - DRY-TO-WET CONCRETE YIELD FACTOR: The dry volume of concrete ingredients (cement, sand, granite) combined is roughly 1.54 times the final compacted wet concrete volume.
     - For 1 m3 of wet concrete:
       * 1:2:4 mix (Grade C20/C25 structural concrete) requires exactly: 6.5 bags of Cement (50kg), 0.45 m3 of Sand (or 0.82 Tons), and 0.90 m3 of Granite aggregate (or 1.48 Tons).
       * 1:3:6 mix (Grade C15 concrete for blinding/mass concrete) requires exactly: 4.5 bags of Cement, 0.47 m3 of Sand (or 0.86 Tons), and 0.94 m3 of Granite aggregate (or 1.54 Tons).
       * 1:1.5:3 mix (Grade C30 concrete for high strength slabs/columns) requires exactly: 8.5 bags of Cement, 0.44 m3 of Sand (or 0.81 Tons), and 0.88 m3 of Granite aggregate (or 1.44 Tons).
     - SCALE BY THICKNESS for Area (m2) Concrete Items:
       * If the item is 1 m2 of a slab/blinding of thickness T (in mm), first convert thickness T to meters (T_m = T / 1000). The wet concrete volume required per 1 m2 is exactly T_m m3.
       * Multiply the per-m3 material requirements above by T_m to get the exact material quantities per 1 m2.
         Example: 1 m2 of 150mm Grade C25 slab requires 0.15 m3 wet concrete. Cement = 0.15 * 6.5 = 0.975 bags. Sand = 0.15 * 0.45 = 0.0675 m3. Granite = 0.15 * 0.90 = 0.135 m3.
     - Hollow Sandcrete Blockwork (per 1 m2 of walling):
       * 9-inch (225mm) blocks: 10.5 blocks (includes 5% cutting waste). Cement for mortar = 0.15 bags. Sand = 0.045 m3 (or 0.08 Tons).
       * 6-inch (150mm) blocks: 10.5 blocks (includes 5% cutting waste). Cement for mortar = 0.12 bags. Sand = 0.035 m3 (or 0.06 Tons).
     - Plastering / Rendering (per 1 m2, 12mm-15mm thickness, 1:4 mix):
       * Cement = 0.15 bags. Plaster Sand = 0.02 m3 (or 0.035 Tons).
     - Floor Tiling (per 1 m2):
       * Tiles = 1.05 m2 (includes 5% cutting waste). Cement (or tile adhesive) = 0.18 bags. Sand = 0.02 m3 (or 0.035 Tons).
     - Painting (per 1 m2, 2-3 coats):
       * Paint = 0.15 Litres (or 0.0075 Buckets of 20L).
     - Reinforcement Steel (Rebar) (per 1 kg or 1 Ton):
       * Steel = 1.05 kg per kg (or 1.05 Tons per Ton, includes 5% bending/cutting waste). Binding wire = 0.015 kg per kg (or 15 kg per Ton).

  2. Labor and plant unit costs are crew or plant daily cost divided by daily output.
     - For labor and plant, 'qty' represents the crew size or machine count (e.g. 1 mason, 2 general laborers), and 'output' represents the daily output of that crew/machine in the item's unit (e.g. 10 m2 of blockwork per day).
     - Daily outputs must be highly realistic crew/machine daily outputs:
       * Excavator daily output: 60 - 80 m3/day for excavation.
       * Mason crew blockwork daily output: 8 - 12 m2/day of block walling.
       * Plastering/rendering crew daily output: 12 - 16 m2/day.
       * Tiling crew daily output: 8 - 12 m2/day.
       * Concrete crew (with concrete mixer) daily output: 4 - 6 m3/day.
       * Plant Operator/Machine daily output for roadwork: 150 - 300 m2/day.
       * Steel fixer daily output: 250 - 350 kg/day.
       * Carpenter formwork daily output: 6 - 8 m2/day.

  3. The resulting computed rate must represent a highly accurate, realistic market rate for the region (${region}). Do not make the rates excessively high or generic; adapt to current real-world competitive subcontractor market conditions.
  4. Extract key design specifications (like thickness, mix ratio, block size, concrete strength grade, material type, and waste factor) from the description. Add these to a 'specifications' map in the JSON output. If a parameter is not applicable or not mentioned in the description, set its value to null.
  5. If the user provides any custom constraints/instructions, adjust material, labor, plant, or overhead rates/factors accordingly (e.g. if they mention a specific cement brand or note high logistics/difficulty).
  6. Leverage the total item quantity (${quantity}) to calibrate material rates and overheads. If the quantity is very large (e.g. bulk purchases of thousands of units like concrete m3, rebar kg, blocks), apply a bulk procurement discount of up to 10% to 15% on material rates. If the quantity is tiny (e.g., small repairs of 1-10 units), mark up the rates by 15-25% or include appropriate plant/labor setup allowances to account for mobilization minimums and retail supplier premiums.
  
  Available baseline materials and their current local prices (use regional prices if available):
  ${JSON.stringify(materialsList, null, 2)}
  
  Standard labor rates (per day) for the region ${region}:
  ${scaledLabor}
  
  Standard plant hire rates (per day) for the region ${region}:
  ${scaledPlant}
  
  Your response must be STRICTLY valid JSON with no markdown wrapping other than json code block. The JSON schema:
  {
    "materials": [
      { "name": "Material Name", "qty": 0.12, "unit": "Bag/m3/Ton/etc", "rate": 12500, "waste": 5 }
    ],
    "labor": [
      { "name": "Mason / Blocklayer", "qty": 1, "unit": "Day", "rate": 8000, "output": 10 }
    ],
    "plant": [
      { "name": "Concrete Mixer (350L)", "qty": 0.2, "unit": "Day", "rate": 15000, "output": 10 }
    ],
    "transport": [
      { "name": "Haulage", "qty": 1, "unit": "Trip", "rate": 5000 }
    ],
    "overheads": 15,
    "profit": 10,
    "specifications": {
      "mixRatio": "1:2:4",
      "thickness": "150mm",
      "strength": "C25",
      "size": "9-inch",
      "materialType": "Granite / Hollow Block / etc",
      "wasteFactor": "5%"
    }
  }`;

  const userPrompt = `Analyze the item description, unit, and total quantity. Generate a first-principles rate breakdown:
  Description: ${description}
  Unit: ${unit}
  Quantity: ${quantity}
  Region: ${region}
  ${customConstraints ? `Custom Constraints/Instructions: ${customConstraints}` : ''}`;

  try {
    const result = await runWithFallback({ preferredProvider, model, systemPrompt, userPrompt });
    return parseJsonResponse(result.content);
  } catch (error) {
    console.error('[AI] Rate breakdown generation failed:', error.message);
    throw error;
  }
}
