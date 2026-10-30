
const User = require("../Models/UserSchema");
const ApiResponse = require("../utils/ApiResponse");
const cloudinary = require("../Config/cloudinary");
const ApiError = require("../utils/ApiError");
const { default: mongoose } = require("mongoose");
const Follow = require("../Models/FollowSchema");
const PublishArticle = require("../Models/PublishArticleSchema");
const Notification = require("../Models/NotificationSchema");
const ArticleComments = require("../Models/ArticleCommentsSchema");
const bcrypt = require("bcrypt")

async function getUser(req, res, next) {

    const userId = req.user.id;

    try {

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
                            $sort: { createdAt: - 1 }
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

        ])

        if (!findUser) throw new ApiError(404, "Your account could not be found.");

        res.status(200).json(new ApiResponse(200, "Data fetched successfully", findUser[0]));

    }

    catch (error) {
        next(error)
    }



}

async function getUserWithArticles(req, res, next) {

    const userId = req.user.id || null
    const { page, limit, type, sort } = req.validated.query;
    const skip = (page - 1) * 10;

    try {

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
                    isLiked: { $in: [userId, "$likes"] },
                    likesCount: { $size: "$likes" }
                }
            },

            {
                $sort: { createdAt: -1 }
            },

            {
                $limit: limit
            },

            {
                $skip: skip
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

        ])

        if (userWithArticles) return res.status(200).json(new ApiResponse(200, "user with articles", userWithArticles))

        else throw new ApiError(500, "Something went wrong")

    }



    catch (error) {
        next(error)
    }


}

async function getPublicUser(req, res, next) {

    const { id } = req.params;
    const userId = req.user?.id;

    if (!id.trim()) return next(new ApiError(404, "Invalid path"));

    const objectIdUserId = userId ? new mongoose.Types.ObjectId(userId) : null;

    try {

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

        ])

        const articleIds = findUser[0].userArticleData.map(a => a._id);

        const commentCounts = await ArticleComments.aggregate([

            { $match: { articleId: { $in: articleIds }, parentComment: null } },
            { $group: { _id: "$articleId", count: { $sum: 1 } } }

        ])

        findUser[0].userArticleData = findUser[0].userArticleData.map((article) => {

            const match = commentCounts.find((item) => item._id.toString() === article._id.toString())
            return {
                ...article,
                commentsCount: match ? match.count : 0
            }

        })

        if (!findUser) throw new ApiError(404, "User not found")

        res.status(200).json(new ApiResponse(200, "user data", findUser[0]))

    }

    catch (error) {
        next(error)
    }

}

async function updateUser(req, res, next) {

    const userId = req.user.id;
    const requestData = req.body;

    try {

        const checkUser = await User.findOne({ _id: userId });

        if (!checkUser) throw new ApiError(404, "Your account could not be found.");

        if (requestData.newPassword) {

            if (checkUser.authProvider === "google") {
                throw new ApiError(400, "This account uses Google Sign-In. Password cannot be changed.");
            }

            if (!requestData.currentPassword) {
                throw new ApiError(400, "Current password is required.");
            }

            const isMatch = await bcrypt.compare(requestData.currentPassword, checkUser.password);

            if (!isMatch) {
                throw new ApiError(401, "Current password is incorrect.");
            }

            const hashedPassword = await bcrypt.hash(requestData.newPassword, 10);
            requestData.password = hashedPassword;
        }

        delete requestData.currentPassword;
        delete requestData.newPassword;

        if (req.files?.profileImage) {
            const profileImagePath = req.files.profileImage[0].path;
            const cloudinaryResult = await cloudinary.uploader.upload(profileImagePath);
            requestData.profileImage = cloudinaryResult.secure_url;
        }

        if (req.files?.coverImage) {
            const coverImagePath = req.files.coverImage[0].path;
            const cloudinaryResult = await cloudinary.uploader.upload(coverImagePath);
            requestData.coverImage = cloudinaryResult.secure_url;
        }

        const data = await User.findOneAndUpdate(
            { _id: userId },
            { $set: requestData },
            { new: true }
        ).select("-password");

        res.status(201).json(new ApiResponse(201, "Update successfully", data));

    } catch (error) {
        next(error);
    }

}

async function followUser(req, res, next) {

    const follower = req.user.id;
    const { followedUser, action } = req.body;

    try {

        if (action?.trim() === "follow") {

            const increaseFollow = await Follow.create({ follower: follower, followedUser: followedUser })

            if (increaseFollow) {

                const senderData = await User.findOne({ _id: follower }).select("firstName lastName profileImage role _id")

                const newNotification = await Notification.create({
                    sender: increaseFollow?.follower,
                    receiver: increaseFollow?.followedUser,
                    type: "follow",
                    message: `${req.user.firstName} ${req.user.lastName} is follow you`
                })

                const notificationData = {
                    ...newNotification._doc,
                    senderData
                }

                req.io.to(increaseFollow?.followedUser.toString()).emit("follow_notification", notificationData)

                res.status(201).json(new ApiResponse(201, "Follow successfully",));
                return

            }

        }

        else if (action?.trim() === "unfollow") {

            const [deleteFollow] = await Promise.all([
                await Follow.deleteOne({ follower: follower, followedUser: followedUser }),
                await Notification.deleteOne({ sender: follower, receiver: followedUser, type: "follow" })
            ])

            res.status(200).json(new ApiResponse(200, "unFollow successfully",));

        }

        else throw new ApiError(500, "something went wrong")

    }

    catch (error) {
        next(error)
    }

}

async function getConnections(req, res, next) {

    const { type } = req.params;
    const userId = req.user.id;

    try {

        if (type.trim() === "followings") {

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

            ])

            return res.status(200).json(new ApiResponse(200, "user followings data", followingsData))

        }

        if (type.trim() === "followers") {

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

            ])


            return res.status(200).json(new ApiResponse(200, "user followers data", followersData))
        }

        throw new ApiError(500, "something went wrong")

    }

    catch (error) {
        next(error)
    }

}

async function markNotificationsAsRead(req, res, next) {

    try {

        const userId = req.user.id;

        await Notification.updateMany(
            { receiver: userId, isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json(new ApiResponse(200, "Notifications marked as read", null));
    } catch (error) {
        next(error);
    }
}

module.exports = { getUser, getUserWithArticles, getPublicUser, updateUser, followUser, getConnections, markNotificationsAsRead }