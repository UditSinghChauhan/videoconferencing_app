import mongoose, { Schema } from "mongoose";

const userSessionSchema = new Schema(
    {
        sessionId: { type: String, required: true },
        refreshTokenHash: { type: String, required: true },
        csrfTokenHash: { type: String, required: true },
        userAgent: { type: String, default: "unknown" },
        ipAddress: { type: String, default: "unknown" },
        createdAt: { type: Date, default: Date.now },
        lastUsedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true }
    },
    { _id: false }
);

const userSchema = new Schema(
    {
        name: { type: String, required: true },
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        sessions: { type: [userSessionSchema], default: [] },
        createdAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export { User };
