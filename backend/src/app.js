import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import helmet from "helmet";
import httpStatus from "http-status";
import mongoose from "mongoose";

import { connectToSocket } from "./controllers/socketManager.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import meetingsRoutes from "./routes/meetings.routes.js";
import userRoutes from "./routes/users.routes.js";
import { sendSuccess } from "./utils/apiResponse.js";
import { logger } from "./utils/logger.js";

dotenv.config();

const app = express();
const server = createServer(app);

connectToSocket(server);

const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || "development";
const MONGODB_URI = process.env.MONGODB_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

const corsOptions = {
    origin: NODE_ENV === "production"
        ? CORS_ORIGIN
        : [
            "http://localhost:3000",
            "http://localhost:3100",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3100",
            "http://127.0.0.1:5173"
        ],
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Forwarded-For"],
    credentials: true
};

app.set("port", PORT);
app.set("trust proxy", 1);
app.use(helmet({
    crossOriginResourcePolicy: false
}));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/meetings", meetingsRoutes);

app.get("/api/v1/health", (req, res) => {
    return sendSuccess(res, {
        statusCode: httpStatus.OK,
        message: "Server is running",
        data: {
            status: "OK"
        }
    });
});

app.use(notFoundHandler);
app.use(errorHandler);

const shutdown = (signal, error = null) => {
    logger.error("Process shutdown triggered", {
        signal,
        error: error?.message
    });
};

process.on("unhandledRejection", (reason) => {
    shutdown("unhandledRejection", reason instanceof Error ? reason : new Error(String(reason)));
});

process.on("uncaughtException", (error) => {
    shutdown("uncaughtException", error);
    process.exit(1);
});

const start = async () => {
    try {
        if (!MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in environment variables");
        }

        const connectionDb = await mongoose.connect(MONGODB_URI);
        logger.info("MongoDB connected", { host: connectionDb.connection.host });

        server.listen(PORT, () => {
            logger.info("Server started", {
                port: PORT,
                environment: NODE_ENV
            });
        });
    } catch (error) {
        logger.error("Failed to start server", { error: error.message });
        process.exit(1);
    }
};

start();
