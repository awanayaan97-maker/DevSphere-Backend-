
const router = require("express").Router();
const { communityChat, articleChat } = require("../Controllers/aiController");
const authMiddleware = require("../Middlewares/auhMiddleware");
const { aiLimiter } = require("../Middlewares/rateLimiter");

router.post("/article-chat", authMiddleware, aiLimiter, articleChat);
router.post("/community-chat", authMiddleware, aiLimiter, communityChat);

module.exports = router;