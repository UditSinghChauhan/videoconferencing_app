import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import { AppError } from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import {
    decodeToken,
    generateAccessToken,
    generateCsrfToken,
    generateRefreshToken,
    generateSessionId,
    getAccessTokenExpiry,
    getRefreshTokenExpiry,
    hashToken,
    verifyRefreshToken
} from "../utils/tokens.js";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_MS = Number(process.env.JWT_REFRESH_COOKIE_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000);

const refreshCookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/v1/users"
};

const getClientMetadata = (req) => ({
    userAgent: req.get("user-agent") || "unknown",
    ipAddress: req.ip || req.connection?.remoteAddress || "unknown"
});

const setRefreshTokenCookie = (res, token) => {
    res.cookie(REFRESH_COOKIE_NAME, token, {
        ...refreshCookieOptions,
        maxAge: REFRESH_COOKIE_MAX_AGE_MS
    });
};

const clearRefreshTokenCookie = (res) => {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
};

const buildAuthPayload = (user, sessionId, csrfToken) => ({
    token: generateAccessToken(user, sessionId),
    csrfToken,
    accessTokenExpiresIn: getAccessTokenExpiry(),
    refreshTokenExpiresIn: getRefreshTokenExpiry(),
    user: {
        id: user._id,
        name: user.name,
        username: user.username
    }
});

const createSession = (req, user, existingSessionId = generateSessionId()) => {
    const refreshToken = generateRefreshToken(user, existingSessionId);
    const csrfToken = generateCsrfToken();
    const decodedRefreshToken = decodeToken(refreshToken);
    const metadata = getClientMetadata(req);

    return {
        csrfToken,
        refreshToken,
        session: {
            sessionId: existingSessionId,
            refreshTokenHash: hashToken(refreshToken),
            csrfTokenHash: hashToken(csrfToken),
            userAgent: metadata.userAgent,
            ipAddress: metadata.ipAddress,
            createdAt: new Date(),
            lastUsedAt: new Date(),
            expiresAt: decodedRefreshToken?.exp ? new Date(decodedRefreshToken.exp * 1000) : new Date(Date.now() + REFRESH_COOKIE_MAX_AGE_MS)
        }
    };
};

const getActiveSessions = (user) => (user.sessions || []).filter((session) => session.expiresAt > new Date());

const persistSession = async (user, session) => {
    user.sessions = [...getActiveSessions(user), session];
    await user.save();
};

const replaceSession = async (user, sessionId, nextSession) => {
    user.sessions = getActiveSessions(user)
        .filter((session) => session.sessionId !== sessionId)
        .concat(nextSession);
    await user.save();
};

const getValidatedRefreshSession = async (req) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
        logger.warn("Refresh validation failed: missing refresh token");
        throw new AppError("Refresh token is required", {
            statusCode: httpStatus.UNAUTHORIZED,
            code: "MISSING_REFRESH_TOKEN"
        });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);
    const session = user?.sessions?.find((candidate) => candidate.sessionId === decoded.sessionId);

    if (!user || !session) {
        logger.warn("Refresh validation failed: session not found", {
            userId: decoded.userId,
            sessionId: decoded.sessionId
        });

        throw new AppError("Refresh token is invalid", {
            statusCode: httpStatus.UNAUTHORIZED,
            code: "INVALID_REFRESH_TOKEN"
        });
    }

    if (session.expiresAt <= new Date()) {
        logger.warn("Refresh validation failed: session expired", {
            userId: decoded.userId,
            sessionId: decoded.sessionId
        });

        throw new AppError("Refresh token has expired", {
            statusCode: httpStatus.UNAUTHORIZED,
            code: "REFRESH_TOKEN_EXPIRED"
        });
    }

    if (session.refreshTokenHash !== hashToken(refreshToken)) {
        logger.warn("Refresh validation failed: token hash mismatch", {
            userId: decoded.userId,
            sessionId: decoded.sessionId
        });

        throw new AppError("Refresh token replay detected", {
            statusCode: httpStatus.UNAUTHORIZED,
            code: "REFRESH_TOKEN_REPLAY_DETECTED"
        });
    }

    const csrfToken = req.get("x-csrf-token");

    if (session.csrfTokenHash !== hashToken(csrfToken)) {
        logger.warn("Refresh validation failed: CSRF mismatch", {
            userId: decoded.userId,
            sessionId: decoded.sessionId
        });

        throw new AppError("CSRF token is invalid", {
            statusCode: httpStatus.FORBIDDEN,
            code: "INVALID_CSRF_TOKEN"
        });
    }

    return { session, user };
};

const registerUser = async ({ name, username, password }) => {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
        throw new AppError("Username already exists", {
            statusCode: httpStatus.CONFLICT,
            code: "USERNAME_EXISTS"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
        name,
        username,
        password: hashedPassword
    });

    await newUser.save();
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
        logger.warn("Login failed: user not found", { username });
        throw new AppError("Invalid username or password", {
            statusCode: httpStatus.UNAUTHORIZED,
            code: "INVALID_CREDENTIALS"
        });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
        logger.warn("Login failed: invalid password", { username });
        throw new AppError("Invalid username or password", {
            statusCode: httpStatus.UNAUTHORIZED,
            code: "INVALID_CREDENTIALS"
        });
    }

    const { csrfToken, refreshToken, session } = createSession(req, user);
    await persistSession(user, session);
    setRefreshTokenCookie(res, refreshToken);

    logger.info("Login successful", {
        userId: user._id.toString(),
        username: user.username,
        sessionId: session.sessionId
    });

    return buildAuthPayload(user, session.sessionId, csrfToken);
};

const refreshUserSession = async (req, res) => {
    const { session, user } = await getValidatedRefreshSession(req);
    const { csrfToken, refreshToken, session: rotatedSession } = createSession(req, user, session.sessionId);

    await replaceSession(user, session.sessionId, rotatedSession);
    setRefreshTokenCookie(res, refreshToken);

    logger.info("Access token refreshed", {
        userId: user._id.toString(),
        username: user.username,
        sessionId: session.sessionId
    });

    return buildAuthPayload(user, session.sessionId, csrfToken);
};

const logoutUser = async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
        try {
            const decoded = verifyRefreshToken(refreshToken);
            await User.updateOne(
                { _id: decoded.userId },
                { $pull: { sessions: { sessionId: decoded.sessionId } } }
            );
        } catch (error) {
            logger.warn("Logout refresh token cleanup skipped", {
                error: error.message
            });
        }
    }

    clearRefreshTokenCookie(res);
};

const logoutAllUserSessions = async (user) => {
    await User.findByIdAndUpdate(user._id, { $set: { sessions: [] } });

    logger.info("Logged out from all sessions", {
        userId: user._id.toString(),
        username: user.username
    });
};

export {
    clearRefreshTokenCookie,
    loginUser,
    logoutAllUserSessions,
    logoutUser,
    refreshUserSession,
    registerUser
};
