import rateLimit from "express-rate-limit";
import httpStatus from "http-status";

const refreshRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        code: "REFRESH_RATE_LIMITED",
        message: "Too many refresh attempts. Please try again shortly."
    },
    statusCode: httpStatus.TOO_MANY_REQUESTS
});

export { refreshRateLimiter };
