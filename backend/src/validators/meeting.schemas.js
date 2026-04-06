import { z } from "zod";

const meetingIdSchema = z.object({
    meetingId: z.string().trim().min(3, "Meeting ID must be at least 3 characters long").max(100, "Meeting ID is too long")
});

const updateMeetingSettingsSchema = z.object({
    allowChat: z.boolean().optional(),
    allowScreenShare: z.boolean().optional(),
    allowParticipantMic: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, {
    message: "At least one meeting setting must be provided"
});

const removeParticipantSchema = z.object({
    participantUserId: z.string().trim().min(1, "Participant user ID is required")
});

export {
    meetingIdSchema,
    removeParticipantSchema,
    updateMeetingSettingsSchema
};
