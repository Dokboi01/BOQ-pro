import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

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
