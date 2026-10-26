const { promises } = require("nodemailer/lib/xoauth2");
const ArticleComments = require("../Models/ArticleCommentsSchema");
const BookMark = require("../Models/BookmarkSchema");
const Notification = require("../Models/NotificationSchema");
const PublishArticle = require("../Models/PublishArticleSchema");
const User = require("../Models/UserSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const mongoose = require("mongoose")

async function likeArticle(req, res, next) {

    const userId = req.user.id;
    const { articleId } = req.params;

    try {

        const findArticleLikes = await PublishArticle.findOne({ _id: articleId })

        if (!findArticleLikes) {
            throw new ApiError(404, "Article not found");
        }

        const checkArticleLikes = findArticleLikes.likes.some(item => item.toString() === userId.toString());

        if (checkArticleLikes) {

            await Promise.all([
                await PublishArticle.updateOne({ _id: articleId }, { $pull: { likes: userId } }),
                await Notification.deleteOne({ sender: userId, article: articleId, type: "like" })
            ])

            res.status(200).json(new ApiResponse(200, "update", checkArticleLikes))
            return
        }

        if (!checkArticleLikes) {

            const [updateResult, checkNotification, senderData] = await Promise.all([
                PublishArticle.findOneAndUpdate({ _id: articleId }, { $addToSet: { likes: userId } }, { new: true }),
                Notification.findOne({ sender: userId, receiver: findArticleLikes.author, article: articleId, type: "like" }),
                User.findOne({ _id: userId }).select("firstName lastName profileImage role _id")
            ]);

            const likesCount = updateResult.likes.length;

            if (checkNotification === null && updateResult.author !== userId) {

                const newNotification = await Notification.create({
                    sender: userId,
                    receiver: updateResult.author,
                    type: "like",
                    article: articleId,
                    message: `${senderData.firstName} ${senderData.lastName} liked your article`
                });

                const notificationData = {
                    ...newNotification._doc,
                    senderData: senderData,
                    likesCount: likesCount,
                    articleId: articleId
                };

                req.io.to(findArticleLikes?.author.toString()).emit("like_notification", notificationData);
            }

            res.status(200).json(new ApiResponse(200, "Liked successfully", { likesCount, updateResult }));
            return;
        }

        else throw new ApiError(500, "Something went wrong")

    }
    catch (error) {
        next(error)
    }

}

async function commentArticle(req, res, next) {

    const { text, parentComment } = req.body;
    const { id: articleId } = req.params
    const userId = req.user.id;

    if (!text?.trim()) return next(new ApiError(400, "Comment text is required"));
    if (!articleId?.trim()) return next(new ApiError(400, "Article id is required"));

    try {

        const newComment = await ArticleComments.create({
            articleId,
            user: userId,
            text,
            parentComment: parentComment || null
        });

        if (newComment) {

            const [getArticleOwner, senderData] = await Promise.all([
                PublishArticle.findOne({ _id: newComment?.articleId }).select("author"),
                User.findOne({ _id: userId }).select("firstName lastName profileImage role _id")
            ])

            let receiverId = null;
            let notificationMessage = "";
            let type = "";

            const data = {
                ...newComment._doc,
                authorData: senderData
            }

            if (!parentComment) {

                receiverId = getArticleOwner?.author
                notificationMessage = `${senderData.firstName} ${senderData.lastName} commented on your article`;
                type = "comment"

            } else {

                const parentCommentDoc = await ArticleComments.findById(parentComment).select("user");
                console.log(parentCommentDoc);
                receiverId = parentCommentDoc?.user;
                notificationMessage = `${senderData.firstName} ${senderData.lastName} replied to your comment`;
                type = "comment_like"

            }

            if (receiverId && receiverId.toString() !== userId.toString()) {

                const newNotification = await Notification.create({
                    sender: userId,
                    receiver: receiverId,
                    article: newComment.articleId,
                    type: type,
                    message: notificationMessage
                })

                const notificationData = {
                    ...newNotification._doc,
                    senderData: senderData,
                    data: data
                }

                req.io.to(receiverId.toString()).emit("comment_notification", notificationData)
                req.io.to(newComment.articleId.toString()).emit("new_comment", data);
            }

            res.status(201).json(new ApiResponse(201, "Comment added", data));
            return
        }

        else throw new ApiError(500, "something went wrong")

    }

    catch (error) {
        next(error)
    }

}

async function editComment(req, res, next) {
    try {
        const { id } = req.params;
        const { text } = req.body;

        if (!text || !text.trim()) {
            return next(new ApiError(400, "Comment text is required"));
        }

        const updatedComment = await ArticleComments.findByIdAndUpdate(
            id,
            { text: text.trim() },
            { new: true }
        );

        if (!updatedComment) {
            return next(new ApiError(404, "Comment not found"));
        }

        return res.status(200).json(
            new ApiResponse(200, updatedComment, "Comment updated successfully")
        );

    } catch (error) {
        return next(new ApiError(500, error.message || "Internal Server Error"));
    }
}

async function deleteComment(req, res, next) {


    try {
        const { id } = req.params;

        const comment = await ArticleComments.findById(id);

        if (!comment) {
            return res.status(404).json(new ApiResponse(404, "Comment not found!"));
        }

        await ArticleComments.findByIdAndDelete(id);

        return res.status(200).json(new ApiResponse(200, "Comment deleted successfully!"));

    } catch (error) {
        next(error)
    }
}

async function likeArticleComments(req, res, next) {

    const userId = req.user?.id
    const { id } = req.params;

    if (!id?.trim()) return next(new ApiError(400, "something is missing"))

    try {

        const findArticleComment = await ArticleComments.findOne({ _id: id });

        const checkArticleLikes = findArticleComment.likes.some(item => item.toString() === userId.toString());

        if (checkArticleLikes) {

            await Promise.all([
                await ArticleComments.updateOne({ _id: id }, { $pull: { likes: userId } }),
                await Notification.deleteOne({ sender: userId, receiver: findArticleComment.user, type: "comment_like" })
            ])

            res.status(200).json(new ApiResponse(200, "update", checkArticleLikes))
            return
        }

        if (!checkArticleLikes) {

            const [updateLike, checkNotification, senderData,] = await Promise.all([

                ArticleComments.updateOne({ _id: id }, { $addToSet: { likes: userId } }),

                Notification.findOne({ sender: userId, receiver: findArticleComment, type: "comment_like" }),

                User.findOne({ _id: userId }).select("firstName lastName profileImage role _id"),

            ]);

            if (checkNotification === null && findArticleComment.user.toString() !== userId.toString()) {

                const newNotification = await Notification.create({
                    sender: userId,
                    receiver: findArticleComment.user,
                    type: "comment_like",
                    article: findArticleComment.articleId,
                    message: `${req.user.firstName} ${req.user.lastName} liked your comment`
                })

                const notificationData = {
                    ...newNotification._doc,
                    senderData: senderData
                }

                req.io.to(findArticleComment.user.toString()).emit("comment_like_notification", notificationData)
            }

            res.status(200).json(new ApiResponse(200, "update", checkArticleLikes))
            return
        }

        else throw new ApiError(500, "Something went wrong")

    }

    catch (error) {
        next(error)
    }

}

async function getArticleComments(req, res, next) {
    const { id } = req.params;
    const userId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : null;

    try {
        const articleId = new mongoose.Types.ObjectId(id);

        const comments = await ArticleComments.aggregate([
            {
                $match: {
                    articleId: articleId,
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
                    from: "articlecomments",
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
                    hasLikeComment: userId ? { $in: [userId, "$likes"] } : false,
                    commentLikes: { $size: "$likes" },
                    replies: {
                        $map: {
                            input: "$replies",
                            as: "reply",
                            in: {
                                $mergeObjects: [
                                    "$$reply",
                                    {
                                        hasLikeReplies: userId ? { $in: [userId, "$$reply.likes"] } : false
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
                    articleId: 1,
                    text: 1,
                    hasLikeComment: 1,
                    commentLikes: 1,
                    likes: 1,
                    replies: 1,
                    createdAt: 1
                }
            }
        ]);


        if (comments.length > 0) {
            return res.status(200).json(new ApiResponse(200, "Article comments fetched successfully", comments));
        }

        return res.status(200).json(new ApiResponse(200, "No comments found", []));

    } catch (error) {
        next(error);
    }
}

async function articleBookmark(req, res, next) {

    const { article } = req.params;
    const userId = req.user?.id;

    try {

        if (!userId || !article) return next(new ApiError(400, "Both User ID and Article ID are required!"));

        const isBookmarkExists = await BookMark.findOne({ user: userId, article: article });

        if (isBookmarkExists) {

            await Promise.all([
                BookMark.deleteOne({ user: userId, article: article }),
                PublishArticle.updateOne({ _id: article }, { $pull: { bookmark: userId } })
            ])

            return res.status(200).json(new ApiResponse(200, "Bookmark deleted successfully!"));
        }

        else {

            await Promise.all([
                BookMark.create({ user: userId, article: article }),
                PublishArticle.updateOne({ _id: article }, { $addToSet: { bookmark: userId } })
            ])

            return res.status(201).json(new ApiResponse(201, "Bookmark saved successfully!"));
        }


    } catch (error) {
        next(error)
    }
};

module.exports = { likeArticle, commentArticle, editComment, deleteComment, likeArticleComments, getArticleComments, articleBookmark }