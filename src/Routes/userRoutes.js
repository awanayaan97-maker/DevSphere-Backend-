
const express = require("express");
const { getUser, getUserWithArticles, updateUser, followUser, getConnections, getPublicUser, markNotificationsAsRead } = require("../Controllers/userController");
const optionalAuthMiddleware = require("../Middlewares/optionalAuthMiddleware");
const { userLimiter } = require("../Middlewares/rateLimiter");
const { userArticleSchema, getPublicUserSchema, userConnectionSchema, userFollowSchema } = require("../Validators/userValidation");
const upload = require("../Middlewares/multer");
const validateMiddleware = require("../Middlewares/validateMiddleware");
const authMiddleware = require("../Middlewares/auhMiddleware");
const router = express.Router();

router.get("/", authMiddleware, getUser);
router.get("/articles", authMiddleware, validateMiddleware(userArticleSchema), getUserWithArticles);
router.get("/public/:id", optionalAuthMiddleware, validateMiddleware(getPublicUserSchema), getPublicUser);
router.get("/connections/:type", authMiddleware, validateMiddleware(userConnectionSchema), getConnections);

router.put("/me", authMiddleware, userLimiter, upload.fields([{ name: "profileImage", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]), updateUser),
    router.put("/notification", authMiddleware, markNotificationsAsRead)

router.post("/follow", authMiddleware, validateMiddleware(userFollowSchema), followUser)

module.exports = router