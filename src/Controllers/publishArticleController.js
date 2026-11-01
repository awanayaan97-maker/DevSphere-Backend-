
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const cloudinary = require("../Config/cloudinary");
const { getArticlesFeedService, searchArticlesService, getArticleByIdService, getArticleForEditService, publishOrUpdateArticleService, deleteArticleService, exploreArticlesService } = require("../services/articleService");


async function getArticlesFeed(req, res, next) {

    try {

        const userId = req.user?.id;
        const articles = await getArticlesFeedService(userId, req.validated.query);

        return res.status(200).json(
            new ApiResponse(200, "Articles feed fetched successfully", articles)
        );
    }

    catch (error) {
        next(error);
    }
}

async function searchArticles(req, res, next) {

    try {

        const userId = req.user?.id;
        const articles = await searchArticlesService(userId, req.validated.query);
        const message = articles.length > 0
            ? "Articles fetched successfully"
            : "No articles found matching your search";

        return res.status(200).json(
            new ApiResponse(200, message, articles)
        );

    }

    catch (error) {
        next(error);
    }
}

async function getArticleById(req, res, next) {

    try {
        const { id } = req.validated.params;
        const loggedInUserId = req.user?.id;

        const article = await getArticleByIdService(id, loggedInUserId);

        return res.status(200).json(
            new ApiResponse(200, "Article fetched successfully", article)
        );
    }

    catch (error) {
        next(error);
    }
}

async function getArticleForEdit(req, res, next) {

    try {
        const userId = req.user.id;
        const { id } = req.params;
        const result = await getArticleForEditService(userId, id);

        return res.status(200).json(
            new ApiResponse(200, "Article fetched successfully for editing", result.article)
        );

    }

    catch (error) {
        next(error);
    }
}

async function publishArticle(req, res, next) {

    try {
        const userId = req.user.id;
        const bodyData = req.validated.body;
        const articleId = req.validated?.params?.articleId;
        const result = await publishOrUpdateArticleService(userId, bodyData, articleId);
        let statusCode = 200;
        let message = "Article updated successfully";

        if (result.status === "created") {
            statusCode = 201;
            message = "Article published successfully";
        }

        else if (result.status === "published_from_draft") {
            statusCode = 201;
            message = "Draft successfully published";
        }

        return res.status(statusCode).json(
            new ApiResponse(statusCode, message, result.article)
        );

    }

    catch (error) {
        next(error);
    }
}

async function articleImageUpload(req, res, next) {

    const imagePath = req.file?.path;

    if (!imagePath) return res.status(400).json(new ApiResponse(400, "Image file is required"));

    try {

        const cloudinaryResult = await cloudinary.uploader.upload(imagePath);

        const cloudinaryUrl = cloudinaryResult.secure_url

        if (cloudinaryUrl) return res.status(200).json(new ApiResponse(200, "file uploaded sucessfully", cloudinaryUrl))

        else throw new ApiError(500, "Something went wrong")

    }

    catch (error) {
        next(error)
    }

}

async function deleteArticle(req, res, next) {

    try {
        const userId = req.user.id;
        const { articleId } = req.validated.params;

        await deleteArticleService(userId, articleId);

        return res.status(200).json(
            new ApiResponse(200, "Article deleted successfully")
        );

    }

    catch (error) {
        next(error);
    }
}

async function exploreArticles(req, res, next) {

    try {
        const userId = req.user?.id;
        const queryParams = {
            ...req.validated.query,
            userId
        };

        const exploreArticles = await exploreArticlesService(queryParams);

        return res.status(200).json(
            new ApiResponse(200, "Explore articles fetched successfully", exploreArticles)
        );

    } 
    
    catch (error) {
        next(error);
    }
}

module.exports = { getArticlesFeed, searchArticles, publishArticle, getArticleById, getArticleForEdit, articleImageUpload, deleteArticle, exploreArticles }