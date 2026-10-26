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

async function draftArticle(req, res, next) {

    const { title } = req.body ?? {};
    if (!title) return next(new ApiError(400, "Title is required"));

    const userId = req.user.id
    let { articleId, ...draftArticleData } = req.body;
    draftArticleData.author = userId

    try {

        if (articleId?.trim()) {

            const checkDraftArticle = await DraftArticle.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(articleId), author: userId },
                { $set: draftArticleData },
                { new: true })

            if (checkDraftArticle) return res.status(200).json(new ApiResponse(200, "article draft successfully", checkDraftArticle))

            else throw new ApiError(500, "Article does not draft")

        }

        const data = await DraftArticle.create(draftArticleData);

        if (data) return res.status(200).json(new ApiResponse(200, "article draft successfully", data))

        else throw new ApiError(500, "something went wrong")

    }

    catch (error) {
        next(error)
    }

}



module.exports = { getDraftArticles, draftArticle }