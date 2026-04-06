import { Router } from "express";
import {
    createMeetingController,
    endMeetingController,
    getMeetingDetailsController,
    getMeetingHistoryController,
    getMeetingSummaryController,
    joinMeetingController,
    leaveMeetingController,
    removeParticipantController,
    updateMeetingSettingsController
} from "../controllers/meeting.controller.js";
import { verifyAuthToken } from "../middlewares/auth.js";
import { meetingRateLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { meetingIdSchema, removeParticipantSchema, updateMeetingSettingsSchema } from "../validators/meeting.schemas.js";

const router = Router();

router.use(verifyAuthToken, meetingRateLimiter);

router.route("/")
    .post(validate(meetingIdSchema), asyncHandler(createMeetingController))
    .get(asyncHandler(getMeetingHistoryController));

router.route("/:meetingId")
    .get(validate(meetingIdSchema, "params"), asyncHandler(getMeetingDetailsController));

router.route("/:meetingId/summary")
    .get(validate(meetingIdSchema, "params"), asyncHandler(getMeetingSummaryController));

router.route("/:meetingId/join")
    .post(validate(meetingIdSchema, "params"), asyncHandler(joinMeetingController));

router.route("/:meetingId/leave")
    .post(validate(meetingIdSchema, "params"), asyncHandler(leaveMeetingController));

router.route("/:meetingId/end")
    .post(validate(meetingIdSchema, "params"), asyncHandler(endMeetingController));

router.route("/:meetingId/remove-participant")
    .post(validate(meetingIdSchema, "params"), validate(removeParticipantSchema), asyncHandler(removeParticipantController));

router.route("/:meetingId/settings")
    .patch(validate(meetingIdSchema, "params"), validate(updateMeetingSettingsSchema), asyncHandler(updateMeetingSettingsController));

export default router;
