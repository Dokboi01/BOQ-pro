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
export const processEngineeringDrawing = async (base64Image, contextHint = '') => {
    try {
        if (!genAI) {
            return [
                { id: 'sec-1', title: 'Substructure & Earthworks', confidence: 98, items: 12 },
                { id: 'sec-2', title: 'Concrete Frame & Superstructure', confidence: 95, items: 24 },
                { id: 'sec-3', title: 'Internal Finishes & Partitions', confidence: 88, items: 18 },
                { id: 'sec-4', title: 'Mechanical & Electrical Services', confidence: 82, items: 9 }
            ];
        }

        // Using gemini-2.0-flash for superior vision and reasoning
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `
            You are a highly experienced Senior Quantity Surveyor and Structural Engineer.
            
            TASK: Analyze this engineering drawing/blueprint and extract specific BOQ construction categories and estimated item counts.
            
            USER CONTEXT: ${contextHint || 'None provided. Use your best professional judgment to identify the drawing type.'}

            INSTRUCTIONS:
            1. Identify the drawing type (e.g., Foundation Plan, Floor Plan, Section, Elevation).
            2. Scan for specific structural elements: Columns, Beams, Walls, Slabs, Footings.
            3. Look for annotations, labels, and dimension lines to estimate the number of distinct work items in each category.
            4. If it is NOT an engineering drawing, return: {"error": "INVALID_DRAWING", "message": "This file does not appear to be a technical construction drawing."}

            JSON OUTPUT FORMAT:
            [
              {"id": "sec-1", "title": "Foundation & Plinth", "confidence": 95, "items": 14, "details": "Detected pad footings and strip foundations"}
            ]

            Return ONLY the valid JSON array — no markdown, no conversational text.
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
// 4. Structural Design File Analysis (Excel/CSV/Text)
// ─────────────────────────────────────────────────────────────────────────────
export const processStructuralFile = async (fileContent, fileName = 'structural_design.csv') => {
    try {
        if (!genAI) {
            // Intelligent placeholder for demo mode
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

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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

        const result = await model.generateContent(prompt);
        const content = result.response.text();

        // Strip markdown code fences if present
        const jsonStr = content.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        return parsed;
    } catch (err) {
        console.error('[GEMINI] Structural file analysis failed:', err.message);
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
