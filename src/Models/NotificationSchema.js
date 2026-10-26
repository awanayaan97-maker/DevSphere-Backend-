
const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({

    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    type: {
        type: String,
        enum: ["like", "comment", "follow", "comment_like"],
        required: true
    },

    article: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PublishArticle",
        default: null
    },

    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        default: null
    },

    message: {
        type: String,
        required: true
    },

    isRead: {
        type: Boolean,
        default: false
    }

}, { timestamps: true })

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification