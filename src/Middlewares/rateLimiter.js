
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const ApiError = require("../utils/ApiError");

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const LIMITS = {
    ip: { windowMs: 15 * MINUTE, limit: 1000 },
    user: { windowMs: 15 * MINUTE, limit: 300 },
    login: { windowMs: 15 * MINUTE, limit: 10 },
    signup: { windowMs: HOUR, limit: 5 },
    email: { windowMs: HOUR, limit: 5 },
    ai: { windowMs: HOUR, limit: 15 }
};

function createLimiter({ windowMs, limit }, message, extra = {}) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res, next) => {
            const finalMessage = typeof message === "function" ? message(req, res) : message;
            return next(new ApiError(429, finalMessage));
        },
        ...extra
    });
}


const ipLimiter = createLimiter(
    LIMITS.ip,
    "Too many requests from this network. Please try again in a few minutes."
);

const userLimiter = createLimiter(
    LIMITS.user,
    "You are sending requests too fast. Please try again in a few minutes.",
    {
        keyGenerator: (req) =>
            req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip)
    }
);

const loginLimiter = createLimiter(
    LIMITS.login,
    "Too many login attempts. Please try again in 15 minutes.",
    { skipSuccessfulRequests: true }
);


const signupLimiter = createLimiter(
    LIMITS.signup,
    "Too many sign-up attempts. Please try again in an hour."
);

const emailLimiter = createLimiter(
    LIMITS.email,
    "Too many requests. Please try again in an hour."
);

const aiLimiter = createLimiter(

    LIMITS.ai,
    (req, res) => {
        const resetTime = req.rateLimit?.resetTime;
        const minutes = resetTime
            ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 60000))
            : null;
        const wait = minutes ? `in about ${minutes} minute${minutes === 1 ? "" : "s"}` : "later";

        return `You've used your AI requests for this hour. To keep the assistant fast and free for everyone, You can use it again ${wait}.`;
    },
    {
        keyGenerator: (req) => `ai-user:${req.user.id}`
    }

);

module.exports = { ipLimiter, userLimiter, loginLimiter, signupLimiter, emailLimiter, aiLimiter };