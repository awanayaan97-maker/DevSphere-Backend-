const PublishArticle = require("../Models/PublishArticleSchema");
const getPagination = require("../utils/pagination");
const mongoose = require("mongoose");
const getSortOptions = require("../utils/sortingOptions,");
const Follow = require("../Models/FollowSchema");

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

module.exports = { getArticlesFeedService, searchArticlesService }