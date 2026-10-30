
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { signupService, googleAuthService, loginService, otpVerificationService, resendOtpService, forgotPasswordService, resetPasswordService, deactivateAccountService } = require("../services/authService");


async function signup(req, res, next) {

  try {
    const result = await signupService.signup(req.body);
    res.status(200).json(new ApiResponse(200, "Otp send successfully", result));
  }

  catch (error) {

    if (error.name === "ValidationError") return next(new ApiError(400, error.message))
    if (error.code === 11000) return next(new ApiError(409, "An account with this email already exists."))

    next(error)

  }
}

async function googleAuthController(req, res, next) {

  try {

    const result = await googleAuthService(req.googleUser);

    res.status(200).json(
      new ApiResponse(
        200,
        result.reactivated
          ? "Welcome back! Your account has been reactivated."
          : "Login successful",
        {
          token: result.token,
          user: result.user,
          reactivated: result.reactivated
        }
      )
    );

  }

  catch (error) {
    next(error);
  }
}

async function login(req, res, next) {

  try {

    const result = await loginService(req.body);

    res.status(200).json(
      new ApiResponse(
        200,
        result.reactivated
          ? "Welcome back! Your account has been reactivated."
          : "User fetched successfully",
        {
          token: result.token,
          user: result.user,
          reactivated: result.reactivated
        }
      )
    );

  }

  catch (error) {
    next(error);
  }

}

async function OTPVerification(req, res, next) {

  try {

    const newUser = await otpVerificationService(req.body);

    return res.status(201).json(
      new ApiResponse(201, "User Created Successfully", newUser)
    );
  }

  catch (error) {
    next(error);
  }
}

async function resendOTP(req, res, next) {

  try {

    await resendOtpService(req.body);
    res.status(200).json(
      new ApiResponse(200, "New OTP sent to your email")
    );
  }

  catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {

  try {

    await forgotPasswordService(req.body);
    res.status(200).json(
      new ApiResponse(200, "Password reset link has been sent to your email.")
    );
  }

  catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {

  try {

    await resetPasswordService({
      password: req.body.password,
      token: req.params.token
    });

    return res.status(200).json(
      new ApiResponse(200, "Password reset successful")
    );
  }

  catch (error) {
    next(error);
  }
}

async function deactivateAccount(req, res, next) {

  try {

    await deactivateAccountService(req.user.id, req.body);

    res.status(200).json(
      new ApiResponse(200, "Account deactivated successfully")
    );
  } 
  
  catch (error) {
    next(error);
  }
}

module.exports = { signup, googleAuthController, login, OTPVerification, resendOTP, forgotPassword, resetPassword, deactivateAccount }