
const { z } = require("zod");
const { paginationSchema, objectId, bodyObjectId } = require("./commonValidation");


const userArticleSchema = z.object({
    query: paginationSchema
})

const getPublicUserSchema = z.object({
    params: objectId
})

const userConnectionSchema = z.object({
    params: z.object({
        type: z.enum(["followings", "followers"], {
            message: "Route is not defined",
        })
    })
});

const userFollowSchema = z.object({

    body: z.object({
        followedUser: bodyObjectId,
        action: z.enum(["follow", "unfollow"], {
            message: "Action must be either 'follow' or 'unfollow'",
        }),
    }),
});

module.exports = { userArticleSchema, getPublicUserSchema, userConnectionSchema, userFollowSchema }

