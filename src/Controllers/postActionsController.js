
const PostComment = require("../Models/PostCommentSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const { toggleLikeService, createCommentService, getCommentsService, editCommentService, toggleCommentLikeService, toggleBookmarkService } = require("../services/interactionService");

async function likePost(req, res, next) {

    try {
        const userId = req.user.id;
        const { id: postId } = req.params;
        const result = await toggleLikeService(userId, postId, "post");

        if (result.shouldEmit) {
            req.io.to(result.receiverId).emit("like_notification", result.notificationData);
        }

        return res.status(200).json(
            new ApiResponse(200, "Post like status updated", result.isLiked)
        );
    }

    catch (error) {
        next(error);
    }

}

async function commentPost(req, res, next) {

    try {
        const { text, parentComment } = req.body;
        const { id: postId } = req.params;
        const userId = req.user.id;

        if (!text?.trim()) {
            throw new ApiError(400, "Comment text is required");
        }
        if (!postId?.trim()) {
            throw new ApiError(400, "Post id is required");
        }

        const result = await createCommentService(userId, postId, text, parentComment, "post");

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

async function getPostComments(req, res, next) {

    try {
        const { id } = req.params;
        const userId = req.user?.id || null;

        if (!id?.trim()) {
            throw new ApiError(400, "Post id is required");
        }

        const comments = await getCommentsService(id, userId, "post");

        const message = comments.length > 0 ? "Post comments fetched successfully" : "No comments found";

        return res.status(200).json(
            new ApiResponse(200, message, comments)
        );
    }

    catch (error) {
        next(error);
    }
}

async function editPostComment(req, res, next) {

    try {
        const { id } = req.params;
        const { text } = req.body;

        if (!text || !text.trim()) {
            throw new ApiError(400, "Comment text is required");
        }

        const updatedComment = await editCommentService(id, text, "post");

        return res.status(200).json(
            new ApiResponse(200, updatedComment, "Comment updated successfully")
        );
    }

    catch (error) {
        next(error);
    }
}

async function togglePostCommentLike(req, res, next) {

    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!id?.trim()) {
            throw new ApiError(400, "Comment id is missing");
        }

        const result = await toggleCommentLikeService(userId, id, "post");

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

async function deleteComment(req, res, next) {

    try {

        const { id } = req.params;

        const comment = await PostComment.findById(id);

        if (!comment) {
            return res.status(404).json(new ApiResponse(404, "Comment not found!"));
        }

        await Promise.all([
            PostComment.findByIdAndDelete(id),
            PostComment.deleteMany({ parentComment: id })
        ]);

        return res.status(200).json(new ApiResponse(200, "Comment deleted successfully!"));

    } catch (error) {
        next(error)
    }
}

async function togglePostBookmark(req, res, next) {

    try {
        const { id: postId } = req.params;
        const userId = req.user?.id;

        if (!userId || !postId) {
            throw new ApiError(400, "Both User ID and Post ID are required!");
        }

        const result = await toggleBookmarkService(userId, postId, "post");

        const statusCode = result.isBookmarked ? 201 : 200;
        return res.status(statusCode).json(
            new ApiResponse(statusCode, result.message, result.isBookmarked,)
        );
    }

    catch (error) {
        next(error);
    }
}

module.exports = { likePost, commentPost, getPostComments, editPostComment, togglePostCommentLike, deleteComment, togglePostBookmark }