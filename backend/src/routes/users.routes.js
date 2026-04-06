import { Router } from "express";
import {
    addToHistory,
    getCurrentUser,
    getUserHistory,
    login,
    logout,
    logoutAllSessions,
    refreshAccessToken,
    register
} from "../controllers/user.controller.js";
import { verifyAuthToken } from "../middlewares/auth.js";
import { authRateLimiter, meetingRateLimiter, refreshRateLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import { csrfHeaderSchema, loginSchema, meetingHistorySchema, registerSchema } from "../validators/user.schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.route("/login").post(authRateLimiter, validate(loginSchema), asyncHandler(login));
router.route("/register").post(authRateLimiter, validate(registerSchema), asyncHandler(register));
router.route("/refresh").post(refreshRateLimiter, validate(csrfHeaderSchema, "headers"), asyncHandler(refreshAccessToken));
router.route("/logout").post(validate(csrfHeaderSchema, "headers"), asyncHandler(logout));
router.route("/logout-all").post(verifyAuthToken, asyncHandler(logoutAllSessions));
router.route("/me").get(verifyAuthToken, asyncHandler(getCurrentUser));
router.route("/add_to_activity").post(verifyAuthToken, meetingRateLimiter, validate(meetingHistorySchema), asyncHandler(addToHistory));
router.route("/get_all_activity").get(verifyAuthToken, meetingRateLimiter, asyncHandler(getUserHistory));

export default router;
