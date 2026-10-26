
const express = require("express");
const {signup, login, OTPVerification, resendOTP, forgotPassword, resetPassword, googleAuthController, deactivateAccount} = require("../Controllers/authController");
const verifyGoogleToken = require("../Middlewares/verifyGoogleToken");
const authMiddleware = require("../Middlewares/auhMiddleware");
const { signupLimiter, loginLimiter, emailLimiter } = require("../Middlewares/rateLimiter")

const router = express.Router();

router.post("/signup", signupLimiter,  signup)
router.post("/google", signupLimiter, verifyGoogleToken, googleAuthController)
router.post("/login", loginLimiter, login)
router.post("/verification", OTPVerification)
router.post("/resendOTP", resendOTP)
router.post("/forgot-password", emailLimiter, forgotPassword)
router.post("/reset-password/:token", emailLimiter, resetPassword)
router.patch("/deactivate", authMiddleware, deactivateAccount);

module.exports = router