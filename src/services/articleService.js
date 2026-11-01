const PublishArticle = require("../Models/PublishArticleSchema");
const getPagination = require("../utils/pagination");
const mongoose = require("mongoose");
const getSortOptions = require("../utils/sortingOptions,");
const Follow = require("../Models/FollowSchema");
const ApiError = require("../utils/ApiError");
const DraftArticle = require("../Models/DraftArticleSchema");
const { stripHTML, calculateReadTime, extractHeadings } = require("../utils/helper");
const BookMark = require("../Models/BookmarkSchema");
const ArticleComments = require("../Models/ArticleCommentsSchema");

async function getArticlesFeedService(userId, queryParams) {

    const { feed, sort } = queryParams;
    const { page, limit, skip } = getPagination(queryParams);
    const objectIdUserId = userId ? new mongoose.Types.ObjectId(userId) : null;
    const sortOptions = getSortOptions();
    const sortStage = sortOptions[sort] || sortOptions.latest;

    let pipeline = [];

    if (feed === "following") {
        if (!userId) {
            return [];
        }

        const followingDocs = await Follow.find({ follower: userId }).select("followedUser");
        const followingIds = followingDocs.map((doc) => doc.followedUser);

        if (followingIds.length === 0) {
            return [];
        }

        pipeline.push({
            $match: { author: { $in: followingIds } }
        });
    }

    pipeline.push(
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
                as: "authorFollowersData"
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
                    }
                ],
                as: "commentsData"
            }
        },
        { $unwind: "$authorDetails" },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                bookmarksCount: { $size: "$bookmark" },
                commentsCount: { $size: "$commentsData" },
                isLiked: { $in: [objectIdUserId, "$likes"] },
                isBookmark: { $in: [objectIdUserId, "$bookmark"] },
                isFollowingAuthor: {
                    $in: [
                        objectIdUserId,
                        {
                            $map: {
                                input: "$authorFollowersData",
                                as: "f",
                                in: "$$f.follower"
                            }
                        }
                    ]
                }
            }
        },
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limit },
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
                isBookmark: 1,
                bookmarksCount: 1,
                commentsCount: 1,
                isFollowingAuthor: 1,
                createdAt: 1
            }
        }
    );

    const articles = await PublishArticle.aggregate(pipeline);
    return articles;
}

async function searchArticlesService(userId, queryParams) {

    const { q, sort } = queryParams;
    const { page, limit, skip } = getPagination(queryParams);
    const objectIdUserId = userId ? new mongoose.Types.ObjectId(userId) : null;
    const sortOptions = getSortOptions();
    const sortStage = sortOptions[sort] || sortOptions.relevance;

    const searchArticles = await PublishArticle.aggregate([
        {
            $match: {
                $text: { $search: q }
            }
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
                    }
                ],
                as: "commentsData"
            }
        },
        {
            $unwind: "$authorDetails"
        },
        {
            $addFields: {
                relevanceScore: { $meta: "textScore" },
                isLiked: { $in: [objectIdUserId, "$likes"] },
                isBookmark: { $in: [objectIdUserId, "$bookmark"] },
                bookmarksCount: { $size: "$bookmark" },
                likesCount: { $size: "$likes" },
                commentsCount: { $size: "$commentsData" },
            }
        },
        {
            $sort: sortStage
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        },
        {
            $project: {
                "authorDetails.firstName": 1,
                "authorDetails.lastName": 1,
                "authorDetails.profileImage": 1,
                "authorDetails.role": 1,
                title: 1,
                description: 1,
                tags: 1,
                content: 1,
                category: 1,
                readTime: 1,
                tableOfContent: 1,
                likes: 1,
                likesCount: 1,
                commentsCount: 1,
                isLiked: 1,
                isBookmark: 1,
                bookmarksCount: 1,
                relevanceScore: 1,
                createdAt: 1
            }
        }
    ]);

    return searchArticles;
}

async function getArticleByIdService(articleId, loggedInUserId) {

    const objectIdUserId = loggedInUserId ? new mongoose.Types.ObjectId(loggedInUserId) : null;

    const article = await PublishArticle.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(articleId) }
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
                    }
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
                isLiked: { $in: [objectIdUserId, "$likes"] },
                isBookmark: { $in: [objectIdUserId, "$bookmark"] },
                bookmarksCount: { $size: "$bookmark" },
            }
        },
        {
            $project: {
                "authorDetails.profileImage": 1,
                "authorDetails.role": 1,
                "authorDetails.firstName": 1,
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
    ]);

    if (!article || article.length === 0) {
        throw new ApiError(404, "Article not found");
    }

    return article[0];
}

async function getArticleForEditService(userId, articleId) {

    if (!articleId) {
        throw new ApiError(400, "Invalid article path or ID");
    }

    const draftArticle = await DraftArticle.findOne({
        _id: articleId,
        author: userId
    });

    if (draftArticle) {
        return { article: draftArticle, type: "draft" };
    }

    const publishArticle = await PublishArticle.findOne({
        _id: articleId,
        author: userId
    });

    if (publishArticle) {
        return { article: publishArticle, type: "published" };
    }

    throw new ApiError(404, "Article could not be found or you do not have permission to edit it.");
}

async function publishOrUpdateArticleService(userId, bodyData, articleId) {

    const { content } = bodyData;
    const plainText = stripHTML(content);
    const readTime = calculateReadTime(plainText);
    const tableOfContent = extractHeadings(content);

    const articleData = {
        ...bodyData,
        author: userId,
        readTime,
        tableOfContent
    };

    if (articleId) {

        const draftArticle = await DraftArticle.findOne({ _id: articleId, author: userId });

        if (draftArticle) {
            const publishedArticle = await PublishArticle.create(articleData);
            if (!publishedArticle) {
                throw new ApiError(500, "Failed to publish draft article");
            }

            await DraftArticle.deleteOne({ _id: articleId, author: userId });
            return { article: publishedArticle, status: "published_from_draft" };
        }

        const publishedArticle = await PublishArticle.findOne({ _id: articleId, author: userId });

        if (publishedArticle) {
            const updatedArticle = await PublishArticle.findOneAndUpdate(
                { _id: articleId, author: userId },
                { $set: articleData },
                { new: true }
            );
            return { article: updatedArticle, status: "updated" };
        }

        throw new ApiError(404, "Article not found");
    }

    const newArticle = await PublishArticle.create(articleData);

    if (!newArticle) {
        throw new ApiError(500, "Something went wrong while publishing the article");
    }

    return { article: newArticle, status: "created" };
}

async function deleteArticleService(userId, articleId) {

    const findArticle = await PublishArticle.findOne({ _id: articleId, author: userId });

    if (!findArticle) {
        throw new ApiError(404, "Article not found or you do not have permission to delete it.");
    }

    await Promise.all([
        PublishArticle.deleteOne({ _id: articleId, author: userId }),
        BookMark.deleteMany({ article: articleId }),
        ArticleComments.deleteMany({ articleId: articleId })
    ]);

    return true;
}

async function exploreArticlesService(queryParams) {

    const { tag, sort, category } = queryParams;
    const userId = queryParams.userId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { page, limit, skip } = getPagination(queryParams);
    const currentUser = userId ? new mongoose.Types.ObjectId(userId) : null;

    let matchConditions = {};

    if (tag) {
        matchConditions["tags.tagValue"] = tag.trim().toLowerCase();
    }

    if (category) {
        matchConditions.category = category.trim();
    }

    if (sort?.trim() === "trending") {
        matchConditions.createdAt = { $gte: thirtyDaysAgo };
    }

    let pipeline = [];

    if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
    }

    pipeline.push(
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
                    }
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
    );

    const trimmedSort = sort?.trim();
    if (trimmedSort === "trending") {
        pipeline.push({ $sort: { trendingScore: -1 } });
    } else if (trimmedSort === "mostDiscuss") {
        pipeline.push({ $sort: { commentsCount: -1 } });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
        { $skip: skip },
        { $limit: limit },
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
                createdAt: 1
            }
        }
    );

    const exploreArticles = await PublishArticle.aggregate(pipeline);
    return exploreArticles;
}

module.exports = { getArticlesFeedService, searchArticlesService, getArticleByIdService, getArticleForEditService, publishOrUpdateArticleService, deleteArticleService, exploreArticlesService }