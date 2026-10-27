

const ApiError = require("../utils/ApiError.js");
const ApiResponse = require("../utils/ApiResponse.js");
const mongoose = require("mongoose");
const getPagination = require("../utils/pagination.js");
const getSortOptions = require("../utils/sortingOptions,.js");
const { createPostService, getPostService, getSinglePostService, deletePostService } = require("../services/postService.js");

const ALLOWED_TYPES = ["Discussion", "Projects", "Learning"];

async function createPost(req, res, next) {

    try {

        const { postId, text, type, tags, code, codeLanguage, existingImages } = req.body;
        const authorId = req.user?.id;

        const createPost = await createPostService(authorId, postId, text, type, tags, code, codeLanguage, existingImages)

        return res
            .status(201)
            .json(new ApiResponse(201, "Post created successfully.", createPost));

    }

    catch (error) {
        next(error);
    }
};

async function getPost(req, res, next) {

    try {

        const userId = req.user?.id;
        const currentUser = userId
            ? new mongoose.Types.ObjectId(userId)
            : null;

        const type = ALLOWED_TYPES.includes(req.query.feed) ? req.query.feed : null;
        const { topic } = req.query
        const { page, limit, skip } = getPagination(req.query);
        const sortOptions = getSortOptions()
        const sortStage = sortOptions[req.query.sort] || sortOptions.latest;

        const getPosts = await getPostService(currentUser, type, topic, limit, skip, sortStage)
        res.status(200).json(new ApiResponse(200, "Community posts", getPosts));
    }

    catch (error) {
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

        const getSinglePost = await getSinglePostService(currentUser, postId)

        return res.status(200).json(
            new ApiResponse(
                200,
                "Post fetched successfully.",
                getSinglePost
            )
        );
    }

    catch (error) {
        next(error);
    }
}

async function deletePost(req, res, next) {

    try {

        const { id } = req.params;
        const authorId = req.user?.id;
        const deletePost = await deletePostService(authorId, id)

        return res.status(200).json(new ApiResponse(200, "Post deleted successfully.", deletePost));
    }

    catch (error) {
        next(error)
    }

}

module.exports = { createPost, getPost, getSinglePost, deletePost }