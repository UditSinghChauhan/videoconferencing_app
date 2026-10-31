import { z } from "zod";
import { MEETING_ID_PATTERN } from "../utils/meetingCode.js";

const meetingIdField = z
    .string()
    .trim()
    .min(3, "Meeting ID must be at least 3 characters long")
    .max(64, "Meeting ID is too long")
    .regex(MEETING_ID_PATTERN, "Meeting ID can only contain letters, numbers, hyphens and underscores");

const meetingIdSchema = z.object({
    meetingId: meetingIdField
});

// The code is optional on create: when omitted the server generates one.
const createMeetingSchema = z.object({
    meetingId: meetingIdField.optional()
});

const updateMeetingSettingsSchema = z.object({
    allowChat: z.boolean().optional(),
    allowScreenShare: z.boolean().optional(),
    allowParticipantMic: z.boolean().optional()
}).strict().refine((value) => Object.keys(value).length > 0, {
    message: "At least one meeting setting must be provided"
});

const removeParticipantSchema = z.object({
    participantUserId: z.string().trim().regex(/^[a-f0-9]{24}$/i, "Participant user ID is invalid")
});

export {
    createMeetingSchema,
    meetingIdSchema,
    removeParticipantSchema,
    updateMeetingSettingsSchema
};
