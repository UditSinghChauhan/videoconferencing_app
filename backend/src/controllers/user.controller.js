import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt"
import crypto from "crypto"
import { Meeting } from "../models/meeting.model.js";

// Helper function to generate token with expiration
const generateTokenWithExpiry = () => {
    const token = crypto.randomBytes(20).toString("hex");
    const expiryHours = parseInt(process.env.TOKEN_EXPIRY_HOURS || 24);
    const tokenExpiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    return { token, tokenExpiry };
};

// Helper function to check if token is expired
const isTokenExpired = (tokenExpiry) => {
    return tokenExpiry && new Date() > new Date(tokenExpiry);
};

const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({
                success: false,
                message: "User not found"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (isPasswordCorrect) {
            const { token, tokenExpiry } = generateTokenWithExpiry();
            user.token = token;
            user.tokenExpiry = tokenExpiry;
            await user.save();
            
            return res.status(httpStatus.OK).json({
                success: true,
                token: token,
                expiresIn: process.env.TOKEN_EXPIRY_HOURS || 24
            });
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid username or password"
            });
        }

    } catch (error) {
        console.error("Login error:", error);
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
            name: name,
            username: username,
            password: hashedPassword
        });

        await newUser.save();

        return res.status(httpStatus.CREATED).json({
            success: true,
            message: "User registered successfully"
        });

    } catch (error) {
        console.error("Register error:", error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error during registration"
        });
    }
};

const getUserHistory = async (req, res) => {
    const { token } = req.query;

    try {
        if (!token) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Token is required"
            });
        }

        const user = await User.findOne({ token: token });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        if (isTokenExpired(user.tokenExpiry)) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Token has expired. Please login again."
            });
        }

        const meetings = await Meeting.find({ user_id: user.username }).sort({ date: -1 });
        return res.status(httpStatus.OK).json({
            success: true,
            data: meetings
        });

    } catch (error) {
        console.error("Get history error:", error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error retrieving history"
        });
    }
};

const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;

    try {
        if (!token || !meeting_code) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Token and meeting code are required"
            });
        }

        const user = await User.findOne({ token: token });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        if (isTokenExpired(user.tokenExpiry)) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Token has expired. Please login again."
            });
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code
        });

        await newMeeting.save();

        return res.status(httpStatus.CREATED).json({
            success: true,
            message: "Meeting added to history"
        });

    } catch (error) {
        console.error("Add to history error:", error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Server error adding to history"
        });
    }
};

export { login, register, getUserHistory, addToHistory };