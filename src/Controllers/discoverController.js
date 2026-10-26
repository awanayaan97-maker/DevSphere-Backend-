

const PublishArticle = require("../Models/PublishArticleSchema");
const Post = require('../Models/Post');
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const BookMark = require("../Models/BookmarkSchema");
const PostBookmark = require("../Models/PostBookmark");
const { default: mongoose } = require("mongoose");

const TAG_SOURCES = {
    articles: PublishArticle,
    posts: Post
};

const BOOKMARK_SOURCES = {
    articles: {
        Model: BookMark,
        field: "article",
        from: "publisharticles",
        commentsFrom: "articlecomments",
        commentsKey: "articleId"
    },
    posts: {
        Model: PostBookmark,
        field: "post",
        from: "posts",
        commentsFrom: "postcomments",
        commentsKey: "postId"
    }
};

async function popularTags(req, res, next) {

    const source = req.query.source ?? "articles";

    if (!Object.hasOwn(TAG_SOURCES, source)) {
        return next(new ApiError(400, "Invalid source. Use 'articles' or 'posts'."));
    }

    const Model = TAG_SOURCES[source];

    const limit = Math.min(parseInt(req.query.limit) || 8, 20);

    try {

        const tags = await Model.aggregate([

            { $unwind: "$tags" },

            {
                $group: {
                    _id: "$tags.tagValue",
                    count: { $sum: 1 }
                }
            },

            // count barabar ho to naam se, taake order har dafa same rahe
            { $sort: { count: -1, _id: 1 } },

            { $limit: limit },

            {
                $project: {
                    _id: 0,
                    tagValue: "$_id",
                    count: 1
                }
            }

        ]);

        res.status(200).json(new ApiResponse(200, "Popular tags", tags));

    } catch (error) {
        next(error);
    }
}

async function getBookmarkedData(req, res, next) {

    try {

        const source = req.query.source ?? "articles";

        if (!Object.hasOwn(BOOKMARK_SOURCES, source)) {
            return next(new ApiError(400, "Invalid source. Use 'articles' or 'posts'."));
        }

        const { Model, field, from, commentsFrom, commentsKey } = BOOKMARK_SOURCES[source];

        const userId = new mongoose.Types.ObjectId(req.user.id);

        const pipeline = [

            { $match: { user: userId } },
            { $sort: { createdAt: -1, _id: -1 } },

            {
                $lookup: {
                    from,
                    localField: field,
                    foreignField: "_id",
                    as: "item"
                }
            },
            { $unwind: "$item" },

            {
                $lookup: {
                    from: "users",
                    localField: "item.author",
                    foreignField: "_id",
                    as: "authorDetails"
                }
            },
            { $unwind: "$authorDetails" },

            {
                $lookup: {
                    from: commentsFrom,
                    let: { itemId: "$item._id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: [`$${commentsKey}`, "$$itemId"] },
                                        { $eq: ["$parentComment", null] }
                                    ]
                                }
                            }
                        },
                        { $project: { _id: 1 } }
                    ],
                    as: "commentsData"
                }
            },

            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            "$item",
                            {
                                authorDetails: "$authorDetails",
                                likesCount: { $size: { $ifNull: ["$item.likes", []] } },
                                isLiked: { $in: [userId, { $ifNull: ["$item.likes", []] }] },
                                commentsCount: { $size: "$commentsData" },
                                isBookmark: true,
                                savedAt: "$createdAt"
                            }
                        ]
                    }
                }
            },

            {
                $project: {
                    "authorDetails._id": 1,
                    "authorDetails.firstName": 1,
                    "authorDetails.lastName": 1,
                    "authorDetails.profileImage": 1,
                    "authorDetails.role": 1,
                    // articles
                    title: 1,
                    description: 1,
                    content: 1,
                    category: 1,

                    // posts
                    type: 1,
                    text: 1,
                    code: 1,
                    codeLanguage: 1,
                    images: 1,
                    
                    // comman
                    tags: 1,
                    likesCount: 1,
                    isLiked: 1,
                    commentsCount: 1,
                    isBookmark: 1,
                    savedAt: 1,
                    createdAt: 1
                }
            }
        ];

        const data = await Model.aggregate(pipeline);

        res.status(200).json(new ApiResponse(200, "Bookmarks fetched", data));

    } catch (error) {
        next(error);
    }
}

module.exports = { popularTags, getBookmarkedData }