import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import { verifyAccessToken } from "../utils/tokens.js";

const extractBearerToken = (authorizationHeader = "") => {
    if (!authorizationHeader) {
        return null;
    }

    const [scheme, token] = authorizationHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return null;
    }

    return token;
};

const verifyAuthToken = async (req, res, next) => {
    try {
        const authorizationHeader = req.headers.authorization;
        const token = extractBearerToken(authorizationHeader);

        if (!authorizationHeader) {
            throw new AppError("Authorization token is required", {
                statusCode: httpStatus.UNAUTHORIZED,
                code: "MISSING_AUTHORIZATION_HEADER"
            });
        }

        if (!token) {
            throw new AppError("Authorization header must use the Bearer scheme", {
                statusCode: httpStatus.UNAUTHORIZED,
                code: "INVALID_AUTHORIZATION_HEADER"
            });
        }

        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            throw new AppError("Invalid token: user no longer exists", {
                statusCode: httpStatus.UNAUTHORIZED,
                code: "INVALID_TOKEN"
            });
        }

        const session = user.sessions?.find((candidate) => candidate.sessionId === decoded.sessionId);

        if (!decoded.sessionId || !session || session.expiresAt <= new Date()) {
            throw new AppError("Session is no longer active", {
                statusCode: httpStatus.UNAUTHORIZED,
                code: "SESSION_INACTIVE"
            });
        }

        req.user = {
            _id: user._id,
            name: user.name,
            username: user.username
        };
        req.token = token;
        req.session = session;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return next(new AppError("Token has expired", {
                statusCode: httpStatus.UNAUTHORIZED,
                code: "TOKEN_EXPIRED"
            }));
        }

        if (error instanceof AppError) {
            return next(error);
        }

        logger.warn("Authentication failed: token verification error", {
            error: error.message,
            errorName: error.name,
            path: req.originalUrl,
            method: req.method
        });

        return next(new AppError("Invalid authentication token", {
            statusCode: httpStatus.UNAUTHORIZED,
            code: "INVALID_TOKEN"
        }));
    }
};

export { extractBearerToken, verifyAuthToken };
