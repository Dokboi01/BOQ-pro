import { getSetting } from '../db/database';

/**
 * Intelligent Engine for BOQ Pro
 * Powers AI-driven rate analysis and project summaries
 */
export const generateAIInsight = async (item, context = {}) => {
    try {
        let apiKey = await getSetting('openai_api_key');

        // Fallback to environment variable if DB setting is empty
        if (!apiKey) {
            apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        }

        if (!apiKey) {
            return {
                summary: "AI Insight is currently in 'Demo Mode'. Add your OpenAI API Key in Settings to enable live market intelligence.",
                recommendation: "Benchmark alignment suggested.",
                confidence: 70
            };
        }

        const prompt = `
            Act as a Senior Quantity Surveyor in Nigeria. 
            Analyze the following work item for a BOQ:
            Item: ${item.description}
            Region: ${context.region || 'Lagos'}
            Current User Rate: ₦ ${item.rate.toLocaleString()}
            Benchmark Rate: ₦ ${item.benchmark?.toLocaleString() || 'N/A'}
            
            Provide a concise 2-sentence professional analysis of this rate. 
            Is it realistic? Is there price volatility for this material?
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return {
            summary: data.choices[0].message.content,
            recommendation: item.rate > (item.benchmark * 1.1) ? "Negotiate supplier rates" : "Rate is within safe margin.",
            confidence: 95
        };
    } catch (err) {
        console.error('[AI SERVICE] Analysis failed:', err);
        return {
            summary: "Unable to reach AI intelligence engine. Please check your connectivity and API key settings.",
            recommendation: "Manual review required.",
            confidence: 0
        };
    }
};

export const generateProjectSummary = async (projectData) => {
    try {
        let apiKey = await getSetting('openai_api_key');
        if (!apiKey) apiKey = import.meta.env.VITE_OPENAI_API_KEY;

        if (!apiKey) {
            return "Professional summary is available in Pro mode with a valid API Key. For this project, we observe a standard cost distribution with a primary focus on civil works.";
        }

        const sectionsDesc = projectData.sections.map(s => `${s.title}: ₦${s.items.reduce((acc, i) => acc + i.total, 0).toLocaleString()}`).join(', ');

        const prompt = `
            Act as a Senior Quantity Surveying Consultant. 
            Provide a 3-sentence executive summary for a project report.
            Project: ${projectData.name}
            Total Contract Sum: ₦ ${projectData.totalValue.toLocaleString()}
            Sections: ${sectionsDesc}
            
            Mention one potential cost risk (e.g. material volatility) and one professional recommendation.
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (err) {
        console.error('[AI SERVICE] Summary failed:', err);
        return "Unable to generate professional summary. Please review project totals manually.";
    }
};

/**
 * AI Vision Engine for Blueprint Analysis
 * Parses base64 images of engineering drawings into structured BOQ data
 */
export const processEngineeringDrawing = async (base64Image) => {
    try {
        let apiKey = await getSetting('openai_api_key');
        if (!apiKey) apiKey = import.meta.env.VITE_OPENAI_API_KEY;

        if (!apiKey) {
            // Smart Mock Fallback for Demo without API Key
            return [
                { id: 'sec-1', title: 'Substructure & Earthworks', confidence: 98, items: 12 },
                { id: 'sec-2', title: 'Concrete Frame & Superstructure', confidence: 95, items: 24 },
                { id: 'sec-3', title: 'Internal Finishes & Partitions', confidence: 88, items: 18 },
                { id: 'sec-4', title: 'Mechanical & Electrical Services', confidence: 82, items: 9 }
            ];
        }

        const prompt = `
            Act as a Senior Quantity Surveyor and Structural Engineer.
            FIRST, verify if the provided image is a real engineering drawing, blueprint, or technical construction plan.
            
            If it is NOT an engineering drawing (e.g., a selfie, a landscape, text-only document, or random photo), return exactly this JSON:
            {"error": "INVALID_DRAWING", "message": "This file does not appear to be a technical engineering drawing."}
            
            If it IS a valid drawing, analyze it and identify major construction categories/sections for a Bill of Quantities (BOQ).
            Return exactly a JSON array of objects with this structure:
            [
              {"id": "unique-id", "title": "Section Title", "confidence": 95, "items": 10}
            ]
            
            Focus on identifying layers like Substructure, Frames, Roofing, Finishes, etc.
            Return ONLY the valid JSON or JSON array.
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const content = data.choices[0].message.content;
        // Clean markdown if AI returns it
        const jsonStr = content.replace(/```json|```/g, '').trim();
        const result = JSON.parse(jsonStr);

        if (result.error === 'INVALID_DRAWING') {
            const err = new Error(result.message);
            err.code = 'INVALID_DRAWING';
            throw err;
        }

        return result;
    } catch (err) {
        console.error('[AI VISION] Analysis failed:', err);
        throw err;
    }
};

export const getMarketOutlook = async () => {
    // Mock outlook for now, can be connected to real news scrapers later
    return {
        overall: "Volatile",
        factors: ["Rising Cement Costs", "FX Fluctuations", "Infrastructure Subsidy Phase-out"],
        trend: "upward"
    };
};
