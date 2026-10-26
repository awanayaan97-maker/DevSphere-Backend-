
const Post = require("../Models/Post.js")
const cloudinary = require("../Config/cloudinary.js");
const ApiError = require("../utils/ApiError.js");
const ApiResponse = require("../utils/ApiResponse.js");
const mongoose = require("mongoose");
const getPagination = require("../utils/pagination.js");
const getSortOptions = require("../utils/sortingOptions,.js");
const User = require("../Models/UserSchema.js");

const ALLOWED_TYPES = ["Discussion", "Projects", "Learning"];

async function createPost(req, res, next) {

    try {
        const { postId, text, type, tags, code, codeLanguage, existingImages } = req.body;

        const authorId = req.user?.id;

        if (!authorId) {
            throw new ApiError(401, "Unauthorized: Author ID is missing.");
        }

        let parsedTags = [];
        if (tags) {
            try {
                parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
            } catch (err) {
                parsedTags = [];
            }
        }

        console.log(existingImages, "exits images");

        if (postId) {
            const post = await Post.findOne({
                _id: postId,
                author: authorId,
            });

            if (!post) {
                throw new ApiError(404, "Post not found or unauthorized.");
            }

            let parsedExistingImages = [];

            try {
                parsedExistingImages = JSON.parse(existingImages || "[]");
            } catch {
                throw new ApiError(400, "Invalid existing images data.");
            }

            if (!Array.isArray(parsedExistingImages)) {
                throw new ApiError(400, "Existing images must be an array.");
            }

            const oldImages = post.images || [];
            const oldImageIds = new Set(
                oldImages.map((image) => image._id.toString())
            );

            const requestedImageIds = parsedExistingImages.map(
                (image) => image._id
            );

            if (
                requestedImageIds.some(
                    (id) => typeof id !== "string" || !oldImageIds.has(id)
                ) ||
                new Set(requestedImageIds).size !== requestedImageIds.length
            ) {
                throw new ApiError(400, "Invalid existing image.");
            }

            const imagesToKeep = oldImages.filter((image) =>
                requestedImageIds.includes(image._id.toString())
            );

            const newImages = [];

            for (const file of req.files || []) {
                const uploaded = await cloudinary.uploader.upload(file.path, {
                    resource_type: "image",
                });

                newImages.push({
                    url: uploaded.secure_url,
                    publicId: uploaded.public_id,
                    filename: file.originalname,
                });
            }

            const finalImages = [...imagesToKeep, ...newImages];

            if (finalImages.length > 5) {
                throw new ApiError(400, "Maximum 5 images allowed.");
            }

            const finalText = (text || "").trim();
            const finalCode = (code || "").trim();

            if (!finalText && !finalCode && finalImages.length === 0) {
                throw new ApiError(
                    400,
                    "Post must contain text, code, or an image."
                );
            }

            post.text = finalText;
            post.type = type || "Discussion";
            post.tags = parsedTags;
            post.code = code || "";
            post.codeLanguage = code ? codeLanguage || "javascript" : "";
            post.images = finalImages;

            await post.save();

            const retainedPublicIds = new Set(
                imagesToKeep.map((image) => image.publicId)
            );

            const removedImages = oldImages.filter(
                (image) => !retainedPublicIds.has(image.publicId)
            );

            await Promise.allSettled(
                removedImages
                    .filter((image) => image.publicId)
                    .map((image) =>
                        cloudinary.uploader.destroy(image.publicId)
                    )
            );

            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        "Post updated successfully.",
                        post,
                    )
                );
        }

        const uploadedImages = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const cloudinaryResult = await cloudinary.uploader.upload(file.path);

                uploadedImages.push({
                    url: cloudinaryResult.secure_url,
                    publicId: cloudinaryResult.public_id,
                    filename: file.originalname,
                });
            }
        }

        const createPost = await Post.create({
            author: authorId,
            text: text || "",
            type: type || "Discussion",
            tags: parsedTags,
            code: code || "",
            codeLanguage: codeLanguage || "",
            images: uploadedImages,
        });

        const postAuthor = await User.findById(createPost.author)
            .select("firstName lastName role profileImage")

        const newPost = {
            authorDetails: postAuthor,
            ...createPost._doc
        }

        return res
            .status(201)
            .json(new ApiResponse(201, "Post created successfully.", newPost));

    } catch (error) {
        next(error);
    }
};

async function getPost(req, res, next) {

    const userId = req.user?.id;

    const currentUser = userId
        ? new mongoose.Types.ObjectId(userId)
        : null;

    const type = ALLOWED_TYPES.includes(req.query.feed) ? req.query.feed : null;
    const { topic } = req.query
    const { page, limit, skip } = getPagination(req.query);
    const sortOptions = getSortOptions()

    const sortStage = sortOptions[req.query.sort] || sortOptions.latest;

    const transformationStages = [

        {
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "_id",
                as: "authorDetails"
            }
        },

        {
            $lookup: {
                from: "postcomments",
                let: { postId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$postId", "$$postId"] },
                                    { $eq: ["$parentComment", null] }
                                ]
                            }
                        }
                    },
                    { $project: { _id: 1 } }
                ],
                as: "commentsData"
            }
        },

        {
            $lookup: {
                from: "follows",
                let: { authorId: "$author" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$followedUser", "$$authorId"] },
                                    { $eq: ["$follower", currentUser] }
                                ]
                            }
                        }
                    },
                    { $project: { _id: 1 } }
                ],
                as: "followData"
            }
        },

        { $unwind: "$authorDetails" },

        {
            $addFields: {
                likesCount: { $size: { $ifNull: ["$likes", []] } },
                isLiked: { $in: [currentUser, { $ifNull: ["$likes", []] }] },
                commentsCount: { $size: "$commentsData" },
                savesCount: { $size: "$bookmark" },
                isBookmark: { $in: [currentUser, { $ifNull: ["$bookmark", []] }] },
                isFollowingAuthor: { $gt: [{ $size: "$followData" }, 0] }
            }
        }
    ];

    const paginationStages = [

        { $sort: sortStage },

        { $skip: skip },

        { $limit: limit },

        {
            $project: {
                "authorDetails._id": 1,
                "authorDetails.firstName": 1,
                "authorDetails.lastName": 1,
                "authorDetails.profileImage": 1,
                "authorDetails.role": 1,
                type: 1,
                text: 1,
                tags: 1,
                code: 1,
                codeLanguage: 1,
                images: 1,
                likesCount: 1,
                isLiked: 1,
                commentsCount: 1,
                sharesCount: 1,
                savesCount: 1,
                isBookmark: 1,
                isFollowingAuthor: 1,
                createdAt: 1
            }
        }
    ];

    let pipeline = [];
    let matchConditions = {};

    if (type) {
        matchConditions.type = type
    }

    if (topic) {
        matchConditions["tags.tagValue"] = topic.trim().toLowerCase();
    }

    if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
    }

    pipeline.push(...transformationStages);
    pipeline.push(...paginationStages);

    try {

        const posts = await Post.aggregate(pipeline);

        res.status(200).json(new ApiResponse(200, "Community posts", posts));

    } catch (error) {
        next(error);
    }
}

async function getSinglePost(req, res, next) {
    try {
        const userId = req.user?.id;

        const currentUser = userId
            ? new mongoose.Types.ObjectId(userId)
            : null;

        const postId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            throw new ApiError(400, "Invalid post ID.");
        }

        const pipeline = [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(postId),
                },
            },

            {
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "_id",
                    as: "authorDetails",
                },
            },

            {
                $lookup: {
                    from: "postcomments",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$postId", "$$postId"] },
                                        { $eq: ["$parentComment", null] },
                                    ],
                                },
                            },
                        },
                        { $project: { _id: 1 } },
                    ],
                    as: "commentsData",
                },
            },

            {
                $lookup: {
                    from: "postbookmarks",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$post", "$$postId"],
                                },
                            },
                        },
                        { $project: { user: 1 } },
                    ],
                    as: "bookmarksData",
                },
            },

            {
                $lookup: {
                    from: "follows",
                    let: { authorId: "$author" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: [
                                                "$followedUser",
                                                "$$authorId",
                                            ],
                                        },
                                        {
                                            $eq: [
                                                "$follower",
                                                currentUser,
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                        { $project: { _id: 1 } },
                    ],
                    as: "followData",
                },
            },

            { $unwind: "$authorDetails" },

            {
                $addFields: {
                    likesCount: {
                        $size: { $ifNull: ["$likes", []] },
                    },

                    isLiked: {
                        $in: [
                            currentUser,
                            { $ifNull: ["$likes", []] },
                        ],
                    },

                    commentsCount: {
                        $size: "$commentsData",
                    },

                    savesCount: {
                        $size: "$bookmarksData",
                    },

                    isBookmark: {
                        $in: [
                            currentUser,
                            {
                                $map: {
                                    input: "$bookmarksData",
                                    as: "b",
                                    in: "$$b.user",
                                },
                            },
                        ],
                    },

                    isFollowingAuthor: {
                        $gt: [
                            { $size: "$followData" },
                            0,
                        ],
                    },
                },
            },

            {
                $project: {
                    _id: 1,
                    authorDetails: {
                        _id: 1,
                        firstName: 1,
                        lastName: 1,
                        profileImage: 1,
                        role: 1,
                    },
                    type: 1,
                    text: 1,
                    tags: 1,
                    code: 1,
                    codeLanguage: 1,
                    images: 1,
                    likesCount: 1,
                    isLiked: 1,
                    commentsCount: 1,
                    sharesCount: 1,
                    savesCount: 1,
                    isBookmark: 1,
                    isFollowingAuthor: 1,
                    createdAt: 1,
                },
            },
        ];

        const posts = await Post.aggregate(pipeline);

        if (!posts.length) {
            throw new ApiError(404, "Post not found.");
        }

        console.log(posts[0]);


        return res.status(200).json(
            new ApiResponse(
                200,
                "Post fetched successfully.",
                posts[0]
            )
        );
    } catch (error) {
        next(error);
    }
}

async function deletePost(req, res, next) {

    const { id } = req.params;
    const authorId = req.user?.id;

    try {

        const post = await Post.findOne({
            _id: id,
            author: authorId,
        });

        if (!post) {
            throw new ApiError(404, "Post not found or unauthorized.");
        }

        const images = post.images || [];
        if (images.length > 0) {
            await Promise.allSettled(
                images
                    .filter((image) => image.publicId)
                    .map((image) =>
                        cloudinary.uploader.destroy(image.publicId)
                    )
            );
        }

        await post.deleteOne();

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    null,
                    "Post deleted successfully."
                )
            );
    }

    catch (error) {
        next(error)
    }

}

module.exports = { createPost, getPost, getSinglePost, deletePost }