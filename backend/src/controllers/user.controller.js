import httpStatus from "http-status";
import { addMeetingToHistory, getMeetingHistory } from "../services/meeting.service.js";
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

const getUserHistory = async (req, res) => {
    const meetings = await getMeetingHistory(req.user.username);

    return sendSuccess(res, {
        statusCode: httpStatus.OK,
        message: "Meeting history fetched successfully",
        data: {
            meetings
        }
    });
};

const addToHistory = async (req, res) => {
    await addMeetingToHistory({
        meetingCode: req.body.meeting_code,
        username: req.user.username
    });

    return sendSuccess(res, {
        statusCode: httpStatus.CREATED,
        message: "Meeting added to history"
    });
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
