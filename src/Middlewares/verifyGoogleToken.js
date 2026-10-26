
const { OAuth2Client } = require("google-auth-library");
const ApiError = require("../utils/ApiError");


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(req, res, next) {
    const { token } = req.body;

    if (!token) {
        return next(new ApiError(400, "Token is required"));
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        req.googleUser = ticket.getPayload();

        next();

    } catch (error) {
        console.log("GOOGLE VERIFY ERROR:", error.message);
        return next(new ApiError(401, "Invalid Google token"));
    }
}

module.exports = verifyGoogleToken;

