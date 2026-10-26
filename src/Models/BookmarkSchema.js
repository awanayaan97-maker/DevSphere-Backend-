
const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    article: {
        type: mongoose.Types.ObjectId,
        ref: "PublishArticle",
        required: true
    }

}, { timestamps: true })

bookmarkSchema.index({ user: 1, article: 1 }, { unique: true });

const BookMark = mongoose.model("BookMark", bookmarkSchema)

module.exports = BookMark