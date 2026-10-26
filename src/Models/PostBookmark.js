
const mongoose = require("mongoose");

const postBookmarkSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: true
    }

}, { timestamps: true });


postBookmarkSchema.index({ user: 1, post: 1 }, { unique: true });

const PostBookmark = mongoose.model("PostBookmark", postBookmarkSchema);

module.exports = PostBookmark;