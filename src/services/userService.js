const ArticleComments = require("../Models/ArticleCommentsSchema");
const PublishArticle = require("../Models/PublishArticleSchema");
const User = require("../Models/UserSchema");
const ApiError = require("../utils/ApiError");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cloudinary = require("../Config/cloudinary");
const Notification = require("../Models/NotificationSchema");
const Follow = require("../Models/FollowSchema");

async function getUserService(userId) {

    const findUser = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(userId) }
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
            $lookup: {
                from: "follows",
                localField: "_id",
                foreignField: "follower",
                as: "followingsData"
            }
        },
        {
            $lookup: {
                from: "notifications",
                let: { currentUserId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$receiver", "$$currentUserId"] },
                                    { $eq: ["$isRead", false] },
                                ]
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: "sender",
                            foreignField: "_id",
                            as: "senderData"
                        }
                    },
                    {
                        $unwind: "$senderData",
                    },
                    {
                        $sort: { createdAt: -1 }
                    },
                    {
                        $project: {
                            "senderData.firstName": 1,
                            "senderData.lastName": 1,
                            "senderData.profileImage": 1,
                            "senderData.role": 1,
                            "senderData._id": 1,
                            type: 1,
                            message: 1,
                            isRead: 1,
                            createdAt: 1,
                        }
                    }
                ],
                as: "notifications"
            }
        },
        {
            $addFields: {
                followers: { $size: "$followersData" },
                followings: { $size: "$followingsData" },
                totalNotifications: { $size: "$notifications" }
            }
        },
        {
            $project: {
                password: 0,
                updatedAt: 0,
                createdAt: 0,
                followersData: 0,
                followingsData: 0,
            }
        }
    ]);

    if (!findUser || findUser.length === 0) {
        throw new ApiError(404, "Your account could not be found.");
    }

    return findUser[0];
}

async function getUserWithArticlesService(userId, queryParams) {

    const { page = 1, limit = 10 } = queryParams;
    const skip = (page - 1) * limit;

    const userWithArticles = await PublishArticle.aggregate([
        {
            $match: { author: new mongoose.Types.ObjectId(userId) }
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
            $unwind: "$authorDetails"
        },
        {
            $addFields: {
                isLiked: { $in: [new mongoose.Types.ObjectId(userId), "$likes"] },
                likesCount: { $size: "$likes" }
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $skip: Number(skip)
        },
        {
            $limit: Number(limit)
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
                createdAt: 1,
            }
        }
    ]);

    return userWithArticles;
}

async function getPublicUserService(id, loggedInUserId) {

    const objectIdUserId = loggedInUserId ? new mongoose.Types.ObjectId(loggedInUserId) : null;

    const findUser = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(id)
            }
        },
        {
            $lookup: {
                from: "publisharticles",
                localField: "_id",
                foreignField: "author",
                as: "userArticleData"
            }
        },
        {
            $lookup: {
                from: "follows",
                localField: "_id",
                foreignField: "followedUser",
                as: "userFollowerData"
            }
        },
        {
            $lookup: {
                from: "follows",
                localField: "_id",
                foreignField: "follower",
                as: "userFollowingData"
            }
        },
        {
            $addFields: {
                followers: { $size: "$userFollowerData" },
                followings: { $size: "$userFollowingData" },
                isFollowingAuthor: {
                    $in: [
                        objectIdUserId,
                        {
                            $map: {
                                input: "$userFollowerData",
                                as: "f",
                                in: "$$f.follower"
                            }
                        }
                    ]
                },
                userArticleData: {
                    $map: {
                        input: "$userArticleData",
                        as: "article",
                        in: {
                            $mergeObjects: [
                                "$$article",
                                {
                                    isLiked: { $in: [objectIdUserId, "$$article.likes"] },
                                    likesCount: { $size: "$$article.likes" },
                                    authorDetails: {
                                        _id: "$_id",
                                        firstName: "$firstName",
                                        lastName: "$lastName",
                                        profileImage: "$profileImage",
                                        role: "$role"
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        },
        {
            $project: {
                password: 0,
                updatedAt: 0,
                createdAt: 0,
                email: 0,
                "userArticleData.updatedAt": 0,
                "userArticleData.likes": 0,
                userFollowerData: 0,
                userFollowingData: 0,
            }
        }
    ]);

    if (!findUser || findUser.length === 0) {
        throw new ApiError(404, "User not found");
    }

    const userData = findUser[0];
    const articleIds = userData.userArticleData.map(a => a._id);
    let commentCounts = [];

    if (articleIds.length > 0) {
        commentCounts = await ArticleComments.aggregate([
            { $match: { articleId: { $in: articleIds }, parentComment: null } },
            { $group: { _id: "$articleId", count: { $sum: 1 } } }
        ]);
    }

    userData.userArticleData = userData.userArticleData.map((article) => {
        const match = commentCounts.find((item) => item._id.toString() === article._id.toString());
        return {
            ...article,
            commentsCount: match ? match.count : 0
        };
    });

    return userData;
}

async function updateUserService(userId, requestData, files) {

    const checkUser = await User.findById(userId);

    if (!checkUser) {
        throw new ApiError(404, "Your account could not be found.");
    }

    const updateData = { ...requestData };

    if (updateData.newPassword) {
        if (checkUser.authProvider === "google") {
            throw new ApiError(400, "This account uses Google Sign-In. Password cannot be changed.");
        }

        if (!updateData.currentPassword) {
            throw new ApiError(400, "Current password is required.");
        }

        const isMatch = await bcrypt.compare(updateData.currentPassword, checkUser.password);

        if (!isMatch) {
            throw new ApiError(401, "Current password is incorrect.");
        }

        updateData.password = await bcrypt.hash(updateData.newPassword, 10);
    }

    delete updateData.currentPassword;
    delete updateData.newPassword;

    if (files?.profileImage) {
        const profileImagePath = files.profileImage[0].path;
        const cloudinaryResult = await cloudinary.uploader.upload(profileImagePath);
        updateData.profileImage = cloudinaryResult.secure_url;
    }

    if (files?.coverImage) {
        const coverImagePath = files.coverImage[0].path;
        const cloudinaryResult = await cloudinary.uploader.upload(coverImagePath);
        updateData.coverImage = cloudinaryResult.secure_url;
    }

    const updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        { $set: updateData },
        { new: true }
    ).select("-password");

    return updatedUser;
}

async function followUserService(followerId, bodyData) {

    const { followedUser, action } = bodyData;

    if (followerId.toString() === followedUser.toString()) {
        throw new ApiError(400, "You cannot follow yourself.");
    }

    if (action === "follow") {
        const increaseFollow = await Follow.create({
            follower: followerId,
            followedUser: followedUser
        });

        const senderData = await User.findById(followerId)
            .select("firstName lastName profileImage role _id");

        const newNotification = await Notification.create({
            sender: followerId,
            receiver: followedUser,
            type: "follow",
            message: `${senderData.firstName} ${senderData.lastName} started following you`
        });

        const notificationData = {
            ...newNotification._doc,
            senderData
        };

        return {
            action: "follow",
            message: "Follow successfully",
            followedUser,
            notificationData
        };
    }

    else if (action === "unfollow") {
        await Promise.all([
            Follow.deleteOne({ follower: followerId, followedUser }),
            Notification.deleteOne({ sender: followerId, receiver: followedUser, type: "follow" })
        ]);

        return {
            action: "unfollow",
            message: "Unfollow successfully"
        };
    }
}

async function getConnectionsService(userId, type) {

    const trimmedType = type?.trim();

    if (trimmedType === "followings") {

        const followingsData = await Follow.aggregate([
            {
                $match: {
                    follower: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "followedUser",
                    foreignField: "_id",
                    as: "followingsData"
                }
            },
            {
                $unwind: "$followingsData"
            },
            {
                $project: {
                    "followingsData.profileImage": 1,
                    "followingsData.firstName": 1,
                    "followingsData.lastName": 1,
                    "followingsData.role": 1,
                    "followingsData._id": 1,
                }
            }
        ]);

        return { type: "followings", data: followingsData };
    }

    else if (trimmedType === "followers") {

        const followersData = await Follow.aggregate([
            {
                $match: {
                    followedUser: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "follower",
                    foreignField: "_id",
                    as: "followersData"
                }
            },
            {
                $unwind: "$followersData"
            },
            {
                $project: {
                    "followersData.profileImage": 1,
                    "followersData.firstName": 1,
                    "followersData.lastName": 1,
                    "followersData.role": 1,
                    "followersData._id": 1,
                }
            }
        ]);

        return { type: "followers", data: followersData };
    }

    else {
        throw new ApiError(400, "Invalid connection type specified.");
    }
}

module.exports = { getUserService, getUserWithArticlesService, getPublicUserService, updateUserService, followUserService, getConnectionsService }