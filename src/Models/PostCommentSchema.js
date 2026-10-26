
const mongoose = require("mongoose");

const PostCommentSchema = new mongoose.Schema({

    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: true
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },

    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PostComment",
        default: null
    },

    likes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
        default: []
    }

}, { timestamps: true });

const PostComment = mongoose.model("PostComment", PostCommentSchema);

module.exports = PostComment;