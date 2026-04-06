import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const getAccessTokenSecret = () => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }

    return secret;
};

const getRefreshTokenSecret = () => {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_REFRESH_SECRET is not defined in environment variables");
    }

    return secret;
};

const getAccessTokenExpiry = () => process.env.JWT_EXPIRES_IN || "15m";
const getRefreshTokenExpiry = () => process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const generateSessionId = () => crypto.randomUUID();
const generateCsrfToken = () => crypto.randomBytes(32).toString("hex");

const generateAccessToken = (user, sessionId) => {
    return jwt.sign(
        {
            userId: user._id.toString(),
            username: user.username,
            sessionId,
            type: "access"
        },
        getAccessTokenSecret(),
        { expiresIn: getAccessTokenExpiry() }
    );
};

const generateRefreshToken = (user, sessionId) => {
    return jwt.sign(
        {
            userId: user._id.toString(),
            sessionId,
            type: "refresh"
        },
        getRefreshTokenSecret(),
        { expiresIn: getRefreshTokenExpiry() }
    );
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const decodeToken = (token) => jwt.decode(token);

const verifyAccessToken = (token) => jwt.verify(token, getAccessTokenSecret());
const verifyRefreshToken = (token) => jwt.verify(token, getRefreshTokenSecret());

export {
    decodeToken,
    generateAccessToken,
    generateCsrfToken,
    generateRefreshToken,
    generateSessionId,
    getAccessTokenExpiry,
    getRefreshTokenExpiry,
    hashToken,
    verifyAccessToken,
    verifyRefreshToken
};
