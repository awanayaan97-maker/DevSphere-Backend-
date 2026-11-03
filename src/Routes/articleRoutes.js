
const express = require("express");
const router = express.Router();
const upload = require("../Middlewares/multer");
const authMiddleware = require("../Middlewares/auhMiddleware");
const { userLimiter } = require("../Middlewares/rateLimiter")
const optionalAuthMiddleware = require("../Middlewares/optionalAuthMiddleware");

const { getArticlesFeed, searchArticles, publishArticle, getArticleById, getArticleForEdit, deleteArticle, articleImageUpload, exploreArticles } =
    require("../Controllers/publishArticleController");

const { getDraftArticles, draftArticle, deleteDraftArticle } = require("../Controllers/draftArticleController");
const { getArticleComments, commentArticle, likeArticle, deleteComment, editArticleComment, toggleArticleCommentLike, toggleArticleBookmark } =
    require("../Controllers/articleActionsController");
const validateMiddleware = require("../Middlewares/validateMiddleware");
const { feedArticleSchema, searchArticleSchema, publishArticleSchema, deleteArticleSchema, getArticleForEditSchema, exploreArticlesSchema, getArticleByIdSchema } = require("../Validators/articleValidation");

// Publish Routes
router.get("/publish", optionalAuthMiddleware, validateMiddleware(feedArticleSchema), getArticlesFeed);
router.get("/publish/:id", optionalAuthMiddleware, validateMiddleware(getArticleByIdSchema), getArticleById);
router.post("/publish", authMiddleware, userLimiter, validateMiddleware(publishArticleSchema), publishArticle);
router.post("/publish/:articleId", authMiddleware, userLimiter, publishArticle);

// Search & Explore Routes
router.get("/search", optionalAuthMiddleware, validateMiddleware(searchArticleSchema), searchArticles);
router.get("/explore", optionalAuthMiddleware, validateMiddleware(exploreArticlesSchema), exploreArticles);

// Comments Routes
router.get("/comment/:id", optionalAuthMiddleware, getArticleComments);
router.post("/comment/:id", authMiddleware, userLimiter, commentArticle);
router.patch("/comment/:id", authMiddleware, userLimiter, editArticleComment);
router.delete("/comment/:id", authMiddleware, userLimiter, deleteComment);

// Draft Routes
router.get("/draft", authMiddleware, getDraftArticles);
router.post("/draft", authMiddleware, userLimiter, draftArticle);
router.delete("/draft/:id", authMiddleware, userLimiter, deleteDraftArticle)

// Bookmark Routes
router.post("/bookmark/:article", authMiddleware, userLimiter, toggleArticleBookmark);
// router.get("/bookmarks", authMiddleware, getBookmarkedArticles);

// Likes & Upload Routes
router.patch("/like/:articleId", authMiddleware, userLimiter, likeArticle);
router.patch("/like-articleComment/:id", authMiddleware, userLimiter, toggleArticleCommentLike);
router.post("/image-upload", authMiddleware, userLimiter, upload.single("articleImage"), articleImageUpload);

// Specific Article 
router.get("/:id", authMiddleware, validateMiddleware(getArticleForEditSchema), getArticleForEdit);
router.delete("/:articleId", authMiddleware, userLimiter, validateMiddleware(deleteArticleSchema), deleteArticle);

module.exports = router
