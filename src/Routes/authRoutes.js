
const express = require("express");
const { signup, login, OTPVerification, resendOTP, forgotPassword, resetPassword, googleAuthController, deactivateAccount } = require("../Controllers/authController");
const verifyGoogleToken = require("../Middlewares/verifyGoogleToken");

const authMiddleware = require("../Middlewares/auhMiddleware");
const validateMiddleware = require("../Middlewares/validateMiddleware");
const { signupLimiter, loginLimiter, emailLimiter } = require("../Middlewares/rateLimiter")
const { signupSchema, loginSchema, OTPSchema, resendOTPSchema, forgotPasswordSchema, resetPasswordSchema, deactivateAccountSchema } = require("../Validators/authValidation");

const router = express.Router();

router.post("/signup", signupLimiter, validateMiddleware(signupSchema), signup)
router.post("/google", signupLimiter, verifyGoogleToken, googleAuthController)
router.post("/login", loginLimiter, validateMiddleware(loginSchema), login)
router.post("/verification", signupLimiter, validateMiddleware(OTPSchema), OTPVerification)
router.post("/resendOTP", signupLimiter, validateMiddleware(resendOTPSchema), resendOTP)
router.post("/forgot-password", emailLimiter, validateMiddleware(forgotPasswordSchema), forgotPassword)
router.post("/reset-password/:token", emailLimiter, validateMiddleware(resetPasswordSchema), resetPassword)
router.patch("/deactivate", authMiddleware, validateMiddleware(deactivateAccountSchema), deactivateAccount);

module.exports = router