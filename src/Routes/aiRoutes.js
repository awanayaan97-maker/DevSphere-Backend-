
const router = require("express").Router();
const { communityChat } = require("../Controllers/aiController");
const authMiddleware = require("../Middlewares/auhMiddleware");
const { aiLimiter } = require("../Middlewares/rateLimiter");
const { articleChat } = require("../controllers/aiController");

router.post("/article-chat", authMiddleware, aiLimiter, articleChat);
router.post("/community-chat", authMiddleware, aiLimiter, communityChat);

module.exports = router;