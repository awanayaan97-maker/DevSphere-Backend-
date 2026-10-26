
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
    {

        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        text: {
            type: String,
            trim: true,
            maxlength: 10000,
            default: "",
        },

        type: {
            type: String,
            enum: [
                "Discussion",
                "Projects",
                "Learning",
            ],
            default: "Discussion",
            required: true,
        },

        tags: {
            type: [
                {
                    tagValue: {
                        type: String,
                        required: true,
                        trim: true,
                        maxlength: 30,
                        lowercase: true,
                    },
                    tagId: {
                        type: Number,
                        required: true,
                    },
                },
            ],
            default: [],
        },

        code: {
            type: String,
            default: "",
            maxlength: 20000,
        },

        codeLanguage: {
            type: String,
            enum: [
                "",
                "javascript",
                "jsx",
                "typescript",
                "python",
                "html",
                "css",
                "json",
                "sql",
                "java",
                "cpp",
            ],
            default: "",
        },

        images: {
            type: [
                {
                    url: {
                        type: String,
                        required: true,
                    },
                    publicId: {
                        type: String,
                        default: "",
                    },
                    filename: {
                        type: String,
                        default: "",
                    },
                },
            ],
            default: [],
            validate: {
                validator: (images) => images.length <= 5,
                message: "A post can have a maximum of 5 images.",
            },
        },

        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],

        bookmark: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]

    },

    {
        timestamps: true,
    }
);

postSchema.pre("validate", function () {
    const hasText = Boolean(this.text?.trim());
    const hasCode = Boolean(this.code?.trim());
    const hasImages = this.images?.length > 0;

    if (!hasText && !hasCode && !hasImages) {
        this.invalidate(
            "text",
            "A post must contain text, code, or at least one image."
        );
    }
});

const Post = mongoose.model("Post", postSchema)

module.exports = Post;

