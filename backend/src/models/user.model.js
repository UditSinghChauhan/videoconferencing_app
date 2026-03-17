import mongoose, { Schema } from "mongoose";

const userScheme = new Schema(
    {
        name: { type: String, required: true },
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        token: { type: String },
        tokenExpiry: { type: Date },
        createdAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
)

const User = mongoose.model("User", userScheme);

export { User };