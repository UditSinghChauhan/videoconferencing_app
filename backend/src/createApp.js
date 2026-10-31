import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import httpStatus from "http-status";
import mongoose from "mongoose";

import { connectToSocket } from "./controllers/socketManager.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import meetingsRoutes from "./routes/meetings.routes.js";
import userRoutes from "./routes/users.routes.js";
import { sendSuccess } from "./utils/apiResponse.js";
import { buildCorsOptions } from "./utils/cors.js";

const DB_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

/**
 * Builds the Express app, the HTTP server and the Socket.IO server without
 * listening or connecting to MongoDB, so the entry point and the integration
 * tests share exactly the same wiring.
 */
const createApp = () => {
    const app = express();
    const server = createServer(app);
    const io = connectToSocket(server);
    const corsOptions = buildCorsOptions();

    app.set("trust proxy", 1);
    app.disable("x-powered-by");
    app.use(helmet({
        crossOriginResourcePolicy: false
    }));
    app.use(cors(corsOptions));
    app.options("*", cors(corsOptions));
    app.use(cookieParser());
    app.use(express.json({ limit: "40kb" }));
    app.use(express.urlencoded({ limit: "40kb", extended: true }));

    app.use("/api/v1/users", userRoutes);
    app.use("/api/v1/meetings", meetingsRoutes);

    // Liveness plus a database readiness signal, so a platform health check
    // can tell "process up" apart from "process up but MongoDB unreachable".
    app.get("/api/v1/health", (req, res) => {
        const database = DB_STATES[mongoose.connection.readyState] || "unknown";
        const isReady = database === "connected";

        return sendSuccess(res, {
            statusCode: isReady ? httpStatus.OK : httpStatus.SERVICE_UNAVAILABLE,
            message: isReady ? "Server is running" : "Server is running but the database is not ready",
            data: {
                status: isReady ? "OK" : "DEGRADED",
                database,
                uptimeSeconds: Math.round(process.uptime())
            }
        });
    });

    app.use(notFoundHandler);
    app.use(errorHandler);

    return { app, io, server };
};

export { createApp };
