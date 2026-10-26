
const express = require("express");
const { popularTags, getBookmarked, getDiscoverDevelopers } = require("../Controllers/discoverController");
const authMiddleware = require("../Middlewares/auhMiddleware");
const optionalAuthMiddleware = require("../Middlewares/optionalAuthMiddleware");
const router = express.Router();

router.get("/tags", popularTags);
router.get("/bookmark", authMiddleware, getBookmarked);
router.get("/discover-developers", optionalAuthMiddleware, getDiscoverDevelopers);
module.exports = router