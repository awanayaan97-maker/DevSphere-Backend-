const { promises } = require("nodemailer/lib/xoauth2");
const ArticleComments = require("../Models/ArticleCommentsSchema");
const BookMark = require("../Models/BookmarkSchema");
const Notification = require("../Models/NotificationSchema");
const PublishArticle = require("../Models/PublishArticleSchema");
const User = require("../Models/UserSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const mongoose = require("mongoose");
const { toggleLikeService, createCommentService } = require("../services/interactionService");

async function likeArticle(req, res, next) {

    try {

        const userId = req.user.id;
        const { articleId } = req.params;
        const result = await toggleLikeService(userId, articleId, "article");

        if (result.shouldEmit) {
            req.io.to(result.receiverId).emit("like_notification", result.notificationData);
        }
        return res.status(200).json(
            new ApiResponse(200, "Article like status updated", result.isLiked)
        );
    }

    catch (error) {
        next(error)
    }

}

async function commentArticle(req, res, next) {

    try {
        const { text, parentComment } = req.body;
        const { id: articleId } = req.params;
        const userId = req.user.id;

        if (!text?.trim()) {
            throw new ApiError(400, "Comment text is required");
        }
        if (!articleId?.trim()) {
            throw new ApiError(400, "Article id is required");
        }

        const result = await createCommentService(userId, articleId, text, parentComment, "article");

        if (result.shouldNotify) {
            req.io.to(result.receiverId).emit("comment_notification", result.notificationData);
        }
        req.io.to(result.targetId).emit("new_comment", result.data);

        return res.status(201).json(new ApiResponse(201, "Comment added", result.data));
    }

    catch (error) {
        next(error);
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