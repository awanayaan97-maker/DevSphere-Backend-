
const Groq = require("groq-sdk");
const ApiError = require("../utils/ApiError");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    timeout: 30 * 1000,  
    maxRetries: 1
});

const MODEL = process.env.GROQ_MODEL;


async function generateAnswer({ system, messages, maxTokens = 1500 }) {

    if (!process.env.GROQ_API_KEY || !MODEL) {
        throw new ApiError(500, "AI is not configured.");
    }

    try {

        const completion = await groq.chat.completions.create({
            model: MODEL,
            temperature: 0.3,           
            max_completion_tokens: maxTokens,
            messages: [
                { role: "system", content: system },
                ...messages
            ]
        });

        const text = completion.choices?.[0]?.message?.content?.trim();

        if (!text) throw new ApiError(502, "AI returned an empty answer.");

        return text;

    } catch (error) {

        if (error instanceof ApiError) throw error;

        if (error?.status === 429) {
            throw new ApiError(429, "AI is busy right now. Please try again in a minute.");
        }

        console.error("AI error:", error?.status, error?.message);
        throw new ApiError(502, "AI service is unavailable. Please try again later.");
    }
}

module.exports = { generateAnswer };