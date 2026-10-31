import dotenv from "dotenv";
import mongoose from "mongoose";

import { createApp } from "./createApp.js";
import { getAllowedOrigins } from "./utils/cors.js";
import { logger } from "./utils/logger.js";

dotenv.config();

const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || "development";
const MONGODB_URI = process.env.MONGODB_URI;
const SHUTDOWN_TIMEOUT_MS = 10_000;

const { app, io, server } = createApp();
app.set("port", PORT);

let isShuttingDown = false;

// Stop accepting connections, let in-flight requests finish, close sockets and
// the database, then exit. Hosting platforms send SIGTERM on every deploy.
const shutdown = async (signal, exitCode = 0) => {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;
    logger.info("Shutdown started", { signal });

    const forceExit = setTimeout(() => {
        logger.error("Shutdown timed out, forcing exit", { signal });
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
        io.close();
        await new Promise((resolve) => server.close(() => resolve()));
        await mongoose.connection.close();
        logger.info("Shutdown complete", { signal });
    } catch (error) {
        logger.error("Error during shutdown", { signal, error: error.message });
        exitCode = 1;
    }

    process.exit(exitCode);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", {
        error: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined
    });
    shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", { error: error.message, stack: error.stack });
    shutdown("uncaughtException", 1);
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
                environment: NODE_ENV,
                allowedCorsOrigins: getAllowedOrigins()
            });
        });
    } catch (error) {
        logger.error("Failed to start server", { error: error.message });
        process.exit(1);
    }
};

start();
