
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../Models/UserSchema")
const PendingSignup = require("../Models/OtpVerificationSchema");
const { sendOTP, sendPasswordReset } = require("./emailController");
const PasswordReset = require("../Models/passwordResetSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const generateToken = require("../utils/generateToken");


async function signup(req, res, next) {

  const { firstName, lastName, email, password } = req.body ?? {};

  if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) return next(new ApiError(400, "All fields are required"))

  try {

    let userExits = await User.findOne({ email })

    if (userExits) throw new ApiError(409, "Email or username already exists")

    let hashPassword = await bcrypt.hash(password, 12)

    const otp = crypto.randomInt(100000, 1000000);

    await PendingSignup.deleteOne({ email })

    const otpData = await PendingSignup.create({
      firstName,
      lastName,
      email,
      password: hashPassword,
      otp,
    })

    await sendOTP(email, otp)
    res.status(200).json(new ApiResponse(200, "Otp send successfully", otpData))
  }

  catch (error) {

    if (error.name === "ValidationError") return next(new ApiError(400, error.message))

    else if (error.code === 11000) return next(new ApiError(409, "email or username already exists"))

    else {
      next(error)
    }

  }
}

async function googleAuthController(req, res, next) {

  try {
    const payload = req.googleUser;

    const { email, given_name, family_name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        firstName: given_name || "User",
        lastName: family_name || "",
        email,
        profileImage: picture,
        authProvider: "google"
      });
    }

    let reactivated = false;

    if (user.isDeleted) {
      await User.updateOne(
        { _id: user._id },
        { $set: { isDeleted: false, deletedAt: null } }
      );
      reactivated = true;
    }

    const token = generateToken(
      user.firstName,
      user.lastName,
      user.email,
      user._id
    );

    const userData = user.toObject();
    delete userData.password;

    res.status(200).json(
      new ApiResponse(
        200,
        reactivated
          ? "Welcome back! Your account has been reactivated."
          : "Login successful",
        { token, user: userData, reactivated }
      )
    );

  } catch (error) {
    next(error);
  }

}

async function login(req, res, next) {

  let { email, password } = req.body ?? {};

  if (!email?.trim() || !password?.trim()) return next(new ApiError(400, "email & password is required"))

  try {

    let data = await User.findOne({ email: email });

    if (!data) throw new ApiError(404, "Invalid credentails")

    if (!data.password) throw new ApiError(400, "This account uses Google Sign-In. Please continue with Google.")

    const matchPassword = await bcrypt.compare(password, data.password)

    if (!matchPassword) throw new ApiError(404, "Invalid credentails")

    let reactivated = false;

    if (data.isDeleted) {

      await User.updateOne(
        { _id: data._id },
        { $set: { isDeleted: false, deletedAt: null } }
      );
      reactivated = true;

    }

    let token = generateToken(data?.firstName, data?.lastName, data?.email, data._id)

    const userData = data.toObject();
    delete userData.password;

    res.json({
      status: true,
      statusCode: 200,
      message: reactivated
        ? "Welcome back! Your account has been reactivated."
        : "User fetched successfully",
      data: userData,
      token: token,
      reactivated: reactivated
    })
  }

  catch (error) {
    next(error)
  }

}

async function OTPVerification(req, res, next) {

  let { otp, email } = req.body ?? {};

  if (!otp || !email) return next(new ApiError(400, "OTP number is required"))

  try {

    let verifyEmail = await PendingSignup.findOne({ email: email })

    if (!verifyEmail) throw new ApiError(404, "OTP has expired. Please signup again.")

    if (verifyEmail.attempts >= 8) {
      await PendingSignup.deleteOne({ email })
      throw new ApiError(429, "Too many attempts. Please signup again.")
    }

    if (otp !== verifyEmail.otp) throw new ApiError(400, "Invalid OTP number")

    let data = await User.create({
      firstName: verifyEmail.firstName,
      lastName: verifyEmail.lastName,
      email: verifyEmail.email,
      password: verifyEmail.password
    })

    if (data) {
      await PendingSignup.deleteOne({ email: verifyEmail.email });
      return res.status(201).json(new ApiResponse(201, "User Created Successfully", data))
    }

    else throw new ApiError(500, "Internel Server Error")
  }

  catch (error) {
    next(error)
  }

}

async function resendOTP(req, res, next) {

  let { email } = req.body ?? {};

  if (!email) return next(new ApiError(400, "Email is required"))

  try {

    console.log("Try ky ander");

    let checkEmail = await PendingSignup.findOne({ email: email });

    console.log("Email Check kar liya");

    if (!checkEmail) throw new ApiError(400, "No pending signup found. Please signup again.")

    console.log("Email find nahi howi hai");

    const newOTP = crypto.randomInt(100000, 1000000);

    let updateOTP = await PendingSignup.findOneAndUpdate(
      { email: email, },
      { otp: newOTP, createdAt: new Date() },
      { new: true }
    )

    await sendOTP(email, newOTP)

    res.status(200).json(new ApiResponse(200, "New OTP sent to your email"))

  }

  catch (error) {
    next(error)
  }

}

async function forgotPassword(req, res, next) {

  let { email } = req.body ?? {};

  if (!email) return next(new ApiError(400, "Email is required"))

  try {

    let checkUser = await User.findOne({ email })

    if (!checkUser) throw new ApiError(404, "User not found")

    let token = crypto.randomBytes(32).toString("hex");

    let hashToken = crypto.createHash("sha256").update(token).digest("hex");

    await PasswordReset.deleteOne({ email })

    await PasswordReset.create({ email, token: hashToken })

    await sendPasswordReset(email, token);

    res.status(200).json(new ApiResponse(200, "Password reset link has been sent to your email."))
  }

  catch (error) {
    next(error)
  }

}

async function resetPassword(req, res, next) {

  let { password } = req.body ?? {};

  let { token } = req.params

  if (!token) return next(new ApiError(400, "Reset token is required"))

  if (!password) return next(new ApiError(400, "New password is required"))

  try {

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    let findToken = await PasswordReset.findOne({ token: hashedToken });

    if (!findToken) throw new ApiError(400, "Reset link has expired. Please request a new one.");
    let hashedPassword = await bcrypt.hash(password, 12);

    await User.findOneAndUpdate({ email: findToken.email }, { password: hashedPassword });
    await PasswordReset.deleteOne({ email: findToken.email });

    return res.status(200).json(new ApiResponse(200, "Password reset successful"));

  }

  catch (error) {
    next(error)
  }
}

async function deactivateAccount(req, res, next) {

  const userId = req.user.id;
  const { password } = req.body;

  try {

    const user = await User.findById(userId);

    if (!user) throw new ApiError(404, "Account not found.");

    if (user.isDeleted) {
      throw new ApiError(400, "Account is already deactivated.");
    }

    if (user.authProvider === "local") {

      if (!password) {
        throw new ApiError(400, "Password is required to deactivate your account.");
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        throw new ApiError(401, "Incorrect password.");
      }
    }

    await User.updateOne(
      { _id: userId },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    res.status(200).json(new ApiResponse(200, "Account deactivated successfully"));

  } catch (error) {
    next(error);
  }
}

module.exports = { signup, googleAuthController, login, OTPVerification, resendOTP, forgotPassword, resetPassword, deactivateAccount }