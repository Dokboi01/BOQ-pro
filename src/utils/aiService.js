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

export const getMarketOutlook = async () => {
    // Mock outlook for now, can be connected to real news scrapers later
    return {
        overall: "Volatile",
        factors: ["Rising Cement Costs", "FX Fluctuations", "Infrastructure Subsidy Phase-out"],
        trend: "upward"
    };
};
