import rateLimit from "express-rate-limit";
import httpStatus from "http-status";
import { buildErrorResponse } from "../utils/apiResponse.js";

const createLimiter = ({ windowMs, limit, message, code }) => rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    // Integration tests create many users from one IP; limits are covered by unit tests.
    skip: () => process.env.NODE_ENV === "test",
    statusCode: httpStatus.TOO_MANY_REQUESTS,
    handler: (req, res) => {
        res.status(httpStatus.TOO_MANY_REQUESTS).json(buildErrorResponse({
            message,
            code
        }));
    }
});

const readLimit = (name, fallback) => {
    const value = Number.parseInt(process.env[name] ?? "", 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

const authRateLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    // Overridable so end-to-end suites that sign up several users per run
    // are not throttled; production keeps the strict default.
    limit: readLimit("AUTH_RATE_LIMIT_MAX", 10),
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
    // A single meeting (lobby, join, roster, end, history) is ~6 calls; 30 was
    // low enough for an ordinary user hopping between rooms to be throttled.
    limit: 120,
    message: "Too many meeting requests. Please slow down and try again.",
    code: "MEETING_RATE_LIMITED"
});

export { authRateLimiter, meetingRateLimiter, refreshRateLimiter };
