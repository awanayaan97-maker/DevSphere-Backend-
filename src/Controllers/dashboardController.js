const DraftArticle = require("../Models/DraftArticleSchema");
const Follow = require("../Models/FollowSchema");
const Post = require("../Models/Post");
const PublishArticle = require("../Models/PublishArticleSchema");
const { getDashboardStatsService, getDashboardTopArticlesService, getDashboardFollowersChartService, getDashboardContentService } = require("../services/dashboardService");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const mongoose = require("mongoose");


async function getDashboardStats(req, res, next) {

    try {

        const userId = req.user?.id;
        const statsService = await getDashboardStatsService(userId)

        return res.status(200)
            .json(new ApiResponse(200, "Dashboard stats fetched successfully", statsService))

    }

    catch (error) {
        next(error)
    }
}

async function getDashboardTopArticles(req, res, next) {

    try {

        const userId = req.user?.id;
        const topArticle = await getDashboardTopArticlesService(userId)

        return res.status(200).json(new ApiResponse(200, "Top Articles Fetched!", topArticle))
    }

    catch (error) {
        next(error)
    }

}

async function getDashboardFollowersChart(req, res, next) {

    try {
        const userId = req.user?.id;
        const chartService = await getDashboardFollowersChartService(userId)

        return res.status(200).json(
            new ApiResponse(200, "Followers chart data fetched successfully", chartService)
        );

    } catch (error) {
        next(error);
    }
}

async function getDashboardContent(req, res, next) {

    try {

        const userId = new mongoose.Types.ObjectId(req.user?.id);
        const type = req.query?.type?.trim() ?? "publish";

        const contentService = await getDashboardContentService(type, userId)
        return res.status(200).json(new ApiResponse(200, "content data fetched!", contentService))
    }

    catch (error) {
        next(error)
    }

}

module.exports = { getDashboardStats, getDashboardTopArticles, getDashboardFollowersChart, getDashboardContent }