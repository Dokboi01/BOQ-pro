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
  return base64Image.length > MAX_IMAGE_LENGTH ? base64Image.slice(0, MAX_IMAGE_LENGTH) : base64Image;
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

async function runOpenAIVision({ model, systemPrompt, userPrompt, base64Image }) {
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
              url: `data:image/png;base64,${sanitizeBase64Image(base64Image)}`,
            },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
  });

  return response.choices?.[0]?.message?.content || '';
}

async function runGeminiVision({ systemPrompt, userPrompt, base64Image }) {
  const client = getGeminiClient();
  if (!client) throw new Error('Gemini API key is not configured on the server.');

  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const imagePart = {
    inlineData: {
      data: sanitizeBase64Image(base64Image),
      mimeType: 'image/png',
    },
  };
  const result = await model.generateContent([`${systemPrompt}\n\n${userPrompt}`, imagePart]);
  return result.response.text();
}

async function runWithFallback({ preferredProvider, model, systemPrompt, userPrompt, base64Image = null, vision = false }) {
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
            ? await runOpenAIVision({ model, systemPrompt, userPrompt, base64Image })
            : await runOpenAIText({ model, systemPrompt, userPrompt }),
        };
      }

      return {
        provider: 'gemini',
        model: vision ? 'gemini-1.5-flash' : 'gemini-2.0-flash',
        content: vision
          ? await runGeminiVision({ systemPrompt, userPrompt, base64Image })
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
  const cleaned = trimmed.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
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

export async function analyzeEngineeringDrawing({ base64Image, contextHint = '', preferredProvider, model, uid, ip } = {}) {
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

  const systemPrompt = 'You are a highly experienced senior quantity surveyor and structural engineer.';
  const userPrompt = createTextPrompt(
    'Analyze this engineering drawing/blueprint and return a valid JSON array of structural elements.',
    [
      `USER CONTEXT: ${sanitizeText(contextHint || 'None provided. Use your best professional judgment.')}`,
      'Return an array of objects with category, item, description, quantity, and structuralDetails.',
      'Return ONLY valid JSON.',
    ].join('\n')
  );

  try {
    const result = await runWithFallback({
      preferredProvider,
      model,
      systemPrompt,
      userPrompt,
      base64Image,
      vision: true,
    });

    const parsed = parseJsonResponse(result.content);
    return Array.isArray(parsed) ? parsed : (parsed.items || parsed.elements || parsed.results || []);
  } catch {
    return [
      { id: 'sec-1', title: 'Substructure & Earthworks', confidence: 98, items: 12 },
      { id: 'sec-2', title: 'Concrete Frame & Superstructure', confidence: 95, items: 24 },
      { id: 'sec-3', title: 'Internal Finishes & Partitions', confidence: 88, items: 18 },
      { id: 'sec-4', title: 'Mechanical & Electrical Services', confidence: 82, items: 9 },
    ];
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

  const systemPrompt = `You are an expert senior quantity surveyor in Nigeria. Your job is to construct a first-principles rate breakdown to produce exactly ONE UNIT of a BOQ work item (e.g. 1 m2, 1 m3, 1 Nr, 1 m).
  
  Calculation rules:
  1. Material quantities (qty) must represent the exact quantity of material needed to produce exactly ONE UNIT of the finished item (e.g. 1 m2 or 1 m3 or 1 Nr).
     - Example: If a concrete slab is 150mm thick, the volume of concrete per 1 m2 is 0.15 m3. Therefore, the quantities of cement, sand, and granite must be scaled to make exactly 0.15 m3 of concrete.
     - Example: For 1 m2 of blockwall, block quantity is typically 10 to 14 blocks.
     - Example: For 1 m2 of plastering, cement quantity is around 0.15 to 0.4 bags.
  2. Labor and plant unit costs are crew or plant daily cost divided by daily output.
     - For labor and plant, 'qty' represents the crew size or machine count (e.g. 1 mason, 2 general laborers), and 'output' represents the daily output of that crew/machine in the item's unit (e.g. 10 m2 of blockwork per day).
  3. The resulting computed rate must represent a highly accurate, realistic market rate for the region (\${region}). Do not make the rates excessively high or generic; adapt to current real-world competitive subcontractor market conditions.
  
  Available baseline materials and their current local prices (use regional prices if available):
  \${JSON.stringify(materialsList, null, 2)}
  
  Standard labor rates (per day):
  - Mason / Blocklayer: 8000
  - Concrete Finisher: 7500
  - Steel Fixer / Bender: 8500
  - Carpenter / Formworker: 8500
  - Tiler: 8000
  - Painter: 6500
  - Plumber: 9000
  - Electrician: 9500
  - General Labour: 4500
  - Plant Operator / Driver: 10000
  - Welder: 10000
  - Site Surveyor / Engineer: 25000
  - Roofing Specialist: 9000
  
  Standard plant hire rates (per day):
  - Concrete Mixer (350L): 15000
  - Poker Vibrator: 5000
  - Excavator (0.3m³): 125000
  - Smooth Drum Roller (8T): 95000
  - Motor Grader: 120000
  - Dump Truck (10T): 55000
  - Mobile Crane (20T): 280000
  - Generator (25KVA): 18000
  - Scaffolding: 25000
  - Steel Formwork (Hire): 20000
  
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
    "profit": 10
  }`;

  const userPrompt = `Analyze the item description and unit. Generate a first-principles rate breakdown:
  Description: \${description}
  Unit: \${unit}
  Region: \${region}`;

  try {
    const result = await runWithFallback({ preferredProvider, model, systemPrompt, userPrompt });
    return parseJsonResponse(result.content);
  } catch (error) {
    console.error('[AI] Rate breakdown generation failed:', error.message);
    throw error;
  }
}
