import { Router } from "express";
import { addToHistory, getCurrentUser, getUserHistory, login, logout, logoutAllSessions, refreshAccessToken, register } from "../controllers/user.controller.js";
import { verifyAuthToken } from "../middlewares/auth.js";
import { refreshRateLimiter } from "../middlewares/rateLimit.js";
import { validateRegisterInput, validateLoginInput } from "../middlewares/validation.js";

const router = Router();

router.route("/login").post(validateLoginInput, login);
router.route("/register").post(validateRegisterInput, register);
router.route("/refresh").post(refreshRateLimiter, refreshAccessToken);
router.route("/logout").post(logout);
router.route("/logout-all").post(verifyAuthToken, logoutAllSessions);
router.route("/me").get(verifyAuthToken, getCurrentUser);
router.route("/add_to_activity").post(verifyAuthToken, addToHistory);
router.route("/get_all_activity").get(verifyAuthToken, getUserHistory);

export default router;
