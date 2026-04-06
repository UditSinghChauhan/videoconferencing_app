import mongoose, { Schema } from "mongoose";

const participantSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        username: { type: String, required: true },
        role: { type: String, enum: ["host", "participant"], required: true },
        joinedAt: { type: Date, default: Date.now },
        leftAt: { type: Date, default: null },
        removedAt: { type: Date, default: null }
    },
    { _id: false }
);

const meetingSettingsSchema = new Schema(
    {
        allowChat: { type: Boolean, default: true },
        allowScreenShare: { type: Boolean, default: true },
        allowParticipantMic: { type: Boolean, default: true }
    },
    { _id: false }
);

const meetingActivitySchema = new Schema(
    {
        type: {
            type: String,
            enum: ["chat", "join", "leave", "removed", "settings-updated", "ended"],
            required: true
        },
        userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
        username: { type: String, default: null },
        content: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now }
    },
    { _id: false }
);

const meetingSummarySchema = new Schema(
    {
        generatedAt: { type: Date, default: null },
        keyPoints: { type: [String], default: [] },
        highlights: { type: [String], default: [] },
        keywords: { type: [String], default: [] },
        participantsInvolved: { type: [String], default: [] },
        conclusion: { type: String, default: "" }
    },
    { _id: false }
);

const meetingSchema = new Schema(
    {
        meetingId: { type: String, required: true, unique: true, index: true },
        hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        hostUsername: { type: String, required: true },
        participants: { type: [participantSchema], default: [] },
        status: { type: String, enum: ["active", "ended"], default: "active", required: true },
        settings: { type: meetingSettingsSchema, default: () => ({}) },
        activityLogs: { type: [meetingActivitySchema], default: [] },
        summary: { type: meetingSummarySchema, default: () => ({}) },
        endedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export { Meeting };
