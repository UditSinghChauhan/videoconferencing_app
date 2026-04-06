import httpStatus from "http-status";
import {
    createMeeting,
    endMeeting,
    getMeetingDetails,
    getMeetingHistory,
    joinMeeting,
    leaveMeeting,
    removeParticipant,
    updateMeetingSettings
} from "../services/meeting.service.js";
import { sendSuccess } from "../utils/apiResponse.js";

const createMeetingController = async (req, res) => {
    const meeting = await createMeeting({
        meetingId: req.body.meetingId,
        user: req.user
    });

    return sendSuccess(res, {
        statusCode: httpStatus.CREATED,
        message: "Meeting created successfully",
        data: { meeting }
    });
};

const joinMeetingController = async (req, res) => {
    const meeting = await joinMeeting({
        meetingId: req.params.meetingId,
        user: req.user
    });

    return sendSuccess(res, {
        statusCode: httpStatus.OK,
        message: "Joined meeting successfully",
        data: { meeting }
    });
};

const leaveMeetingController = async (req, res) => {
    const meeting = await leaveMeeting({
        meetingId: req.params.meetingId,
        user: req.user
    });

    return sendSuccess(res, {
        statusCode: httpStatus.OK,
        message: "Left meeting successfully",
        data: { meeting }
    });
};

const endMeetingController = async (req, res) => {
    const meeting = await endMeeting({
        meetingId: req.params.meetingId,
        user: req.user
    });

    return sendSuccess(res, {
        statusCode: httpStatus.OK,
        message: "Meeting ended successfully",
        data: { meeting }
    });
};

const removeParticipantController = async (req, res) => {
    const meeting = await removeParticipant({
        meetingId: req.params.meetingId,
        participantUserId: req.body.participantUserId,
        user: req.user
    });

    return sendSuccess(res, {
        statusCode: httpStatus.OK,
        message: "Participant removed successfully",
        data: { meeting }
    });
};

const updateMeetingSettingsController = async (req, res) => {
    const meeting = await updateMeetingSettings({
        meetingId: req.params.meetingId,
        settings: req.body,
        user: req.user
    });

    return sendSuccess(res, {
        statusCode: httpStatus.OK,
        message: "Meeting settings updated successfully",
        data: { meeting }
    });
};

const getMeetingDetailsController = async (req, res) => {
    const meeting = await getMeetingDetails({
        meetingId: req.params.meetingId,
        user: req.user
    });

    return sendSuccess(res, {
        statusCode: httpStatus.OK,
        message: "Meeting details fetched successfully",
        data: { meeting }
    });
};

const getMeetingHistoryController = async (req, res) => {
    const meetings = await getMeetingHistory(req.user);

    return sendSuccess(res, {
        statusCode: httpStatus.OK,
        message: "Meeting history fetched successfully",
        data: { meetings }
    });
};

export {
    createMeetingController,
    endMeetingController,
    getMeetingDetailsController,
    getMeetingHistoryController,
    joinMeetingController,
    leaveMeetingController,
    removeParticipantController,
    updateMeetingSettingsController
};
