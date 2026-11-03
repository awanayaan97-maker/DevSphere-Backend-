
const { z } = require("zod");
const { paginationSchema, objectId } = require("./commonValidation");
const CATEGORIES = require("../constants/categories");

function htmlToPlain(html) {
    return html
        .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;|&#160;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

const feedArticleSchema = z.object({

    query: paginationSchema.extend({
        feed: z.string("Feed is required")
            .trim()
            .pipe(z.enum(["following", "all"], "Route is not defined").default("all")),

        sort: z.string("sort is required")
            .trim()
            .pipe(z.enum(["latest", "oldest", "mostLiked"], "Route is not defined").default("latest"))
    })

})

const searchArticleSchema = z.object({

    query: paginationSchema.extend({
        sort: z.string("sort is required")
            .trim()
            .pipe(z.enum(["latest", "oldest", "mostLiked", "relevance"], "Route is not defined").default("latest")),

        q: z.string("Search query must be a string")
            .trim()
            .min(1, "Search query cannot be empty")
    })

})

const getArticleByIdSchema = z.object({
    params: objectId
})

const getArticleForEditSchema = z.object({
    params: objectId
})

const publishArticleSchema = z.object({
    body: z.object({
        title: z.string("Title is required")
            .trim()
            .min(10, "Title must be at least 10 characters long")
            .max(100, "Title cannot exceed 100 characters"),

        content: z.string("Content is required")
            .max(500000, "Content is too long")
            .refine(
                (html) => htmlToPlain(html).length >= 100,
                "Article content must have at least 100 characters of text"
            ),

        tags: z.array(
            z.object({
                tagValue: z.string().trim().toLowerCase().min(1).max(30)
            })
        ).max(10, "You can add at most 10 tags").default([]),

        category: z.enum(CATEGORIES, "Please select a valid category"),

        params: objectId.optional()
    })
})

const deleteArticleSchema = z.object({
    params: objectId
})

const exploreArticlesSchema = z.object({
    query: paginationSchema.extend({
        sort: z.enum(["latest", "trending", "mostDiscuss"], "Invalid sort option").default("latest"),
        tag: z.string().trim().toLowerCase().min(1).max(30).optional(),
        category: z.preprocess(
            (v) => (v === "" ? undefined : v),
            z.enum(CATEGORIES, "Please select a valid category").optional()
        )
    })
});

module.exports = { feedArticleSchema, searchArticleSchema, getArticleByIdSchema, getArticleForEditSchema, publishArticleSchema, deleteArticleSchema, exploreArticlesSchema }