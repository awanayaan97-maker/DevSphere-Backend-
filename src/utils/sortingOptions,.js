
function getSortOptions() {
    return {
        latest: { createdAt: -1, _id: -1 },
        oldest: { createdAt: 1, _id: 1 },
        mostLiked: { likesCount: -1, _id: -1 },
        mostCommented: { commentsCount: -1, _id: -1 },
        relevance: { relevanceScore: -1, _id: -1 },
    };
}

module.exports = getSortOptions