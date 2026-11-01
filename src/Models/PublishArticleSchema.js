
const mongoose = require("mongoose");
const { minLength, maxLength } = require("zod");

const PublishArticleSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
        minLength: 10,
        maxLength: 100
    },

    description: {
        type: String,
        default: ""
    },

    tags: {
        type: [
            {
                tagValue: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 10,
                    lowercase: true,
                },
                tagId: {
                    type: Number,
                    required: true,
                },
            },
        ],
        default: []
    },

    content: {
        type: String,
        required: true
    },

    category: {
        type: String,
        enum: [
            "Web Development",
            "Mobile Development",
            "Full Stack Development",
            "AI / Machine Learning",
            "Data Science",
            "DevOps / Cloud",
            "Cybersecurity",
            "Artificial Intelligence",
            "Databases",
            "System Design",
            "Career & Productivity",
            "Open Source",
            "Blockchain / Web3",
            "Other",
        ],
        required: true,
        default: "Other"
    },

    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    readTime: {
        type: Number,
        required: true
    },

    tableOfContent: {
        type: [
            {
                text: { type: String },
                id: { type: String },
                level: { type: String }
            }
        ],

        default: []
    },

    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],

    bookmark: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]



}, { timestamps: true })

PublishArticleSchema.index(

    { title: "text", "tag.tagValue": "text", description: "text", category: "text" },
    { weights: { title: 10, "tag.tagValue": 5, category: 2 } }
)

const PublishArticle = mongoose.model("PublishArticle", PublishArticleSchema);

module.exports = PublishArticle