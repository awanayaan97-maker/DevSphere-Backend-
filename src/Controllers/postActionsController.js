const Notification = require("../Models/NotificationSchema");
const Post = require("../Models/Post");
const PostBookmark = require("../Models/PostBookmark");
const PostComment = require("../Models/PostCommentSchema");
const User = require("../Models/UserSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const mongoose = require("mongoose")

async function likePost(req, res, next) {

    const userId = req.user.id;
    const { id: postId } = req.params;

    try {

        const findPost = await Post.findOne({ _id: postId })

        if (!findPost) {
            throw new ApiError(404, "post not found");
        }

        const checkPostLikes = findPost.likes.some(item => item.toString() === userId.toString());

        if (checkPostLikes) {

            await Promise.all([
                await Post.updateOne({ _id: postId }, { $pull: { likes: userId } }),
                await Notification.deleteOne({ sender: userId, article: postId, type: "like" })
            ])

            res.status(200).json(new ApiResponse(200, "update", checkPostLikes))
            return
        }

        if (!checkPostLikes) {

            const [updateResult, checkNotification, senderData] = await Promise.all([
                Post.findOneAndUpdate({ _id: postId }, { $addToSet: { likes: userId } }, { new: true }),
                Notification.findOne({ sender: userId, receiver: findPostLikes.author, article: postId, type: "like" }),
                User.findOne({ _id: userId }).select("firstName lastName profileImage role _id")
            ]);

            const likesCount = updateResult.likes.length;

            if (checkNotification === null && updateResult.author.toString() !== userId.toString()) {

                const newNotification = await Notification.create({
                    sender: userId,
                    receiver: updateResult.author,
                    type: "like",
                    article: null,
                    post: postId,
                    message: `${senderData.firstName} ${senderData.lastName} liked your post`
                });

                const notificationData = {
                    ...newNotification._doc,
                    senderData: senderData,
                    likesCount: likesCount,
                    articleId: null,
                    post: postId
                };

                req.io.to(findPostLikes?.author.toString()).emit("like_notification", notificationData);
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

async function commentPost(req, res, next) {

    const { text, parentComment } = req.body;
    const { id: postId } = req.params

    const userId = req.user.id;

    if (!text?.trim()) return next(new ApiError(400, "Comment text is required"));
    if (!postId?.trim()) return next(new ApiError(400, "post id is required"));

    try {

        const newComment = await PostComment.create({
            postId,
            user: userId,
            text,
            parentComment: parentComment || null
        });

        if (newComment) {

            const [getPostOwner, senderData] = await Promise.all([
                Post.findOne({ _id: newComment?.postId }).select("author"),
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

                receiverId = getPostOwner?.author
                notificationMessage = `${senderData.firstName} ${senderData.lastName} commented on your post`;
                type = "comment"

            } else {

                const parentCommentDoc = await PostComment.findById(parentComment).select("user");
                receiverId = parentCommentDoc?.user;
                notificationMessage = `${senderData.firstName} ${senderData.lastName} replied to your comment`;
                type = "comment_like"
            }

            if (receiverId && receiverId.toString() !== userId.toString()) {

                const newNotification = await Notification.create({
                    sender: userId,
                    receiver: receiverId,
                    article: null,
                    post: newComment.postId,
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

async function getPostComments(req, res, next) {

    const { id } = req.params;
    const userId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : null;

    try {
        const postId = new mongoose.Types.ObjectId(id);

        const comments = await PostComment.aggregate([
            {
                $match: {
                    postId: postId,
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
                    from: "postcomments",
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
                    postId: 1,
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
            return res.status(200).json(new ApiResponse(200, "Post comments fetched successfully", comments));
        }

        return res.status(200).json(new ApiResponse(200, "No comments found", []));

    } catch (error) {
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

        const updatedComment = await PostComment.findByIdAndUpdate(
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

async function likePostComments(req, res, next) {

    const userId = req.user?.id
    const { id } = req.params;

    if (!id?.trim()) return next(new ApiError(400, "something is missing"))

    try {

        const findPostComment = await PostComment.findOne({ _id: id });

        const checkPostLikes = findPostComment.likes.some(item => item.toString() === userId.toString());

        if (checkPostLikes) {

            await Promise.all([
                await PostComment.updateOne({ _id: id }, { $pull: { likes: userId } }),
                await Notification.deleteOne({ sender: userId, receiver: findPostComment.user, type: "comment_like" })
            ])

            res.status(200).json(new ApiResponse(200, "update", checkPostLikes))
            return
        }

        if (!checkPostLikes) {

            const [updateLike, checkNotification, senderData,] = await Promise.all([

                PostComment.updateOne({ _id: id }, { $addToSet: { likes: userId } }),

                Notification.findOne({ sender: userId, receiver: findPostComment, type: "comment_like" }),

                User.findOne({ _id: userId }).select("firstName lastName profileImage role _id"),

            ]);

            if (checkNotification === null && findPostComment.user.toString() !== userId.toString()) {

                const newNotification = await Notification.create({
                    sender: userId,
                    receiver: findPostComment.user,
                    type: "comment_like",
                    article: null,
                    post: findPostComment.postId,
                    message: `${req.user.firstName} ${req.user.lastName} liked your comment`
                })

                const notificationData = {
                    ...newNotification._doc,
                    senderData: senderData
                }

                req.io.to(findPostComment.user.toString()).emit("comment_like_notification", notificationData)
            }

            res.status(200).json(new ApiResponse(200, "update", checkPostLikes))
            return
        }

        else throw new ApiError(500, "Something went wrong")

    }

    catch (error) {
        next(error)
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

async function postBookmark(req, res, next) {

    const { id } = req.params;
    const userId = req.user.id;

    try {

        if (!userId || !id) return next(new ApiError(400, "Both User ID and post ID are required!"));

        const existing = await PostBookmark.findOne({ user: userId, post: id });

        if (existing) {
            await Promise.all([
                existing.deleteOne(),
                Post.updateOne({ _id: id }, { $pull: { bookmark: userId } })
            ]);
            return res.status(200).json(new ApiResponse(200, "Bookmark deleted successfully!"));
        }

        await Promise.all([
            PostBookmark.create({ user: userId, post: id }),
            Post.updateOne({ _id: id }, { $addToSet: { bookmark: userId } })
        ]);

        return res.status(201).json(new ApiResponse(201, "Bookmark saved successfully!"));

    } catch (error) {
        next(error)
    }
};

module.exports = { likePost, commentPost, getPostComments, editComment, likePostComments, deleteComment, postBookmark }