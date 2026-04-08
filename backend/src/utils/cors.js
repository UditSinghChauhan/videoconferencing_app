import { logger } from "./logger.js";

const LOCAL_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3100",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3100",
    "http://127.0.0.1:5173"
];

const DEFAULT_PRODUCTION_ORIGINS = [
    "https://bridgefrontend.onrender.com"
];

const parseOrigins = (...values) => values
    .flatMap((value) => (value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);

const getAllowedOrigins = () => {
    const nodeEnv = process.env.NODE_ENV || "development";

    if (nodeEnv !== "production") {
        return LOCAL_ORIGINS;
    }

    return [...new Set([
        ...DEFAULT_PRODUCTION_ORIGINS,
        ...parseOrigins(process.env.CORS_ORIGIN, process.env.FRONTEND_URL)
    ])];
};

const buildCorsOriginHandler = (allowedOrigins = getAllowedOrigins()) => (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
    }

    logger.warn("Blocked CORS request", {
        origin,
        allowedOrigins
    });

    return callback(new Error("Origin is not allowed by CORS"));
};

const buildCorsOptions = ({
    allowedHeaders = ["Content-Type", "Authorization", "X-CSRF-Token", "X-Forwarded-For"],
    methods = ["GET", "POST", "PATCH"]
} = {}) => ({
    origin: buildCorsOriginHandler(),
    methods,
    allowedHeaders,
    credentials: true,
    optionsSuccessStatus: 204
});

export {
    buildCorsOptions,
    getAllowedOrigins
};
