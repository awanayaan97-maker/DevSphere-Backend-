
const express = require("express");
const { popularTags, getBookmarkedData } = require("../Controllers/discoverController");
const authMiddleware = require("../Middlewares/auhMiddleware");
const router = express.Router();

router.get("/tags", popularTags);
router.get("/bookmark", authMiddleware,  getBookmarkedData)
module.exports = router