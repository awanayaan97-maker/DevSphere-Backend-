const { promises } = require("nodemailer/lib/xoauth2");
const ArticleComments = require("../Models/ArticleCommentsSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const { toggleLikeService, createCommentService, getCommentsService, editCommentService, toggleCommentLikeService, toggleBookmarkService } = require("../services/interactionService");

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

async function editArticleComment(req, res, next) {

    try {
        const { id } = req.params;
        const { text } = req.body;

        if (!text || !text.trim()) {
            throw new ApiError(400, "Comment text is required");
        }

        const updatedComment = await editCommentService(id, text, "article");

        return res.status(200).json(
            new ApiResponse(200, updatedComment, "Comment updated successfully")
        );
    }

    catch (error) {
        next(error);
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

async function toggleArticleCommentLike(req, res, next) {

    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!id?.trim()) {
            throw new ApiError(400, "Comment id is missing");
        }

        const result = await toggleCommentLikeService(userId, id, "article");

        if (result.shouldNotify) {
            req.io.to(result.receiverId).emit("comment_like_notification", result.notificationData);
        }

        return res.status(200).json(
            new ApiResponse(200, "Comment like status updated successfully", result.isLiked)
        );
    }

    catch (error) {
        next(error);
    }
}

async function getArticleComments(req, res, next) {

    try {
        const { id } = req.params;
        const userId = req.user?.id || null;

        if (!id?.trim()) {
            throw new ApiError(400, "Article id is required");
        }

        const comments = await getCommentsService(id, userId, "article");

        const message = comments.length > 0 ? "Article comments fetched successfully" : "No comments found";

        return res.status(200).json(
            new ApiResponse(200, message, comments)
        );
    }

    catch (error) {
        next(error);
    }

}

async function toggleArticleBookmark(req, res, next) {

    try {
        const { article: articleId } = req.params;
        const userId = req.user?.id;

        if (!userId || !articleId) {
            throw new ApiError(400, "Both User ID and Article ID are required!");
        }

        const result = await toggleBookmarkService(userId, articleId, "article");

        const statusCode = result.isBookmarked ? 201 : 200;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, result.message, result.isBookmarked)
        );
    }

    catch (error) {
        next(error);
    }
}

module.exports = { likeArticle, commentArticle, editArticleComment, deleteComment, toggleArticleCommentLike, getArticleComments, toggleArticleBookmark }