const Notification = require("../Models/NotificationSchema");
const Post = require("../Models/Post");
const PublishArticle = require("../Models/PublishArticleSchema");
const PostBookmark = require("../Models/PostBookmark");
const BookMark = require("../Models/BookmarkSchema");
const User = require("../Models/UserSchema");
const mongoose = require("mongoose");

const getTargetConfig = (targetType) => {
    if (targetType === "article") {
        return { model: PublishArticle, fieldName: "article" };
    } else if (targetType === "post") {
        return { model: Post, fieldName: "post" };
    }
    throw new ApiError(400, "Invalid target type");
};
const getCommentConfig = (targetType) => {
    if (targetType === "article") {
        return {
            commentModel: ArticleComments,
            ownerModel: PublishArticle,
            idField: "articleId",
            notificationField: "article"
        };
    } else if (targetType === "post") {
        return {
            commentModel: PostComment,
            ownerModel: Post,
            idField: "postId",
            notificationField: "post"
        };
    }
    throw new ApiError(400, "Invalid target type");
};
const getFetchCommentsConfig = (targetType) => {
    if (targetType === "article") {
        return {
            commentModel: ArticleComments,
            idField: "articleId",
            commentCollection: "articlecomments"
        };
    } else if (targetType === "post") {
        return {
            commentModel: PostComment,
            idField: "postId",
            commentCollection: "postcomments"
        };
    }
    throw new ApiError(400, "Invalid target type");
};
const getCommentEditConfig = (targetType) => {
    if (targetType === "article") {
        return ArticleComments;
    } else if (targetType === "post") {
        return PostComment;
    }
    throw new ApiError(400, "Invalid target type");
};
const getCommentLikeConfig = (targetType) => {
    if (targetType === "article") {
        return {
            commentModel: ArticleComments,
            idField: "articleId",
            notificationField: "article"
        };
    } else if (targetType === "post") {
        return {
            commentModel: PostComment,
            idField: "postId",
            notificationField: "post"
        };
    }
    throw new ApiError(400, "Invalid target type");
};
const getBookmarkConfig = (targetType) => {
    if (targetType === "article") {
        return {
            bookmarkModel: BookMark,
            targetModel: PublishArticle,
            idField: "article"
        };
    } else if (targetType === "post") {
        return {
            bookmarkModel: PostBookmark,
            targetModel: Post,
            idField: "post"
        };
    }
    throw new ApiError(400, "Invalid target type");
};

async function toggleLikeService(userId, targetId, targetType) {

    const { model: Model, fieldName } = getTargetConfig(targetType);
    const targetDoc = await Model.findById(targetId);

    if (!targetDoc) {
        throw new ApiError(404, `${targetType} not found`);
    }

    const isLiked = targetDoc.likes.some(
        (id) => id.toString() === userId.toString()
    );

    if (isLiked) {
        await Promise.all([
            Model.updateOne({ _id: targetId }, { $pull: { likes: userId } }),
            Notification.deleteOne({
                sender: userId,
                [fieldName]: targetId,
                type: "like",
            }),
        ]);

        return {
            isLiked: false,
            likesCount: targetDoc.likes.length - 1
        };
    }

    else {
        const [updateResult, checkNotification, senderData] = await Promise.all([
            Model.findOneAndUpdate(
                { _id: targetId },
                { $addToSet: { likes: userId } },
                { new: true }
            ),
            Notification.findOne({
                sender: userId,
                receiver: targetDoc.author,
                [fieldName]: targetId,
                type: "like",
            }),
            User.findOne({ _id: userId }).select("firstName lastName profileImage role _id"),
        ]);

        const likesCount = updateResult.likes.length;
        let notificationData = null;
        let shouldEmit = false;

        const isSelfAction = updateResult.author.toString() === userId.toString();

        if (checkNotification === null && !isSelfAction) {
            const newNotification = await Notification.create({
                sender: userId,
                receiver: updateResult.author,
                type: "like",
                [fieldName]: targetId,
                message: `${senderData.firstName} ${senderData.lastName} liked your ${targetType}`,
            });

            notificationData = {
                ...newNotification._doc,
                senderData,
                likesCount,
                [fieldName]: targetId,
            };
            shouldEmit = true;
        }

        return {
            isLiked: true,
            likesCount,
            receiverId: updateResult.author.toString(),
            notificationData,
            shouldEmit,
        };
    }
}

async function createCommentService(userId, targetId, text, parentComment, targetType) {

    const config = getCommentConfig(targetType);

    const newComment = await config.commentModel.create({
        [config.idField]: targetId,
        user: userId,
        text,
        parentComment: parentComment || null
    });

    if (!newComment) {
        throw new ApiError(500, "Something went wrong while creating comment");
    }

    const [ownerDoc, senderData] = await Promise.all([
        config.ownerModel.findOne({ _id: targetId }).select("author"),
        User.findOne({ _id: userId }).select("firstName lastName profileImage role _id")
    ]);

    let receiverId = null;
    let notificationMessage = "";
    let type = "";

    const data = {
        ...newComment._doc,
        authorData: senderData
    };

    if (!parentComment) {
        receiverId = ownerDoc?.author;
        notificationMessage = `${senderData.firstName} ${senderData.lastName} commented on your ${targetType}`;
        type = "comment";
    } else {
        const parentCommentDoc = await config.commentModel.findById(parentComment).select("user");
        receiverId = parentCommentDoc?.user;
        notificationMessage = `${senderData.firstName} ${senderData.lastName} replied to your comment`;
        type = "comment_like";
    }

    let notificationData = null;
    let shouldNotify = false;

    if (receiverId && receiverId.toString() !== userId.toString()) {
        const newNotification = await Notification.create({
            sender: userId,
            receiver: receiverId,
            [config.notificationField]: targetId,
            type: type,
            message: notificationMessage
        });

        notificationData = {
            ...newNotification._doc,
            senderData: senderData,
            data: data
        };
        shouldNotify = true;
    }

    return {
        data,
        receiverId: receiverId ? receiverId.toString() : null,
        targetId: targetId.toString(),
        notificationData,
        shouldNotify
    };
}

async function getCommentsService(targetId, userId, targetType) {

    const config = getFetchCommentsConfig(targetType);
    const parsedTargetId = new mongoose.Types.ObjectId(targetId);
    const parsedUserId = userId ? new mongoose.Types.ObjectId(userId) : null;

    const comments = await config.commentModel.aggregate([
        {
            $match: {
                [config.idField]: parsedTargetId,
                parentComment: null
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "authorData"
            }
        },
        {
            $unwind: "$authorData"
        },
        {
            $lookup: {
                from: config.commentCollection,
                let: { commentId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$parentComment", "$$commentId"]
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "user",
                            foreignField: "_id",
                            as: "authorData"
                        }
                    },
                    {
                        $unwind: "$authorData"
                    }
                ],
                as: "replies"
            }
        },
        {
            $addFields: {
                hasLikeComment: parsedUserId ? { $in: [parsedUserId, "$likes"] } : false,
                commentLikes: { $size: "$likes" },
                replies: {
                    $map: {
                        input: "$replies",
                        as: "reply",
                        in: {
                            $mergeObjects: [
                                "$$reply",
                                {
                                    hasLikeReplies: parsedUserId ? { $in: [parsedUserId, "$$reply.likes"] } : false
                                }
                            ]
                        }
                    }
                }
            }
        },
        {
            $project: {
                "authorData.firstName": 1,
                "authorData.lastName": 1,
                "authorData.profileImage": 1,
                "authorData.role": 1,
                "authorData._id": 1,
                [config.idField]: 1,
                text: 1,
                hasLikeComment: 1,
                commentLikes: 1,
                likes: 1,
                replies: 1,
                createdAt: 1
            }
        }
    ]);

    return comments;
}

async function editCommentService(commentId, text, targetType) {

    const CommentModel = getCommentEditConfig(targetType);
    const updatedComment = await CommentModel.findByIdAndUpdate(
        commentId,
        { text: text.trim() },
        { new: true }
    );

    if (!updatedComment) {
        throw new ApiError(404, "Comment not found");
    }

    return updatedComment;
}

async function toggleCommentLikeService(userId, commentId, targetType) {

    const config = getCommentLikeConfig(targetType);
    const commentDoc = await config.commentModel.findById(commentId);

    if (!commentDoc) {
        throw new ApiError(404, "Comment not found");
    }

    const isLiked = commentDoc.likes.some(
        (id) => id.toString() === userId.toString()
    );

    if (isLiked) {
        await Promise.all([
            config.commentModel.updateOne({ _id: commentId }, { $pull: { likes: userId } }),
            Notification.deleteOne({
                sender: userId,
                receiver: commentDoc.user,
                type: "comment_like"
            })
        ]);

        return { isLiked: false, shouldNotify: false };
    }

    else {
        const [, checkNotification, senderData] = await Promise.all([
            config.commentModel.updateOne({ _id: commentId }, { $addToSet: { likes: userId } }),
            Notification.findOne({
                sender: userId,
                receiver: commentDoc.user,
                type: "comment_like"
            }),
            User.findOne({ _id: userId }).select("firstName lastName profileImage role _id")
        ]);

        let notificationData = null;
        let shouldNotify = false;

        const isSelfAction = commentDoc.user.toString() === userId.toString();

        if (checkNotification === null && !isSelfAction) {
            const newNotification = await Notification.create({
                sender: userId,
                receiver: commentDoc.user,
                type: "comment_like",
                [config.notificationField]: commentDoc[config.idField],
                message: `${senderData.firstName} ${senderData.lastName} liked your comment`
            });

            notificationData = {
                ...newNotification._doc,
                senderData
            };
            shouldNotify = true;
        }

        return {
            isLiked: true,
            receiverId: commentDoc.user.toString(),
            notificationData,
            shouldNotify
        };
    }
}

async function toggleBookmarkService(userId, targetId, targetType) {

    const config = getBookmarkConfig(targetType);
    const existingBookmark = await config.bookmarkModel.findOne({
        user: userId,
        [config.idField]: targetId
    });

    if (existingBookmark) {
        await Promise.all([
            config.bookmarkModel.deleteOne({ user: userId, [config.idField]: targetId }),
            config.targetModel.updateOne({ _id: targetId }, { $pull: { bookmark: userId } })
        ]);

        return { isBookmarked: false, message: "Bookmark deleted successfully!" };
    } else {
        await Promise.all([
            config.bookmarkModel.create({ user: userId, [config.idField]: targetId }),
            config.targetModel.updateOne({ _id: targetId }, { $addToSet: { bookmark: userId } })
        ]);

        return { isBookmarked: true, message: "Bookmark saved successfully!" };
    }
}

module.exports = { toggleLikeService, createCommentService, getCommentsService, editCommentService, toggleCommentLikeService, toggleBookmarkService }