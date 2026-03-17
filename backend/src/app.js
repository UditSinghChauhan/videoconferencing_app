import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// CORS configuration
const corsOptions = {
    origin: NODE_ENV === 'production' 
        ? CORS_ORIGIN 
        : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
};

app.set("port", PORT);
app.use(cors(corsOptions));
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);
//app.use("api/v2/users",newUserRoutes);

// Health check endpoint
app.get("/api/v1/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "Server is running" });
});

const start = async () => {
    try {
        if (!MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in environment variables");
        }

        const connectionDb = await mongoose.connect(MONGODB_URI);
        console.log(`✓ MongoDB Connected: ${connectionDb.connection.host}`);
        
        server.listen(PORT, () => {
            console.log(`✓ Server running on PORT ${PORT} in ${NODE_ENV} mode`);
        });
    } catch (error) {
        console.error("✗ Failed to start server:", error.message);
        process.exit(1);
    }
};

start();