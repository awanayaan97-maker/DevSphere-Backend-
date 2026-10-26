
const mongoose = require("mongoose");

const ArticleCommentsSchema = new mongoose.Schema({

    articleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PublishArticle",
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
    },

    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ArticleComments",
        default: null
    },

     likes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
        default: []
    }


}, { timestamps: true })

const ArticleComments = mongoose.model("ArticleComments", ArticleCommentsSchema);

module.exports = ArticleComments