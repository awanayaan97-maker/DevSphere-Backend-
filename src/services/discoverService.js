const BookMark = require("../Models/BookmarkSchema");
const Follow = require("../Models/FollowSchema");
const Post = require("../Models/Post");
const PostBookmark = require("../Models/PostBookmark");
const PublishArticle = require("../Models/PublishArticleSchema");
const User = require("../Models/UserSchema");
const mongoose = require("mongoose")


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

const TAG_SOURCES = {
    articles: PublishArticle,
    posts: Post
};

async function getDiscoverDevelopersService(currentUserId) {

    let currentUserRole = null;
    let alreadyFollowingIds = [];

    if (currentUserId) {

        const [currentUser, followingDocs] = await Promise.all([
            User.findById(currentUserId).select("role"),
            Follow.find({ follower: currentUserId }).select("followedUser")
        ]);

        currentUserRole = currentUser?.role || null;
        alreadyFollowingIds = followingDocs.map((doc) => doc.followedUser);
    }

    let roleMatchedUsers = [];

    if (currentUserRole) {

        const matchStage = { role: currentUserRole };

        if (currentUserId) {

            matchStage._id = {
                $ne: new mongoose.Types.ObjectId(currentUserId),
                $nin: alreadyFollowingIds
            }
        }

        roleMatchedUsers = await User.aggregate([

            {
                $match: matchStage
            },

            {
                $lookup: {
                    from: "follows",
                    localField: "_id",
                    foreignField: "followedUser",
                    as: "followersData"
                }
            },

            {
                $addFields: {
                    followersCount: { $size: "$followersData" },
                }
            },

            {
                $sort: { followersCount: -1 }
            },

            {
                $limit: 5
            },

            {
                $project: {
                    _id: 1,
                    firstName: 1,
                    lastName: 1,
                    role: 1,
                    profileImage: 1,
                    followersCount: 1,
                }
            }

        ]);
    }

    let finalList = roleMatchedUsers;

    if (finalList.length < 5) {

        const excludeIds = [
            ...finalList.map((u) => u._id),
            ...alreadyFollowingIds
        ];

        if (currentUserId) {
            excludeIds.push(new mongoose.Types.ObjectId(currentUserId));
        }

        const remainingCount = 5 - finalList.length;

        const globalUsers = await User.aggregate([

            {
                $match: {
                    _id: { $nin: excludeIds },
                    role: { $ne: "" }
                }
            },

            {
                $lookup: {
                    from: "follows",
                    localField: "_id",
                    foreignField: "followedUser",
                    as: "followersData"
                }
            },

            {
                $addFields: {
                    followersCount: { $size: "$followersData" },
                }
            },

            {
                $sort: { followersCount: -1 }
            },

            {
                $limit: remainingCount
            },

            {
                $project: {
                    _id: 1,
                    firstName: 1,
                    lastName: 1,
                    role: 1,
                    profileImage: 1,
                    followersCount: 1,
                }
            }

        ]);

        finalList = [...finalList, ...globalUsers];
    }

    return finalList

}

async function popularTagsService(source, limit) {

    if (!Object.hasOwn(TAG_SOURCES, source)) {
        throw new ApiError(400, "Invalid source. Use 'articles' or 'posts'.");
    }

    const Model = TAG_SOURCES[source];

    const tags = await Model.aggregate([

        { $unwind: "$tags" },

        {
            $group: {
                _id: "$tags.tagValue",
                count: { $sum: 1 }
            }
        },

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

    return tags

}

async function getBookmarkedService(source, userId) {

    if (!Object.hasOwn(BOOKMARK_SOURCES, source)) {
        throw new ApiError(400, "Invalid source. Use 'articles' or 'posts'.");
    }

    const { Model, field, from, commentsFrom, commentsKey } = BOOKMARK_SOURCES[source];

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

    return data

}

module.exports = { getDiscoverDevelopersService, popularTagsService, getBookmarkedService }