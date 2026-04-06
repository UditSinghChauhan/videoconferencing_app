import httpStatus from "http-status";
import { Meeting } from "../models/meeting.model.js";
import { AppError } from "../utils/appError.js";

const getActiveParticipant = (meeting, userId) => {
    return meeting.participants.find(
        (participant) => participant.userId.toString() === userId.toString() && !participant.leftAt && !participant.removedAt
    );
};

const serializeMeeting = (meeting, currentUserId = null) => {
    const activeParticipants = meeting.participants.filter((participant) => !participant.leftAt && !participant.removedAt);
    const currentParticipant = currentUserId ? activeParticipants.find((participant) => participant.userId.toString() === currentUserId.toString()) : null;

    return {
        id: meeting._id,
        meetingId: meeting.meetingId,
        hostId: meeting.hostId,
        hostUsername: meeting.hostUsername,
        status: meeting.status,
        settings: meeting.settings,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
        endedAt: meeting.endedAt,
        currentUserRole: currentParticipant?.role || null,
        participants: activeParticipants.map((participant) => ({
            userId: participant.userId,
            username: participant.username,
            role: participant.role,
            joinedAt: participant.joinedAt
        }))
    };
};

const findMeetingByMeetingId = async (meetingId) => {
    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
        throw new AppError("Meeting not found", {
            statusCode: httpStatus.NOT_FOUND,
            code: "MEETING_NOT_FOUND"
        });
    }

    return meeting;
};

const ensureMeetingActive = (meeting) => {
    if (meeting.status !== "active") {
        throw new AppError("Meeting has already ended", {
            statusCode: httpStatus.BAD_REQUEST,
            code: "MEETING_ENDED"
        });
    }
};

const ensureHost = (meeting, userId) => {
    const hostParticipant = getActiveParticipant(meeting, userId);

    if (!hostParticipant || hostParticipant.role !== "host") {
        throw new AppError("Only the host can perform this action", {
            statusCode: httpStatus.FORBIDDEN,
            code: "HOST_PERMISSION_REQUIRED"
        });
    }
};

const ensureParticipant = (meeting, userId) => {
    const participant = getActiveParticipant(meeting, userId);

    if (!participant) {
        throw new AppError("User is not an active participant in this meeting", {
            statusCode: httpStatus.FORBIDDEN,
            code: "NOT_A_PARTICIPANT"
        });
    }

    return participant;
};

const createMeeting = async ({ meetingId, user }) => {
    const existingMeeting = await Meeting.findOne({ meetingId });

    if (existingMeeting && existingMeeting.status === "active") {
        throw new AppError("Meeting already exists", {
            statusCode: httpStatus.CONFLICT,
            code: "MEETING_ALREADY_EXISTS"
        });
    }

    if (existingMeeting && existingMeeting.status === "ended") {
        throw new AppError("Meeting ID is unavailable because the meeting has ended", {
            statusCode: httpStatus.CONFLICT,
            code: "MEETING_ID_UNAVAILABLE"
        });
    }

    const meeting = await Meeting.create({
        meetingId,
        hostId: user._id,
        hostUsername: user.username,
        participants: [
            {
                userId: user._id,
                username: user.username,
                role: "host",
                joinedAt: new Date()
            }
        ]
    });

    return serializeMeeting(meeting, user._id);
};

const joinMeeting = async ({ meetingId, user }) => {
    const meeting = await findMeetingByMeetingId(meetingId);
    ensureMeetingActive(meeting);

    const existingActiveParticipant = getActiveParticipant(meeting, user._id);

    if (!existingActiveParticipant) {
        const previousParticipantIndex = meeting.participants.findIndex(
            (participant) => participant.userId.toString() === user._id.toString()
        );

        const participantRecord = {
            userId: user._id,
            username: user.username,
            role: meeting.hostId.toString() === user._id.toString() ? "host" : "participant",
            joinedAt: new Date(),
            leftAt: null,
            removedAt: null
        };

        if (previousParticipantIndex >= 0) {
            meeting.participants[previousParticipantIndex] = participantRecord;
        } else {
            meeting.participants.push(participantRecord);
        }

        await meeting.save();
    }

    return serializeMeeting(meeting, user._id);
};

const leaveMeeting = async ({ meetingId, user }) => {
    const meeting = await findMeetingByMeetingId(meetingId);
    ensureMeetingActive(meeting);
    const participant = ensureParticipant(meeting, user._id);

    if (participant.role === "host") {
        throw new AppError("Host cannot leave an active meeting. End the meeting instead.", {
            statusCode: httpStatus.BAD_REQUEST,
            code: "HOST_CANNOT_LEAVE_ACTIVE_MEETING"
        });
    }

    participant.leftAt = new Date();
    await meeting.save();

    return serializeMeeting(meeting, user._id);
};

const endMeeting = async ({ meetingId, user }) => {
    const meeting = await findMeetingByMeetingId(meetingId);
    ensureMeetingActive(meeting);
    ensureHost(meeting, user._id);

    meeting.status = "ended";
    meeting.endedAt = new Date();
    meeting.participants = meeting.participants.map((participant) => ({
        ...participant.toObject?.() ?? participant,
        leftAt: participant.leftAt || new Date()
    }));

    await meeting.save();

    return serializeMeeting(meeting, user._id);
};

const removeParticipant = async ({ meetingId, participantUserId, user }) => {
    const meeting = await findMeetingByMeetingId(meetingId);
    ensureMeetingActive(meeting);
    ensureHost(meeting, user._id);

    if (meeting.hostId.toString() === participantUserId) {
        throw new AppError("Host cannot remove themselves from the meeting", {
            statusCode: httpStatus.BAD_REQUEST,
            code: "HOST_REMOVAL_NOT_ALLOWED"
        });
    }

    const participant = getActiveParticipant(meeting, participantUserId);

    if (!participant) {
        throw new AppError("Participant not found in this meeting", {
            statusCode: httpStatus.NOT_FOUND,
            code: "PARTICIPANT_NOT_FOUND"
        });
    }

    participant.removedAt = new Date();
    participant.leftAt = participant.leftAt || new Date();
    await meeting.save();

    return serializeMeeting(meeting, user._id);
};

const updateMeetingSettings = async ({ meetingId, settings, user }) => {
    const meeting = await findMeetingByMeetingId(meetingId);
    ensureMeetingActive(meeting);
    ensureHost(meeting, user._id);

    meeting.settings = {
        ...meeting.settings.toObject?.(),
        ...settings
    };

    await meeting.save();

    return serializeMeeting(meeting, user._id);
};

const getMeetingDetails = async ({ meetingId, user }) => {
    const meeting = await findMeetingByMeetingId(meetingId);
    ensureParticipant(meeting, user._id);

    return serializeMeeting(meeting, user._id);
};

const getMeetingHistory = async (user) => {
    const meetings = await Meeting.find({
        participants: {
            $elemMatch: {
                userId: user._id
            }
        }
    }).sort({ updatedAt: -1 });

    return meetings.map((meeting) => serializeMeeting(meeting, user._id));
};

export {
    createMeeting,
    endMeeting,
    getMeetingDetails,
    getMeetingHistory,
    joinMeeting,
    leaveMeeting,
    removeParticipant,
    updateMeetingSettings
};
