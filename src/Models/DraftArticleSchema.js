
const mongoose = require("mongoose");

const DraftArticleSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true
    },

    description: {
        type: String,
        default: ""
    },

    content: {
        type: String,
        default: ""
    },

    tags: {
        type: Array,
        default: []
    },

    category: {
        type: String,
        default: ""
    },

    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },


}, { timestamps: true })

const DraftArticle = mongoose.model("DraftArticle", DraftArticleSchema);

module.exports = DraftArticle