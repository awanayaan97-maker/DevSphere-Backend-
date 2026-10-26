const DraftArticle = require("../Models/DraftArticleSchema");
const Follow = require("../Models/FollowSchema");
const Post = require("../Models/Post");
const PublishArticle = require("../Models/PublishArticleSchema");
const mongoose = require("mongoose");


const CONTENT_TYPE = {

    publish: {
        model: PublishArticle,
        commentsFrom: "articlecomments",
        commentsKey: "articleId"
    },

    draft: {
        model: DraftArticle,
    },

    posts: {
        model: Post,
        commentsFrom: "postcomments",
        commentsKey: "postId"
    }
}

function reduceCallbackFn() {
    return (accumulator, doc) => {
        return accumulator + (doc.likes?.length || 0);
    }
}

async function getDashboardStatsService(userId) {

    const [publishArticles, draftArticles, communityPosts, followers, followings] =
        await Promise.all([
            PublishArticle.find({ author: userId }),
            DraftArticle.find({ author: userId }),
            Post.find({ author: userId }),
            Follow.find({ followedUser: userId }),
            Follow.find({ follower: userId }),
        ]);

    const publishArticlesLikes = publishArticles.reduce(reduceCallbackFn(), 0);
    const postsLikes = communityPosts.reduce(reduceCallbackFn(), 0);
    const totalLikes = publishArticlesLikes + postsLikes;
    const data = {
        publishArticles: publishArticles.length || 0,
        draftArticles: draftArticles.length || 0,
        communityPosts: communityPosts.length || 0,
        followers: followers.length || 0,
        followings: followings.length || 0,
        totalLikes
    }

    return data;

}

async function getDashboardTopArticlesService(userId) {

    const findTopArticles = await PublishArticle.aggregate([

        {
            $match: { author: new mongoose.Types.ObjectId(userId) }
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
            $addFields: {
                likesCount: { $size: { $ifNull: ["$likes", []] } },
                commentsCount: { $size: { $ifNull: ["$commentsData", []] } },
                savesCount: { $size: { $ifNull: ["$bookmark", []] } }
            }
        },

        {
            $addFields: {
                score: {
                    $add: [
                        { $multiply: ["$likesCount", 1] },
                        { $multiply: ["$savesCount", 2] },
                        { $multiply: ["$commentsCount", 4] }
                    ]
                }
            }
        },


        {
            $sort: { score: -1, createdAt: -1 }
        },


        {
            $limit: 5
        },

        {
            $project: {
                likesCount: 1,
                commentsCount: 1,
                savesCount: 1,
                title: 1,
            }
        }

    ]);

    return findTopArticles
}

async function getDashboardFollowersChartService(userId) {

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const followersStats = await Follow.aggregate([
        {
            $match: {
                followedUser: new mongoose.Types.ObjectId(userId),
                createdAt: { $gte: thirtyDaysAgo }
            }
        },

        {
            $group: {
                _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                },
                count: { $sum: 1 }
            }
        },

        {
            $sort: { "_id": 1 }
        }
    ]);

    const chartData = [];

    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split("T")[0];

        const foundData = followersStats.find(item => item._id === dateString);

        chartData.push({
            date: dateString,
            count: foundData ? foundData.count : 0
        });
    }

    return chartData
}

async function getDashboardContentService(type, userId) {

    if (!Object.hasOwn(CONTENT_TYPE, type)) {
        throw new ApiError(400, "Invalid type");
    }

    const { model, commentsFrom, commentsKey } = CONTENT_TYPE[type];

    let pipeLine = [];

    const CommanStages = [

        { $match: { author: userId } },

        {
            $lookup: {
                from: commentsFrom,
                let: { itemId: "$_id" },
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
            $addFields: {
                likesCount: { $size: { $ifNull: ["$likes", []] } },
                commentsCount: { $size: { $ifNull: ["$commentsData", []] } },
                savesCount: { $size: { $ifNull: ["$bookmark", []] } },
                formattedDate: {
                    $dateToString: { format: "%b %d", date: "$createdAt" }
                }
            }
        },

        { $sort: { createdAt: -1, _id: -1 } },

        {
            $project: {
                likesCount: 1,
                commentsCount: 1,
                savesCount: 1,
                title: 1,
                text: 1,
                formattedDate: 1,
            }
        }

    ]

    const draftStages = [
        {
            $match: { author: userId }
        },

        {
            $project: {
                title: 1,
                updatedAt: 1,
            }
        }
    ]

    if (type === "publish" || type === "posts") {
        pipeLine.push(...CommanStages);
    }

    else if (type === "draft") {
        pipeLine.push(...draftStages)
    }

    const contentData = await model.aggregate(pipeLine);
    return contentData;
}

module.exports = { getDashboardStatsService, getDashboardTopArticlesService, getDashboardFollowersChartService, getDashboardContentService }