
const express = require("express");
const authMiddleware = require("../Middlewares/auhMiddleware");
const { getDashboardStats, getDashboardTopArticles, getDashboardFollowersChart, getDashboardContent } = require("../Controllers/dashboardController");
const router = express.Router();

router.get('/summary', authMiddleware, getDashboardStats);
router.get('/top-articles', authMiddleware, getDashboardTopArticles);
router.get('/followers-chart', authMiddleware, getDashboardFollowersChart);
router.get('/content', authMiddleware, getDashboardContent);

module.exports = router