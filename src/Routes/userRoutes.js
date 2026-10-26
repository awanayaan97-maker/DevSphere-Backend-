
const express = require("express");
const authMiddleware = require("../Middlewares/auhMiddleware");
const { getUser, getUserWithArticles,  updateUser, followUser, getConnections, getPublicUser, markNotificationsAsRead, discoverDevelopersController } = require("../Controllers/userController");
const upload = require("../Middlewares/multer");
const optionalAuthMiddleware = require("../Middlewares/optionalAuthMiddleware");
const { userLimiter } = require("../Middlewares/rateLimiter");
const router = express.Router();

router.get("/", authMiddleware, getUser);
router.get("/articles", authMiddleware, getUserWithArticles);
router.get("/public/:id", optionalAuthMiddleware, getPublicUser);
router.get("/connections/:type", authMiddleware, getConnections);
router.get("/discover-developers", optionalAuthMiddleware, discoverDevelopersController);

router.put("/me", authMiddleware, userLimiter, upload.fields([{ name: "profileImage", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]), updateUser),
router.put("/notification", authMiddleware, markNotificationsAsRead)

router.post("/follow", authMiddleware, followUser)

module.exports = router