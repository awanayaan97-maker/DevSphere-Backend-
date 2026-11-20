const BookMark = require("../Models/BookmarkSchema");
const Post = require("../Models/Post");
const PostBookmark = require("../Models/PostBookmark");
const PublishArticle = require("../Models/PublishArticleSchema");

const BOOKMARK_SOURCES = {
    articles: {
        Model: BookMark,
        field: "article",
        from: "publisharticles",
        commentsFrom: "articlecomments",
        commentsKey: "articleId"
    },
    posts: {
        Model: PostBookmark,
        field: "post",
        from: "posts",
        commentsFrom: "postcomments",
        commentsKey: "postId"
    }
};

const TAG_SOURCES = {
    articles: PublishArticle,
    posts: Post
};

module.exports = { BOOKMARK_SOURCES, TAG_SOURCES }