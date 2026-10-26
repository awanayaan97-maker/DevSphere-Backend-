const Notification = require("../Models/NotificationSchema");
const Post = require("../Models/Post");
const PublishArticle = require("../Models/PublishArticleSchema");
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

module.exports = { toggleLikeService, createCommentService }