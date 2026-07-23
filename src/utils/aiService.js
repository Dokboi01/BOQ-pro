import { getSetting } from '../db/database';
import { getCurrentIdToken } from './authToken';
import {
  DEFAULT_NIGERIA_LOCATION,
  getNigeriaBenchmarkRegion,
  getNigeriaLocationFactor,
} from '../data/nigeriaLocations';

const DEFAULT_AI_MODEL = 'gpt-4o';

function getApiBaseUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (apiBase) {
    return new URL('/api/ai', apiBase).toString();
  }

  return '/api/ai';
}

async function getAiPreferences() {
  const [provider, model] = await Promise.all([
    getSetting('preferred_ai_provider').catch(() => null),
    getSetting('openai_model').catch(() => null),
  ]);

  return {
    preferredProvider: provider || 'openai',
    model: model || DEFAULT_AI_MODEL,
  };
}

async function postAiRequest(payload) {
  const token = await getCurrentIdToken();
  const response = await fetch(getApiBaseUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { error: raw || 'AI request failed.' };
  }

  if (!response.ok) {
    throw new Error(data.error || 'AI request failed.');
  }

  return data;
}

function demoInsight(item = {}) {
  return {
    summary: 'Unable to reach AI engine. Please check your internet connection.',
    recommendation: Number(item.rate || 0) > Number(item.benchmark || 0) * 1.1
      ? 'Negotiate supplier rates - above market benchmark.'
      : 'Manual review required.',
    confidence: 0,
  };
}

export const generateAIInsight = async (item, context = {}) => {
  const preferences = await getAiPreferences();

  try {
    const data = await postAiRequest({
      action: 'rate-insight',
      item,
      context,
      ...preferences,
    });

    return data.result || demoInsight(item);
  } catch (err) {
    console.error('[AI] Rate insight failed:', err.message);
    return demoInsight(item);
  }
};

export const generateProjectSummary = async (projectData) => {
  const preferences = await getAiPreferences();

  try {
    const data = await postAiRequest({
      action: 'project-summary',
      projectData,
      ...preferences,
    });

    return data.result?.summary || 'Unable to generate AI summary. Please review project totals manually.';
  } catch (err) {
    console.error('[AI] Project summary failed:', err.message);
    return 'Unable to generate AI summary. Please review project totals manually.';
  }
};

export const processEngineeringDrawing = async (base64Image, contextHint = '') => {
  const preferences = await getAiPreferences();

  // Unlike generateAIInsight/generateProjectSummary (which have a sensible
  // "manual review" fallback when AI is unavailable), a drawing analysis
  // failure has no honest fallback -- there's no way to approximate "what's
  // in this specific drawing" without actually analyzing it. This used to
  // swallow the error and return 4 hardcoded fake "sections" (same content
  // every time, in a shape that didn't even match a real response), silently
  // presenting fabricated results as if they were a real read of the user's
  // drawing. Let the error propagate so DrawingAnalyzer.jsx's existing error
  // UI can tell the user the analysis actually failed.
  const data = await postAiRequest({
    action: 'drawing-analysis',
    base64Image,
    contextHint,
    ...preferences,
  });

  return data.result || [];
};

export const processStructuralFile = async (fileContent, fileName = 'structural_design.csv') => {
  const preferences = await getAiPreferences();

  try {
    const data = await postAiRequest({
      action: 'structural-file',
      fileContent,
      fileName,
      ...preferences,
    });

    return data.result || [];
  } catch (err) {
    console.error('[AI] Structural file analysis failed:', err.message);
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
};

export const getMarketOutlook = async () => {
  return {
    overall: 'Volatile',
    factors: ['Rising Cement Costs', 'FX Fluctuations', 'Infrastructure Subsidy Phase-out'],
    trend: 'upward',
  };
};

export const calculateResourceRequirement = (description, qty, unit) => {
  const desc = description.toLowerCase();
  const resources = [];

  if (desc.includes('concrete') && (unit.toLowerCase() === 'm3' || unit.toLowerCase() === 'cum')) {
    resources.push(
      { name: 'Cement (50kg bags)', qty: Math.ceil(qty * 6.5) },
      { name: 'Sharp Sand (Tons)', qty: parseFloat((qty * 0.5).toFixed(2)) },
      { name: 'Granite 20mm (Tons)', qty: parseFloat((qty * 0.9).toFixed(2)) }
    );
  } else if ((desc.includes('plaster') || desc.includes('render') || desc.includes('screed')) && unit.toLowerCase() === 'm2') {
    resources.push(
      { name: 'Cement (50kg bags)', qty: Math.ceil(qty * 0.15) },
      { name: 'Plaster Sand (Tons)', qty: parseFloat((qty * 0.02).toFixed(2)) }
    );
  } else if (desc.includes('block') && unit.toLowerCase() === 'm2') {
    resources.push(
      { name: 'Vibrated Blocks (pcs)', qty: Math.ceil(qty * 10.5) },
      { name: 'Cement (50kg bags)', qty: Math.ceil(qty * 0.2) }
    );
  } else if (desc.includes('reinforcement') || desc.includes('rebar')) {
    if (unit.toLowerCase() === 'ton' || unit.toLowerCase() === 't') {
      resources.push(
        { name: 'Steel Reinforcement (Tons)', qty },
        { name: 'Binding Wire (Rolls)', qty: Math.ceil(qty * 0.5) }
      );
    }
  }

  return resources;
};

export const getRegionalModifier = (region) => {
  const benchmarkRegion = getNigeriaBenchmarkRegion(region || DEFAULT_NIGERIA_LOCATION);
  const stateFactor = getNigeriaLocationFactor(region || DEFAULT_NIGERIA_LOCATION);
  const anchorModifiers = {
    Lagos: 1.0,
    Abuja: 1.15,
    'Port Harcourt': 1.1,
    Ibadan: 0.9,
    Kano: 0.95,
    Enugu: 1.03,
  };

  return (anchorModifiers[benchmarkRegion] || 1.0) * stateFactor;
};

export const generateAIRateBreakdown = async (item, context = {}) => {
  const preferences = await getAiPreferences();

  try {
    const data = await postAiRequest({
      action: 'rate-breakdown',
      item,
      context,
      ...preferences,
    });

    return data.result;
  } catch (err) {
    console.error('[AI] Rate breakdown failed:', err.message);
    throw err;
  }
};
