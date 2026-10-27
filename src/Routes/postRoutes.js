
const express = require("express");
const { createPost, getPost, deletePost, getSinglePost } = require("../Controllers/postController");

const { likePost, commentPost, getPostComments, deleteComment, editPostComment, togglePostCommentLike, togglePostBookmark } =
require("../Controllers/postActionsController");

const authMiddleware = require("../Middlewares/auhMiddleware");
const { userLimiter } = require("../Middlewares/rateLimiter")
const upload = require("../Middlewares/multer");
const optionalAuthMiddleware = require("../Middlewares/optionalAuthMiddleware");

const router = express.Router();
// Posts Routes
router.post("/", authMiddleware, userLimiter, upload.array("postImages", 5), createPost);
router.get('/', optionalAuthMiddleware, getPost);
router.get('/:id', optionalAuthMiddleware, getSinglePost);
router.delete('/:id', authMiddleware, userLimiter, deletePost);

// Likes Routes
router.patch('/like/:id', authMiddleware, userLimiter, likePost);
router.patch('/like-postComment/:id', authMiddleware, userLimiter, togglePostCommentLike);

// Comments Routes
router.get('/comment/:id', optionalAuthMiddleware, getPostComments);
router.post('/comment/:id', authMiddleware, userLimiter, commentPost);
router.patch('/comment/:id', authMiddleware, editPostComment);
router.delete('/comment/:id', authMiddleware, userLimiter, deleteComment);

// Bookmark Route
router.post('/bookmark/:id', authMiddleware, userLimiter, togglePostBookmark);

module.exports = router