const DraftArticle = require("../Models/DraftArticleSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");


async function getDraftArticles(req, res, next) {

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const userId = req.user.id;

    try {

        const draftData = await DraftArticle.find({ author: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);

        if (draftData) return res.status(200).json(new ApiResponse(200, 'draft articles', draftData));

        else throw new ApiError(500, "something went wrong")
    }

    catch (error) {
        next(error)
    }
}

const mongoose = require("mongoose");

async function draftArticle(req, res, next) {

    try {
        const { title } = req.body ?? {};
        const userId = req.user?.id;
        if (!title) return next(new ApiError(400, "Title is required"));

        let { articleId, ...draftArticleData } = req.body;
        draftArticleData.author = userId;
        let query = { author: userId };

        if (articleId && typeof articleId === "string" && articleId.trim() !== "") {
            if (mongoose.Types.ObjectId.isValid(articleId)) {
                query._id = new mongoose.Types.ObjectId(articleId);
            }
        }

        const draftArticle = await DraftArticle.findOneAndUpdate(
            query,
            { $set: draftArticleData },
            {
                new: true,         
                upsert: true,      
                setDefaultsOnInsert: true
            }
        );

        return res.status(200).json(
            new ApiResponse(200, "Article drafted successfully", draftArticle)
        );

    } catch (error) {
        next(error);
    }
}

async function deleteDraftArticle(req, res, next) {

    try {

        const userId = req.user?.id;
        const { id: articleId } = req.params;
        if (!articleId?.trim()) return next(new ApiError(400, "Invalid path"));

        const findArticle = await DraftArticle.findOneAndDelete({ _id: articleId, author: userId });

        if (findArticle) {
            return res.status(200).json(new ApiResponse(200, "Article Deleted successfully",))
        }

        else {
            return next(new ApiError(404, "Article not found"));
        }
    }

    catch (error) {
        next(error)
    }

}

module.exports = { getDraftArticles, draftArticle, deleteDraftArticle }