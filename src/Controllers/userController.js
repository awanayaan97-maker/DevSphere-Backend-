
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const { default: mongoose } = require("mongoose");
const Follow = require("../Models/FollowSchema");
const Notification = require("../Models/NotificationSchema");
const { getUserService, getUserWithArticlesService, getPublicUserService, updateUserService, followUserService, getConnectionsService } = require("../services/userService");

async function getUser(req, res, next) {

    try {
        const userId = req.user.id;
        const user = await getUserService(userId);

        res.status(200).json(
            new ApiResponse(200, "Data fetched successfully", user)
        );
    }

    catch (error) {
        next(error);
    }
}

async function getUserWithArticles(req, res, next) {

    try {
        const userId = req.user.id;
        const result = await getUserWithArticlesService(userId, req.validated.query);

        return res.status(200).json(
            new ApiResponse(200, "User with articles fetched successfully", result)
        );
    }

    catch (error) {
        next(error);
    }
}

async function getPublicUser(req, res, next) {

    try {

        const { id } = req.params;
        const loggedInUserId = req.user?.id;
        const userData = await getPublicUserService(id, loggedInUserId);

        res.status(200).json(
            new ApiResponse(200, "User data fetched successfully", userData)
        );
    }

    catch (error) {
        next(error);
    }
}

async function updateUser(req, res, next) {

    try {
        const userId = req.user.id;
        const updatedUser = await updateUserService(userId, req.body, req.files);

        res.status(200).json(
            new ApiResponse(200, "Profile updated successfully", updatedUser)
        );

    }

    catch (error) {
        next(error);
    }
}

async function followUser(req, res, next) {

    try {
        const followerId = req.user.id;
        const result = await followUserService(followerId, req.body);

        if (result.action === "follow") {
            req.io.to(result.followedUser.toString()).emit("follow_notification", result.notificationData);

            return res.status(201).json(
                new ApiResponse(201, result.message)
            );
        }

        else {
            return res.status(200).json(
                new ApiResponse(200, result.message)
            );
        }

    }

    catch (error) {
        if (error.code === 11000) {
            return next(new ApiError(400, "You are already following this user."));
        }
        next(error);
    }
}

async function getConnections(req, res, next) {
    
    try {
        const { type } = req.params;
        const userId = req.user.id;
        const result = await getConnectionsService(userId, type);

        const message = result.type === "followings"
            ? "User followings data fetched successfully"
            : "User followers data fetched successfully";

        return res.status(200).json(
            new ApiResponse(200, message, result.data)
        );

    } 
    
    catch (error) {
        next(error);
    }
}

async function markNotificationsAsRead(req, res, next) {

    try {

        const userId = req.user.id;

        await Notification.updateMany(
            { receiver: userId, isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json(new ApiResponse(200, "Notifications marked as read", null));
    } catch (error) {
        next(error);
    }
}

module.exports = { getUser, getUserWithArticles, getPublicUser, updateUser, followUser, getConnections, markNotificationsAsRead }