const DraftArticle = require("../Models/DraftArticleSchema");
const PublishArticle = require("../Models/PublishArticleSchema");
const cheerio = require("cheerio");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const cloudinary = require("../Config/cloudinary");
const { default: mongoose } = require("mongoose");
const Follow = require("../Models/FollowSchema");
const getPagination = require("../utils/pagination");
const getSortOptions = require("../utils/sortingOptions,");
const BookMark = require("../Models/BookmarkSchema");
const ArticleComments = require("../Models/ArticleCommentsSchema");
const { getArticlesFeedService, searchArticlesService } = require("../services/articleService");


async function getArticlesFeed(req, res, next) {

    try {

        const userId = req.user?.id;
        const articles = await getArticlesFeedService(userId, req.validated.query);

        return res.status(200).json(
            new ApiResponse(200, "Articles feed fetched successfully", articles)
        );
    }

    catch (error) {
        next(error);
    }
}

async function searchArticles(req, res, next) {

    try {

        const userId = req.user?.id;
        const articles = await searchArticlesService(userId, req.validated.query);
        const message = articles.length > 0
            ? "Articles fetched successfully"
            : "No articles found matching your search";

        return res.status(200).json(
            new ApiResponse(200, message, articles)
        );

    } 
    
    catch (error) {
        next(error);
    }
}

async function getSpecificPublishArticle(req, res, next) {

    const { id } = req.params;
    const userId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : null;

    try {

        const article = await PublishArticle.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(id) }
            },

            {
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "_id",
                    as: "authorDetails"
                }
            },

            {
                $lookup: {
                    from: "articlecomments",
                    let: { articleId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$articleId", "$$articleId"] },
                                        { $eq: ["$parentComment", null] }
                                    ]
                                }
                            }
                        },
                    ],
                    as: "commentsData"
                }
            },

            {
                $unwind: "$authorDetails"
            },

            {
                $addFields: {
                    commentsCount: { $size: "$commentsData" },
                    likesCount: { $size: "$likes" },
                    isLiked: { $in: [userId, "$likes"] },
                    isBookmark: { $in: [userId, "$bookmark"] },
                    bookmarksCount: { $size: "$bookmark" },
                }
            },


            {
                $project: {
                    "authorDetails.profileImage": 1,
                    "authorDetails.role": 1,
                    "authorDetails.firstName": 1,
                    "authorDetails.lastName": 1,
                    "authorDetails.lastName": 1,
                    title: 1,
                    description: 1,
                    tags: 1,
                    content: 1,
                    category: 1,
                    readTime: 1,
                    tableOfContent: 1,
                    likesCount: 1,
                    isBookmark: 1,
                    isLiked: 1,
                    commentsCount: 1,
                    bookmarksCount: 1,
                    createdAt: 1,
                    author: 1
                }
            }
        ])


        if (article) return res.status(200).json(new ApiResponse(200, "article fetched", article[0]))

        if (!article.length) throw new ApiError(404, "Article not found");

        else throw new ApiError(500, "something went wrong")

    }

    catch (error) {
        next(error)
    }

}

async function getSpecificArticle(req, res, next) {

    const userId = req.user.id

    const { id } = req.params;
    if (!id) return next(new ApiError(401, "Invalid path"))

    try {

        const draftArticle = await DraftArticle.findOne({ _id: id, author: userId });

        if (draftArticle) return res.status(200).json(new ApiResponse(200, "article Fetched", draftArticle))

        const publishArticle = await PublishArticle.findOne({ _id: id, author: userId })

        if (publishArticle) return res.status(200).json(new ApiResponse(200, "article Fetched", publishArticle))

        else throw new ApiError(500, "Something went wrong")

    }

    catch (error) {
        next(error)
    }

}

async function publishArticle(req, res, next) {

    const { title, content, category } = req.body ?? {};

    if (!title.trim()) return next(new ApiError(400, `Don't forget to give your article a title!`));
    if (!content.trim()) return next(new ApiError(400, 'Article content cannot be empty.'));
    if (!category.trim()) return next(new ApiError(400, 'category` is required'));

    function stripHTML(content) {
        return content.replace(/<[^>]*>/g, " ");
    }

    function calculateReadTime(text) {
        const wordCount = text.trim().split(/\s+/).length;
        return Math.ceil(wordCount / 200)
    }

    function extractHeadings(html) {
        const $ = cheerio.load(html);
        const headings = [];

        $("h2, h3").each((i, el) => {
            const text = $(el).text();
            const id = text.toLowerCase().trim().replace(/\s+/g, "-");
            const level = el.tagName;

            headings.push({ text, id, level });
        });

        return headings;
    }

    const plainText = stripHTML(content);
    const articleReadTime = calculateReadTime(plainText);
    const headings = extractHeadings(content);

    const userId = req.user.id;
    const { articleId } = req.params;

    const articleData = {
        ...req.body,
        author: userId,
        readTime: articleReadTime,
        tableOfContent: headings
    };


    try {

        if (articleId?.trim()) {

            const checkDraftArticles = await DraftArticle.findOne({ _id: articleId, author: userId })

            if (checkDraftArticles) {

                const draftToPublishArticle = await PublishArticle.create(articleData)

                if (draftToPublishArticle) {

                    const deleteDraftArticle = await DraftArticle.deleteOne({ _id: articleId, author: userId })

                    return res.status(200).json(new ApiResponse(200, "Draft to publish article",))
                }

            }


            const checkPublishArticles = await PublishArticle.findOne({ _id: articleId, author: userId })

            if (checkPublishArticles) {

                const updatePublishArticle = await PublishArticle.findOneAndUpdate(
                    { _id: articleId, author: userId },
                    { $set: articleData },
                    { new: true },
                )

                return res.status(200).json(new ApiResponse(200, "Article update successfully"))
            }

            else throw new ApiError(404, "article not found")
        }

        const publishArticle = await PublishArticle.create(articleData)

        if (publishArticle) return res.status(201).json(new ApiResponse(201, "article publish"))

        else throw new ApiError(500, "something went wrong")

    }

    catch (error) {
        next(error)
    }


}

async function articleImageUpload(req, res, next) {

    const imagePath = req.file?.path;

    if (!imagePath) return res.status(400).json(new ApiResponse(400, "Image file is required"));

    try {

        const cloudinaryResult = await cloudinary.uploader.upload(imagePath);

        const cloudinaryUrl = cloudinaryResult.secure_url

        if (cloudinaryUrl) return res.status(200).json(new ApiResponse(200, "file uploaded sucessfully", cloudinaryUrl))

        else throw new ApiError(500, "Something went wrong")

    }

    catch (error) {
        next(error)
    }

}

async function deleteArticle(req, res, next) {

    const userId = req.user.id
    const { articleId } = req.params;
    if (!articleId?.trim()) return next(new ApiError(400, "Invalid path"))

    try {

        const findArticle = await PublishArticle.findOne({ _id: articleId, author: userId });

        if (findArticle) {
            await Promise.all([
                PublishArticle.deleteOne({ _id: articleId, author: userId }),
                BookMark.deleteOne({ article: articleId }),
                ArticleComments.deleteOne({ articleId: articleId })
            ])

            return res.status(200).json(new ApiResponse(200, "Article Deleted successfully"))
        }

        else {
            return next(new ApiError(404, "Article not found"));
        }

    }

    catch (error) {
        next(error)
    }

}

async function exploreArticles(req, res, next) {

    const currentUser = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : null;
    const { tag, sort, category } = req.query;

    const sevenDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { page, limit, skip } = getPagination(req.query);

    let transformationStages = [

        {
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "_id",
                as: "authorDetails"
            }
        },

        {
            $lookup: {
                from: "follows",
                localField: "author",
                foreignField: "followedUser",
                as: "followingsData"
            }
        },

        {
            $lookup: {
                from: "articlecomments",
                let: { articleId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$articleId", "$$articleId"] },
                                    { $eq: ["$parentComment", null] }
                                ]
                            }
                        }
                    },
                ],
                as: "commentsData"
            }
        },

        {
            $unwind: "$authorDetails"
        },

        {
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: { $in: [currentUser, "$likes"] },
                isBookmark: { $in: [currentUser, "$bookmark"] },
                bookmarkCounts: { $size: "$bookmark" },
                commentsCount: { $size: "$commentsData" },
                isFollowingAuthor: {
                    $in: [
                        currentUser,
                        {
                            $map: {
                                input: "$followingsData",
                                as: "f",
                                in: "$$f.follower"
                            }
                        }
                    ]
                }
            }
        },

        {
            $addFields: {
                trendingScore: {
                    $add: [
                        "$likesCount",
                        { $multiply: ["$commentsCount", 2] }
                    ]
                }
            }
        }

    ]

    let paginationStages = [

        {
            $skip: skip
        },

        {
            $limit: limit
        },

        {
            $project: {
                "authorDetails.profileImage": 1,
                "authorDetails.role": 1,
                "authorDetails.firstName": 1,
                "authorDetails.lastName": 1,
                "authorDetails._id": 1,
                title: 1,
                description: 1,
                tags: 1,
                content: 1,
                category: 1,
                readTime: 1,
                tableOfContent: 1,
                likes: 1,
                likesCount: 1,
                isLiked: 1,
                commentsCount: 1,
                isBookmark: 1,
                bookmarkCounts: 1,
                trendingScore: 1,
                isFollowingAuthor: 1,
                createdAt: 1,
            }
        }

    ]

    let pipeline = []

    let matchConditions = {};

    if (tag) {
        matchConditions["tags.tagValue"] = tag.trim().toLowerCase();
    }

    if (category) {
        matchConditions.category = category.trim();
    }

    if (sort?.trim() === "trending") {
        matchConditions.createdAt = { $gte: sevenDaysAgo };
    }

    if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
    }

    pipeline.push(...transformationStages);

    if (sort?.trim() === "trending") {

        pipeline.push({ $sort: { trendingScore: -1 } });
        pipeline.push(...paginationStages);

    } else if (sort?.trim() === "mostDiscuss") {

        pipeline.push({ $sort: { commentsCount: -1 } });
        pipeline.push(...paginationStages);

    } else {

        pipeline.push({ $sort: { createdAt: -1 } });
        pipeline.push(...paginationStages);
    }

    try {

        const exploreArticles = await PublishArticle.aggregate(pipeline)

        res.status(200).json(new ApiResponse(200, "explore Articles", exploreArticles))

    }

    catch (error) {
        next(error)
    }

}

module.exports = { getArticlesFeed, searchArticles, publishArticle, getSpecificPublishArticle, getSpecificArticle, articleImageUpload, deleteArticle, exploreArticles }