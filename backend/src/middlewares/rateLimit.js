import rateLimit from "express-rate-limit";
import httpStatus from "http-status";
import { buildErrorResponse } from "../utils/apiResponse.js";

const createLimiter = ({ windowMs, limit, message, code }) => rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: httpStatus.TOO_MANY_REQUESTS,
    handler: (req, res) => {
        res.status(httpStatus.TOO_MANY_REQUESTS).json(buildErrorResponse({
            message,
            code
        }));
    }
});

const authRateLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: "Too many authentication attempts. Please try again shortly.",
    code: "AUTH_RATE_LIMITED"
});

const refreshRateLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    message: "Too many refresh attempts. Please try again shortly.",
    code: "REFRESH_RATE_LIMITED"
});

const meetingRateLimiter = createLimiter({
    windowMs: 5 * 60 * 1000,
    limit: 30,
    message: "Too many meeting requests. Please slow down and try again.",
    code: "MEETING_RATE_LIMITED"
});

export { authRateLimiter, meetingRateLimiter, refreshRateLimiter };
