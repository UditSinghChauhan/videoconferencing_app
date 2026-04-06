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

const meetingSchema = new Schema(
    {
        meetingId: { type: String, required: true, unique: true, index: true },
        hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        hostUsername: { type: String, required: true },
        participants: { type: [participantSchema], default: [] },
        status: { type: String, enum: ["active", "ended"], default: "active", required: true },
        settings: { type: meetingSettingsSchema, default: () => ({}) },
        endedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export { Meeting };
