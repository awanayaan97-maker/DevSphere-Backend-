
const { z } = require("zod");
const { paginationSchema } = require("./commonValidation");

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

module.exports = { feedArticleSchema, searchArticleSchema }