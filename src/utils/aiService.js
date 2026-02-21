import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * BOQ Pro – AI Intelligence Engine (Powered by Google Gemini)
 * Replaces OpenAI. Uses gemini-2.0-flash for text and gemini-1.5-flash for vision.
 */

// Initialise Gemini client once from the hardcoded env variable
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Helper – runs a text prompt through Gemini 2.0 Flash
 */
const runTextPrompt = async (prompt) => {
    if (!genAI) throw new Error('Gemini API key not configured.');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. AI Rate Insight
// ─────────────────────────────────────────────────────────────────────────────
export const generateAIInsight = async (item, context = {}) => {
    try {
        if (!genAI) {
            return {
                summary: "AI Insight running in Demo Mode. Gemini API key not found in environment.",
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

        const text = await runTextPrompt(prompt);

        return {
            summary: text.trim(),
            recommendation: item.rate > (item.benchmark * 1.1)
                ? "Negotiate supplier rates — above market benchmark."
                : "Rate is within safe market margin.",
            confidence: 95
        };
    } catch (err) {
        console.error('[GEMINI] Rate insight failed:', err.message);
        return {
            summary: "Unable to reach Gemini AI engine. Please check your internet connection.",
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
        if (!genAI) {
            return "Professional AI summary unavailable — Gemini API key not found. For this project, we observe a standard cost distribution with a primary focus on civil works.";
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

        const text = await runTextPrompt(prompt);
        return text.trim();
    } catch (err) {
        console.error('[GEMINI] Project summary failed:', err.message);
        return "Unable to generate AI summary. Please review project totals manually.";
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Engineering Drawing Vision Analysis
// ─────────────────────────────────────────────────────────────────────────────
export const processEngineeringDrawing = async (base64Image) => {
    try {
        if (!genAI) {
            // Smart fallback if no key
            return [
                { id: 'sec-1', title: 'Substructure & Earthworks', confidence: 98, items: 12 },
                { id: 'sec-2', title: 'Concrete Frame & Superstructure', confidence: 95, items: 24 },
                { id: 'sec-3', title: 'Internal Finishes & Partitions', confidence: 88, items: 18 },
                { id: 'sec-4', title: 'Mechanical & Electrical Services', confidence: 82, items: 9 }
            ];
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
            You are a Senior Quantity Surveyor and Structural Engineer.

            FIRST, check if this image is a real engineering drawing, blueprint, floor plan, or technical construction plan.

            If it is NOT an engineering drawing (e.g. a photo, selfie, landscape, or text document), return exactly this JSON:
            {"error": "INVALID_DRAWING", "message": "This file does not appear to be a technical engineering drawing."}

            If it IS a valid engineering drawing, identify the major construction categories for a Bill of Quantities (BOQ).
            Return ONLY a valid JSON array in this format:
            [
              {"id": "sec-1", "title": "Section Title", "confidence": 95, "items": 10}
            ]

            Look for layers like: Substructure, Superstructure/Frame, Roofing, Finishes, MEP Services, External Works, etc.
            Return ONLY the JSON — no markdown, no explanation.
        `;

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: 'image/jpeg'
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const content = result.response.text();

        // Strip markdown code fences if present
        const jsonStr = content.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        if (parsed.error === 'INVALID_DRAWING') {
            const err = new Error(parsed.message);
            err.code = 'INVALID_DRAWING';
            throw err;
        }

        return parsed;
    } catch (err) {
        console.error('[GEMINI VISION] Drawing analysis failed:', err.message);
        throw err;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Market Outlook (static — can be AI-powered later)
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
