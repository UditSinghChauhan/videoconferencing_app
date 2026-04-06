import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { Meeting } from "../models/meeting.model.js";
import { User } from "../models/user.model.js";
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
const CSRF_HEADER_NAME = "x-csrf-token";
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

const buildAuthPayload = (user, sessionId, csrfToken) => ({
    success: true,
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

const setRefreshTokenCookie = (res, token) => {
    res.cookie(REFRESH_COOKIE_NAME, token, {
        ...refreshCookieOptions,
        maxAge: REFRESH_COOKIE_MAX_AGE_MS
    });
};

const clearRefreshTokenCookie = (res) => {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
};

const createSession = (req, user, existingSessionId = generateSessionId()) => {
    const sessionId = existingSessionId;
    const refreshToken = generateRefreshToken(user, sessionId);
    const csrfToken = generateCsrfToken();
    const decodedRefreshToken = decodeToken(refreshToken);
    const metadata = getClientMetadata(req);

    return {
        csrfToken,
        refreshToken,
        session: {
            sessionId,
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

        const error = new Error("Refresh token is required");
        error.status = httpStatus.UNAUTHORIZED;
        error.code = "MISSING_REFRESH_TOKEN";
        throw error;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);
    const session = user?.sessions?.find((candidate) => candidate.sessionId === decoded.sessionId);

    if (!user || !session) {
        logger.warn("Refresh validation failed: session not found", {
            userId: decoded.userId,
            sessionId: decoded.sessionId
        });

        const error = new Error("Refresh token is invalid");
        error.status = httpStatus.UNAUTHORIZED;
        error.code = "INVALID_REFRESH_TOKEN";
        throw error;
    }

    if (session.expiresAt <= new Date()) {
        logger.warn("Refresh validation failed: session expired", {
            userId: decoded.userId,
            sessionId: decoded.sessionId
        });

        const error = new Error("Refresh token has expired");
        error.status = httpStatus.UNAUTHORIZED;
        error.code = "REFRESH_TOKEN_EXPIRED";
        throw error;
    }

    if (session.refreshTokenHash !== hashToken(refreshToken)) {
        logger.warn("Refresh validation failed: token hash mismatch", {
            userId: decoded.userId,
            sessionId: decoded.sessionId
        });

        const error = new Error("Refresh token replay detected");
        error.status = httpStatus.UNAUTHORIZED;
        error.code = "REFRESH_TOKEN_REPLAY_DETECTED";
        throw error;
    }

    const csrfToken = req.get(CSRF_HEADER_NAME);

    if (!csrfToken) {
        logger.warn("Refresh validation failed: missing CSRF token", {
            userId: decoded.userId,
            sessionId: decoded.sessionId
        });

        const error = new Error("CSRF token is required");
        error.status = httpStatus.FORBIDDEN;
        error.code = "MISSING_CSRF_TOKEN";
        throw error;
    }

    if (session.csrfTokenHash !== hashToken(csrfToken)) {
        logger.warn("Refresh validation failed: CSRF mismatch", {
            userId: decoded.userId,
            sessionId: decoded.sessionId
        });

        const error = new Error("CSRF token is invalid");
        error.status = httpStatus.FORBIDDEN;
        error.code = "INVALID_CSRF_TOKEN";
        throw error;
    }

    return { csrfToken, decoded, refreshToken, session, user };
};

const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (!user) {
            logger.warn("Login failed: user not found", { username });

            return res.status(httpStatus.NOT_FOUND).json({
                success: false,
                message: "User not found"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            logger.warn("Login failed: invalid password", { username });

            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid username or password"
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

        return res.status(httpStatus.OK).json(buildAuthPayload(user, session.sessionId, csrfToken));
    } catch (error) {
        logger.error("Login error", {
            error: error.message,
            username
        });

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error during login"
        });
    }
};

const register = async (req, res) => {
    const { name, username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({
                success: false,
                message: "Username already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            username,
            password: hashedPassword
        });

        await newUser.save();

        return res.status(httpStatus.CREATED).json({
            success: true,
            message: "User registered successfully"
        });
    } catch (error) {
        logger.error("Register error", {
            error: error.message,
            username
        });

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error during registration"
        });
    }
};

const refreshAccessToken = async (req, res) => {
    try {
        const { session, user } = await getValidatedRefreshSession(req);
        const { csrfToken, refreshToken, session: rotatedSession } = createSession(req, user);

        await replaceSession(user, session.sessionId, rotatedSession);
        setRefreshTokenCookie(res, refreshToken);

        logger.info("Access token refreshed", {
            userId: user._id.toString(),
            username: user.username,
            previousSessionId: session.sessionId,
            sessionId: rotatedSession.sessionId
        });

        return res.status(httpStatus.OK).json(buildAuthPayload(user, rotatedSession.sessionId, csrfToken));
    } catch (error) {
        logger.warn("Refresh token verification failed", {
            error: error.message,
            errorName: error.name,
            code: error.code
        });

        clearRefreshTokenCookie(res);

        return res.status(error.status || httpStatus.UNAUTHORIZED).json({
            success: false,
            code: error.code || (error.name === "TokenExpiredError" ? "REFRESH_TOKEN_EXPIRED" : "INVALID_REFRESH_TOKEN"),
            message: error.name === "TokenExpiredError" ? "Refresh token has expired" : error.message
        });
    }
};

const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

        if (refreshToken) {
            const decoded = verifyRefreshToken(refreshToken);
            await User.updateOne(
                { _id: decoded.userId },
                { $pull: { sessions: { sessionId: decoded.sessionId } } }
            );
        }
    } catch (error) {
        logger.warn("Logout refresh token cleanup skipped", {
            error: error.message
        });
    }

    clearRefreshTokenCookie(res);

    return res.status(httpStatus.OK).json({
        success: true,
        message: "Logged out successfully"
    });
};

const logoutAllSessions = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { $set: { sessions: [] } });
        clearRefreshTokenCookie(res);

        logger.info("Logged out from all sessions", {
            userId: req.user._id.toString(),
            username: req.user.username
        });

        return res.status(httpStatus.OK).json({
            success: true,
            message: "Logged out from all sessions"
        });
    } catch (error) {
        logger.error("Logout all sessions failed", {
            error: error.message,
            userId: req.user._id.toString()
        });

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Unable to logout from all sessions"
        });
    }
};

const getCurrentUser = async (req, res) => {
    return res.status(httpStatus.OK).json({
        success: true,
        user: {
            id: req.user._id,
            name: req.user.name,
            username: req.user.username
        }
    });
};

const getUserHistory = async (req, res) => {
    try {
        const meetings = await Meeting.find({ user_id: req.user.username }).sort({ date: -1 });

        return res.status(httpStatus.OK).json({
            success: true,
            data: meetings
        });
    } catch (error) {
        logger.error("Get history error", {
            error: error.message,
            userId: req.user?._id?.toString()
        });

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error retrieving history"
        });
    }
};

const addToHistory = async (req, res) => {
    const { meeting_code } = req.body;

    try {
        if (!meeting_code) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Meeting code is required"
            });
        }

        const newMeeting = new Meeting({
            user_id: req.user.username,
            meetingCode: meeting_code
        });

        await newMeeting.save();

        return res.status(httpStatus.CREATED).json({
            success: true,
            message: "Meeting added to history"
        });
    } catch (error) {
        logger.error("Add to history error", {
            error: error.message,
            userId: req.user?._id?.toString()
        });

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error adding to history"
        });
    }
};

export {
    addToHistory,
    getCurrentUser,
    getUserHistory,
    login,
    logout,
    logoutAllSessions,
    refreshAccessToken,
    register
};
