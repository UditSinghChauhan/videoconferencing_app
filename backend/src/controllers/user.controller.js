import httpStatus from "http-status";
import {
    clearRefreshTokenCookie,
    loginUser,
    logoutAllUserSessions,
    logoutUser,
    refreshUserSession,
    registerUser
} from "../services/auth.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

const login = async (req, res) => {
    const authPayload = await loginUser(req, res);
    return sendSuccess(res, {
        statusCode: httpStatus.OK,
        message: "Login successful",
        data: authPayload
    });
};

const register = async (req, res) => {
    await registerUser(req.body);

    return sendSuccess(res, {
        statusCode: httpStatus.CREATED,
        message: "User registered successfully"
    });
};

const refreshAccessToken = async (req, res) => {
    try {
        const authPayload = await refreshUserSession(req, res);

        return sendSuccess(res, {
            statusCode: httpStatus.OK,
            message: "Access token refreshed successfully",
            data: authPayload
        });
    } catch (error) {
        clearRefreshTokenCookie(res);
        throw error;
    }
};

const logout = async (req, res) => {
    await logoutUser(req, res);

    return sendSuccess(res, {
        statusCode: httpStatus.OK,
        message: "Logged out successfully"
    });
};

const logoutAllSessions = async (req, res) => {
    await logoutAllUserSessions(req.user);
    clearRefreshTokenCookie(res);

    return sendSuccess(res, {
        statusCode: httpStatus.OK,
        message: "Logged out from all sessions"
    });
};

const getCurrentUser = async (req, res) => {
    return sendSuccess(res, {
        statusCode: httpStatus.OK,
        message: "Current user fetched successfully",
        data: {
            user: {
                id: req.user._id,
                name: req.user.name,
                username: req.user.username
            }
        }
    });
};

export {
    getCurrentUser,
    login,
    logout,
    logoutAllSessions,
    refreshAccessToken,
    register
};
