
const crypto = require("crypto");
const User = require("../Models/UserSchema");
const bcrypt = require("bcrypt");
const PendingSignup = require("../Models/OtpVerificationSchema");
const generateToken = require("../utils/generateToken");
const ApiError = require("../utils/ApiError");
const { sendOTP, sendPasswordReset } = require("../Controllers/emailController");
const PasswordReset = require("../Models/passwordResetSchema");

async function signupService(userData) {

    const { firstName, lastName, email, password } = userData;

    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new ApiError(409, "An account with this email already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = crypto.randomInt(100000, 1000000);
    const hashedOtp = await bcrypt.hash(otp.toString(), 10);

    await PendingSignup.deleteOne({ email });

    await PendingSignup.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        otp: hashedOtp,
    });

    await sendOTP(email, otp);
    return { email };
}

async function googleAuthService(payload) {

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

    return {
        token,
        user: userData,
        reactivated
    };
}

async function loginService(credentials) {

    const { email, password } = credentials;
    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(401, "Invalid credentials");
    }

    if (!user.password) {
        throw new ApiError(400, "This account uses Google Sign-In. Please continue with Google.");
    }

    const matchPassword = await bcrypt.compare(password, user.password);
    if (!matchPassword) {
        throw new ApiError(401, "Invalid credentials");
    }

    let reactivated = false;
    if (user.isDeleted) {
        await User.updateOne(
            { _id: user._id },
            { $set: { isDeleted: false, deletedAt: null } }
        );
        reactivated = true;
    }

    const token = generateToken(user.firstName, user.lastName, user.email, user._id);
    const userData = user.toObject();
    delete userData.password;

    return {
        token,
        user: userData,
        reactivated
    };
}

async function otpVerificationService(data) {

    const { email, otp } = data;
    const verifyEmail = await PendingSignup.findOne({ email });

    if (!verifyEmail) {
        throw new ApiError(404, "OTP has expired or invalid. Please signup again.");
    }

    if (verifyEmail.attempts >= 8) {
        await PendingSignup.deleteOne({ email });
        throw new ApiError(429, "Too many failed attempts. Please signup again.");
    }

    const isMatch = await bcrypt.compare(otp.toString(), verifyEmail.otp);

    if (!isMatch) {
        await PendingSignup.updateOne(
            { email },
            { $inc: { attempts: 1 } }
        );
        throw new ApiError(400, "Invalid OTP number");
    }

    const newUser = await User.create({
        firstName: verifyEmail.firstName,
        lastName: verifyEmail.lastName,
        email: verifyEmail.email,
        password: verifyEmail.password,
    });

    if (!newUser) {
        throw new ApiError(500, "Internal Server Error");
    }

    await PendingSignup.deleteOne({ email: verifyEmail.email });
    return newUser;
}

async function resendOtpService(data) {

    const { email } = data;
    const checkEmail = await PendingSignup.findOne({ email });

    if (!checkEmail) {
        throw new ApiError(400, "No pending signup found. Please signup again.");
    }

    const newOTP = crypto.randomInt(100000, 1000000);
    const hashedOtp = await bcrypt.hash(newOTP.toString(), 10);

    await PendingSignup.findOneAndUpdate(
        { email },
        {
            otp: hashedOtp,
            createdAt: new Date(),
            attempts: 0
        },
        { new: true }
    );

    await sendOTP(email, newOTP);
    return { email };
}

async function forgotPasswordService(data) {

    const { email } = data;
    const checkUser = await User.findOne({ email });

    if (!checkUser) {
        throw new ApiError(404, "Password reset link has been sent to your email");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const hashToken = crypto.createHash("sha256").update(token).digest("hex");

    await PasswordReset.deleteOne({ email });
    await PasswordReset.create({ email, token: hashToken });
    await sendPasswordReset(email, token);
    return { email };
}

async function resetPasswordService(data) {

    const { password, token } = data;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const findToken = await PasswordReset.findOne({ token: hashedToken });

    if (!findToken) {
        throw new ApiError(400, "Reset link has expired or is invalid. Please request a new one.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.findOneAndUpdate(
        { email: findToken.email },
        { password: hashedPassword }
    );

    await PasswordReset.deleteOne({ email: findToken.email });
    return { email: findToken.email };
}

async function deactivateAccountService(userId, bodyData) {

    const { password } = bodyData;
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "Account not found.");
    }

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

    return { success: true };
}

module.exports = { signupService, googleAuthService, loginService, otpVerificationService, resendOtpService, forgotPasswordService, resetPasswordService, deactivateAccountService }