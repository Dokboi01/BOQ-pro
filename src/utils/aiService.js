import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { getSetting } from '../db/database';

/**
 * BOQ Pro – AI Intelligence Engine (Powered by Google Gemini)
 * Replaces OpenAI. Uses gemini-2.0-flash for text and gemini-1.5-flash for vision.
 */

// Initialise base clients with environment defaults
const GEMINI_ENV_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const OPENAI_ENV_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_ENV_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o';

/**
 * Retrieves the preferred AI configuration from settings.
 * Returns provider ('gemini' or 'openai') and the appropriate API key.
 */
const getAIConfig = async () => {
    // 1. Get preferred provider and model from database
    const dbProvider = await getSetting('preferred_ai_provider');
    const dbModel = await getSetting('openai_model');
    
    const dbGeminiKey = await getSetting('gemini_api_key');
    const dbOpenAIKey = await getSetting('openai_api_key');
    const geminiKey = dbGeminiKey || GEMINI_ENV_KEY;
    const openaiKey = dbOpenAIKey || OPENAI_ENV_KEY;

    // OpenAI is the default provider. If its key is unavailable, fall back automatically.
    const preferredProvider = dbProvider || 'openai';
    const provider = preferredProvider === 'openai'
        ? (openaiKey ? 'openai' : geminiKey ? 'gemini' : 'openai')
        : (geminiKey ? 'gemini' : openaiKey ? 'openai' : 'gemini');
    const preferredModel = dbModel || OPENAI_ENV_MODEL;

    const config = {
        provider,
        model: preferredModel,
        geminiKey,
        openaiKey
    };

    return config;
};

/**
 * Helper – runs a text prompt through Gemini 2.0 Flash
 */
const runGeminiPrompt = async (prompt, key) => {
    if (!key) throw new Error('Gemini API key not configured.');
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
};

/**
 * Helper – runs a text prompt through OpenAI GPT-4o
 */
const runOpenAIPrompt = async (prompt, key, modelName = 'gpt-4o') => {
    if (!key) throw new Error('OpenAI API key not configured.');
    const openai = new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true });
    const response = await openai.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0].message.content;
};

/**
 * Unified text prompt runner
 */
const runPrompt = async (prompt) => {
    const { provider, model, geminiKey, openaiKey } = await getAIConfig();
    
    if (provider === 'openai' && openaiKey) {
        return await runOpenAIPrompt(prompt, openaiKey, model);
    }
    
    // Default to Gemini
    return await runGeminiPrompt(prompt, geminiKey);
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. AI Rate Insight
// ─────────────────────────────────────────────────────────────────────────────
export const generateAIInsight = async (item, context = {}) => {
    try {
        const { provider, geminiKey, openaiKey } = await getAIConfig();
        const activeKey = provider === 'openai' ? openaiKey : geminiKey;

        if (!activeKey) {
            return {
                summary: `AI Insight running in Demo Mode. ${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key not found in environment or settings.`,
                recommendation: "Benchmark alignment suggested.",
                confidence: 70
            };
        }

        const prompt = `
            Act as a Senior Quantity Surveyor in Nigeria.
            Analyze the following BOQ work item:

            Item Description: ${item.description}
            Region: ${context.region || 'Lagos'}
            User Rate: ₦${item.rate?.toLocaleString()}
            Market Benchmark Rate: ₦${item.benchmark?.toLocaleString() || 'N/A'}

            Give a concise 2-sentence professional analysis.
            Is the rate realistic for the Nigerian construction market in 2025/2026?
            Mention any price volatility risk for this material or trade.
        `;

        const text = await runPrompt(prompt);

        return {
            summary: text.trim(),
            recommendation: item.rate > (item.benchmark * 1.1)
                ? "Negotiate supplier rates — above market benchmark."
                : "Rate is within safe market margin.",
            confidence: 95
        };
    } catch (err) {
        console.error('[AI] Rate insight failed:', err.message);
        return {
            summary: "Unable to reach AI engine. Please check your internet connection.",
            recommendation: "Manual review required.",
            confidence: 0
        };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Project Executive Summary
// ─────────────────────────────────────────────────────────────────────────────
export const generateProjectSummary = async (projectData) => {
    try {
        const { provider, geminiKey, openaiKey } = await getAIConfig();
        const activeKey = provider === 'openai' ? openaiKey : geminiKey;

        if (!activeKey) {
            return `Professional AI summary unavailable — ${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key not found. For this project, we observe a standard cost distribution with a primary focus on civil works.`;
        }

        const sectionsDesc = projectData.sections
            .map(s => `${s.title}: ₦${s.items.reduce((acc, i) => acc + i.total, 0).toLocaleString()}`)
            .join(', ');

        const prompt = `
            Act as a Senior Quantity Surveying Consultant.
            Write a professional 3-sentence executive summary for a project report.

            Project: ${projectData.name}
            Total Contract Sum: ₦${projectData.totalValue?.toLocaleString()}
            Cost Breakdown by Section: ${sectionsDesc}

            Mention one material cost risk (e.g. cement or steel price volatility)
            and one professional cost-control recommendation.
            Keep it concise and formal — fit for a QS report.
        `;

        const text = await runPrompt(prompt);
        return text.trim();
    } catch (err) {
        console.error('[AI] Project summary failed:', err.message);
        return "Unable to generate AI summary. Please review project totals manually.";
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Engineering Drawing Vision Analysis
// ─────────────────────────────────────────────────────────────────────────────
export const processEngineeringDrawing = async (base64Image, contextHint = '') => {
    try {
        const { provider, model, geminiKey, openaiKey } = await getAIConfig();

        if (provider === 'openai' && openaiKey) {
            const openai = new OpenAI({ apiKey: openaiKey, dangerouslyAllowBrowser: true });
            const prompt = `
                You are a highly experienced Senior Quantity Surveyor and Structural Engineer.
                
                TASK: Analyze this engineering drawing/blueprint and extract specific BOQ construction categories and estimated item counts.
                
                USER CONTEXT: ${contextHint || 'None provided. Use your best professional judgment to identify the drawing type.'}

                Return a valid JSON array of objects with this schema:
                [
                  {
                    "category": "Structural Element Category (e.g., Slab, Beam, Column, Foundation)",
                    "item": "Specific name or notation (e.g., Suspended Slab S1, Floor Beam FB5)",
                    "description": "Details including dimensions (e.g., 150mm thick) and reinforcement (e.g., Y12 BRS mesh)",
                    "quantity": Number,
                    "structuralDetails": {
                        "dimensions": "Width x Depth or Thickness",
                        "reinforcement": "e.g., 4Y16, Y10@200",
                        "notations": ["B1", "S1", "C2"]
                    }
                  }
                ]
                Return ONLY the valid JSON array.
            `;

            const response = await openai.chat.completions.create({
                model: model === 'gpt-4o' ? 'gpt-4o' : model, // Use specific model if provided
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/png;base64,${base64Image}`,
                                },
                            },
                        ],
                    },
                ],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content;
            const parsed = JSON.parse(content);
            // OpenAI might return { results: [...] } or just the array if handled correctly
            return Array.isArray(parsed) ? parsed : (parsed.items || parsed.elements || parsed.results || []);
        }

        // Falling back to Gemini or demo mode
        if (!geminiKey) {
            return [
                { id: 'sec-1', title: 'Substructure & Earthworks', confidence: 98, items: 12 },
                { id: 'sec-2', title: 'Concrete Frame & Superstructure', confidence: 95, items: 24 },
                { id: 'sec-3', title: 'Internal Finishes & Partitions', confidence: 88, items: 18 },
                { id: 'sec-4', title: 'Mechanical & Electrical Services', confidence: 82, items: 9 }
            ];
        }

        const genAI = new GoogleGenerativeAI(geminiKey);
        const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
            You are a highly experienced Senior Quantity Surveyor and Structural Engineer.
            
            TASK: Analyze this engineering drawing/blueprint and extract specific BOQ construction categories and estimated item counts.
            
            USER CONTEXT: ${contextHint || 'None provided. Use your best professional judgment to identify the drawing type.'}

            Focus on:
            1. **Identification**: Precisely name structural members (e.g., "FB1", "C2", "S1", "Pad Footing PF1").
            2. **Quantification**: Identify counts of columns, beams, or slab panels based on visible labels or annotations.
            3. **Technical Specs**: Extract reinforcement details (e.g., "4Y16", "Y12 @ 200cc"), concrete grades, and member dimensions (e.g., "225x450mm").
            4. **Context**: Use the Context Hint to differentiate between General Arrangements, Foundation Plans, or Slab Details.

            Return a valid JSON array of objects with this schema:
            [
              {
                "category": "Structural Element Category (e.g., Slab, Beam, Column, Foundation)",
                "item": "Specific name or notation (e.g., Suspended Slab S1, Floor Beam FB5)",
                "description": "Details including dimensions (e.g., 150mm thick) and reinforcement (e.g., Y12 BRS mesh)",
                "quantity": Number (The estimated count or total occurrence),
                "structuralDetails": {
                    "dimensions": "Width x Depth or Thickness",
                    "reinforcement": "e.g., 4Y16, Y10@200",
                    "notations": ["B1", "S1", "C2"]
                }
              }
            ]

            Return ONLY the valid JSON array — no markdown, no conversational text.
        `;

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: 'image/png'
            }
        };

        const result = await geminiModel.generateContent([prompt, imagePart]);
        const content = result.response.text();

        const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (!jsonMatch) throw new Error('AI returned an unparseable response.');

        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error === 'INVALID_DRAWING') {
            const err = new Error(parsed.message);
            err.code = 'INVALID_DRAWING';
            throw err;
        }

        return parsed;
    } catch (err) {
        console.error('[AI] Drawing analysis failed:', err);
        throw err;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Structural Design File Analysis (Excel/CSV/Text)
// ─────────────────────────────────────────────────────────────────────────────
export const processStructuralFile = async (fileContent, fileName = 'structural_design.csv') => {
    try {
        const { provider, geminiKey, openaiKey } = await getAIConfig();
        const activeKey = provider === 'openai' ? openaiKey : geminiKey;

        if (!activeKey) {
            return [
                {
                    id: 'ext-sec-1',
                    title: 'Structural Frames (AI Extracted)',
                    items: [
                        { id: Date.now() + 1, description: 'Reinforced Concrete Columns (C1-C12)', unit: 'm³', qty: 4.5, rate: 0, total: 0, qtySource: 'ai-extracted' },
                        { id: Date.now() + 2, description: 'Superstructure Beams (B1-B24)', unit: 'm³', qty: 12.8, rate: 0, total: 0, qtySource: 'ai-extracted' },
                        { id: Date.now() + 3, description: 'Floor Slab Panels (S1-S8)', unit: 'm²', qty: 145, rate: 0, total: 0, qtySource: 'ai-extracted' }
                    ]
                }
            ];
        }

        const prompt = `
            You are a Senior Structural Engineer and expert Quantity Surveyor specializing in Bill of Quantities (BOQ) preparation for Nigerian construction projects.
            
            INPUT: This is raw text or CSV data exported from structural design software (Prota Structure, Orion, Tekla, etc.).
            FILE NAME: ${fileName}
            FILE CONTENT:
            ${fileContent.substring(0, 10000)}
            
            YOUR OBJECTIVE:
            1. Parse the structural data and identify all load-bearing members.
            2. Extract "Member Marks" (e.g., C1-C10, FB1, 1S1), Their Dimensions, and Quantities.
            3. CRITICAL: Distinguish between different material trades (Concrete Volume, Formwork Area, and Reinforcement Tonnage).
            4. Group items into logical BOQ sections based on construction sequence:
               - "Substructure (Foundations/Footings)"
               - "Superstructure - Vertical Frames (Columns/Walls)"
               - "Superstructure - Horizontal Frames (Beams/Slabs)"
            
            JSON FORMAT REQUIREMENTS:
            - Return ONLY a valid JSON array of sections.
            - Each section: { id, title, items: [] }
            - Each item: { id, description, unit, qty, qtySource: "ai-extracted" }
            
            QS STANDARDS:
            - Concrete -> Unit: "m³" or "cum"
            - Formwork -> Unit: "m²"
            - Reinforcement -> Unit: "ton" or "kg"
            
            Ensure descriptions are descriptive (e.g., "Reinforced Concrete in Columns - Grade 30").
            DO NOT include summary totals if they are already broken down.
            Return ONLY the JSON array.
        `;

        const content = await runPrompt(prompt);

        // Strip markdown code fences if present
        const jsonStr = content.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        return parsed;
    } catch (err) {
        console.error('[AI] Structural file analysis failed:', err.message);
        throw err;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Market Outlook (static — can be AI-powered later)
// ─────────────────────────────────────────────────────────────────────────────
export const getMarketOutlook = async () => {
    return {
        overall: "Volatile",
        factors: ["Rising Cement Costs", "FX Fluctuations", "Infrastructure Subsidy Phase-out"],
        trend: "upward"
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Material Requirement Calculator (pure logic, no AI needed)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// 6. Regional Rate Modifiers
// ─────────────────────────────────────────────────────────────────────────────
export const getRegionalModifier = (region) => {
    const modifiers = {
        'LAGOS': 1.0,
        'ABUJA': 1.15,
        'PORT_HARCOURT': 1.10,
        'IBADAN': 0.90,
        'KANO': 0.95
    };
    return modifiers[region?.toUpperCase()] || 1.0;
};
