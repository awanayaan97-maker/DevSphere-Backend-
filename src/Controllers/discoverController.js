
const ApiResponse = require("../utils/ApiResponse");
const { default: mongoose } = require("mongoose");
const { getDiscoverDevelopersService, popularTagsService, getBookmarkedService } = 
require("../services/discoverService");


async function popularTags(req, res, next) {

    try {
        const source = req.query.source ?? "articles";
        const limit = Math.min(parseInt(req.query.limit) || 8, 20);
        const tagsData = await popularTagsService(source, limit)

        res.status(200).json(new ApiResponse(200, "Popular tags", tagsData));
    }

    catch (error) {
        next(error);
    }
}

async function getBookmarked(req, res, next) {

    try {
        const source = req.query.source ?? "articles";
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const getBookmark = await getBookmarkedService(source, userId)

        res.status(200).json(new ApiResponse(200, "Bookmarks fetched", getBookmark));
    }

    catch (error) {
        next(error);
    }
}

async function getDiscoverDevelopers(req, res, next) {

    try {

        const currentUserId = req.user?.id || null;
        const discoverDeveloperService = await getDiscoverDevelopersService(currentUserId)

        res.status(200)
            .json(new ApiResponse(200, "Developers to follow", discoverDeveloperService));

    } catch (error) {
        next(error);
    }
}

module.exports = { popularTags, getBookmarked, getDiscoverDevelopers }