import httpStatus from "http-status";
import { User } from "../models/user.model.js";
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
    const authorizationHeader = req.headers.authorization;
    const token = extractBearerToken(authorizationHeader);

    if (!authorizationHeader) {
        logger.warn("Authentication failed: missing authorization header", {
            path: req.originalUrl,
            method: req.method
        });

        return res.status(httpStatus.UNAUTHORIZED).json({
            success: false,
            message: "Authorization token is required"
        });
    }

    if (!token) {
        logger.warn("Authentication failed: malformed authorization header", {
            path: req.originalUrl,
            method: req.method
        });

        return res.status(httpStatus.UNAUTHORIZED).json({
            success: false,
            message: "Authorization header must use the Bearer scheme"
        });
    }

    try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            logger.warn("Authentication failed: access token user missing", {
                userId: decoded.userId,
                path: req.originalUrl
            });

            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                code: "INVALID_TOKEN",
                message: "Invalid token: user no longer exists"
            });
        }

        const session = user.sessions?.find((candidate) => candidate.sessionId === decoded.sessionId);

        if (!decoded.sessionId || !session || session.expiresAt <= new Date()) {
            logger.warn("Authentication failed: inactive session", {
                userId: decoded.userId,
                sessionId: decoded.sessionId,
                path: req.originalUrl
            });

            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                code: "SESSION_INACTIVE",
                message: "Session is no longer active"
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
        logger.warn("Authentication failed: token verification error", {
            error: error.message,
            errorName: error.name,
            path: req.originalUrl,
            method: req.method
        });

        const message = error.name === "TokenExpiredError"
            ? "Token has expired"
            : "Invalid authentication token";

        return res.status(httpStatus.UNAUTHORIZED).json({
            success: false,
            code: error.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
            message
        });
    }
};

export { extractBearerToken, verifyAuthToken };
