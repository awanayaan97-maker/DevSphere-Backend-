
const mongoose = require("mongoose");
const PublishArticle = require("../Models/PublishArticleSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const htmlToText = require("../utils/htmlToText");
const { generateAnswer } = require("../services/aiService");
const { buildSystemPrompt, getQuickPrompt } = require("../Prompts/articlePrompts");
const communityPrompts = require("../Prompts/communityPrompts");

const MAX_MESSAGE_LENGTH = 300;
const MAX_HISTORY = 6;
const MAX_HISTORY_CONTENT = 4000;
const COMMUNITY_MAX_HISTORY = 4;

function cleanHistory(history) {

    if (!Array.isArray(history)) return [];

    return history
        .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
        .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_HISTORY_CONTENT) }))
        .filter((m) => m.content.length > 0)
        .slice(-MAX_HISTORY);
}

function cleanCommunityHistory(history) {

    if (!Array.isArray(history)) return [];

    return history
        .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
        .map((m) => ({ role: m.role, content: m.content.trim().slice(0, communityPrompts.MAX_MESSAGE_LENGTH) }))
        .filter((m) => m.content.length > 0)
        .map((m) => m.role === "user"
            ? { role: "user", content: communityPrompts.buildUserMessage(m.content) }
            : m
        )
        .slice(-COMMUNITY_MAX_HISTORY);
}

async function articleChat(req, res, next) {

    try {

        const { articleId, quick, message, history } = req.body ?? {};
        if (!req.user?.id) throw new ApiError(401, "Please login to use the AI assistant.");

        if (!mongoose.isValidObjectId(articleId)) {
            throw new ApiError(400, "Invalid article id.");
        }

        const hasQuick = quick !== undefined && quick !== null && quick !== "";
        const hasMessage = typeof message === "string" && message.trim() !== "";

        if (hasQuick === hasMessage) {
            throw new ApiError(400, "Send either 'quick' or 'message', not both.");
        }

        if (hasMessage && message.trim().length > MAX_MESSAGE_LENGTH) {
            throw new ApiError(400, `Message must be ${MAX_MESSAGE_LENGTH} characters or less.`);
        }

        // TODO (baad mein): yahan rozana limit ka check aayega


        // ---------- STEP 3: article nikalna ----------
        const article = await PublishArticle
            .findById(articleId)
            .select("title content")
            .lean();

        if (!article) throw new ApiError(404, "Article not found.");


        // ---------- STEP 4: HTML se text ----------
        const text = htmlToText(article.content);

        if (!text) throw new ApiError(400, "This article has no readable content.");

        // ---------- STEP 5: system prompt ----------
        const system = buildSystemPrompt({ title: article.title, text });

        let userMessage;

        if (hasQuick) {
            userMessage = getQuickPrompt(quick);
            if (!userMessage) throw new ApiError(400, "Invalid quick option.");
        } else {
            userMessage = message.trim();
        }

        // ---------- STEP 7: history chhaano ----------
        const cleanedHistory = cleanHistory(history);


        // ---------- STEP 8: AI ko bhejo ----------
        // TODO (baad mein): yahan cache ka check aayega (summary, keyPoints...)
        const answer = await generateAnswer({
            system,
            messages: [
                ...cleanedHistory,
                { role: "user", content: userMessage }
            ]
        });


        // ---------- STEP 9: jawab ----------
        res.status(200).json(new ApiResponse(200, "AI answer", { answer }));

    } catch (error) {
        next(error);
    }
}

async function communityChat(req, res, next) {

    try {

        const { mode: requestedMode, message, history } = req.body ?? {};

        // ---------- STEP 1: login ----------
        if (!req.user?.id) throw new ApiError(401, "Please login to use the AI assistant.");

        // ---------- STEP 2: mode ----------
        // na aaye -> ask, galat naam -> error
        const mode = communityPrompts.resolveMode(requestedMode);

        if (!mode) {
            throw new ApiError(400, "Invalid mode. Use ask, explain, debug or review.");
        }


        // ---------- STEP 3: message ki jaanch ----------
        if (typeof message !== "string" || message.trim() === "") {
            throw new ApiError(400, "Message is required.");
        }

        if (message.trim().length > communityPrompts.MAX_MESSAGE_LENGTH) {
            throw new ApiError(400, `Message must be ${communityPrompts.MAX_MESSAGE_LENGTH} characters or less.`);
        }

        // TODO (baad mein): yahan rozana limit ka check aayega


        // ---------- STEP 4: system prompt ----------
        const system = communityPrompts.buildSystemPrompt(mode);


        // ---------- STEP 5: user ka message ----------
        const userMessage = communityPrompts.buildUserMessage(message.trim());


        // ---------- STEP 6: history chhaano ----------
        const cleanedHistory = cleanCommunityHistory(history);


        // ---------- STEP 7: AI ko bhejo ----------
        const answer = await generateAnswer({
            system,
            messages: [
                ...cleanedHistory,
                { role: "user", content: userMessage }
            ],
            maxTokens: 2000   // code wale jawab lambe hote hain
        });


        // ---------- STEP 8: milti julti posts (baad mein) ----------
        // Sirf debug aur ask mein. Abhi hamesha khali, frontend ko kuch nahi badalna parega
        const relatedPosts = [];


        // ---------- STEP 9: jawab ----------
        res.status(200).json(new ApiResponse(200, "AI answer", { answer, relatedPosts }));

    } catch (error) {
        next(error);
    }
}

module.exports = { articleChat, communityChat };