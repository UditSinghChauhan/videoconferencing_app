import httpStatus from "http-status";
import { Meeting } from "../models/meeting.model.js";
import { AppError } from "../utils/appError.js";
import { generateMeetingCode } from "../utils/meetingCode.js";
import { generateMeetingSummary } from "../utils/meetingSummary.js";

const MAX_CODE_ATTEMPTS = 5;
const HISTORY_LIMIT = 50;

const getDisplayName = (user) => user?.name || user?.username;

const getActiveParticipant = (meeting, userId) => {
    return meeting.participants.find(
        (participant) => participant.userId.toString() === userId.toString() && !participant.leftAt && !participant.removedAt
    );
};

const getAnyParticipant = (meeting, userId) => {
    return meeting.participants.find(
        (participant) => participant.userId.toString() === userId.toString()
    );
};

const appendActivityLog = (meeting, { type, userId = null, username = null, content = "" }) => {
    meeting.activityLogs.push({
        type,
        userId,
        username,
        content,
        createdAt: new Date()
    });
};

const serializeSummary = (summary = {}) => ({
    generatedAt: summary.generatedAt || null,
    keyPoints: summary.keyPoints || [],
    highlights: summary.highlights || [],
    keywords: summary.keywords || [],
    participantsInvolved: summary.participantsInvolved || [],
    conclusion: summary.conclusion || ""
});

const serializeParticipant = (participant) => ({
    userId: participant.userId,
    username: participant.username,
    name: participant.name || participant.username,
    role: participant.role,
    joinedAt: participant.joinedAt
});

const getDurationMs = (meeting) => {
    if (!meeting.createdAt) {
        return null;
    }

    const end = meeting.endedAt || (meeting.status === "ended" ? meeting.updatedAt : null);
    return end ? Math.max(0, new Date(end) - new Date(meeting.createdAt)) : null;
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
        hasSummary: Boolean(meeting.summary?.generatedAt),
        currentUserRole: currentParticipant?.role || null,
        participantCount: meeting.participants.length,
        durationMs: getDurationMs(meeting),
        participants: activeParticipants.map(serializeParticipant),
        summary: meeting.status === "ended" ? serializeSummary(meeting.summary) : null
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

const ensureMeetingMember = (meeting, userId) => {
    const participant = getAnyParticipant(meeting, userId);

    if (!participant) {
        throw new AppError("User does not have access to this meeting", {
            statusCode: httpStatus.FORBIDDEN,
            code: "MEETING_ACCESS_DENIED"
        });
    }

    return participant;
};

const createMeeting = async ({ meetingId, user }) => {
    if (!meetingId) {
        return createMeetingWithGeneratedCode({ user });
    }

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

    const meeting = await insertMeeting({ meetingId, user });
    return serializeMeeting(meeting, user._id);
};

const insertMeeting = ({ meetingId, user }) => Meeting.create({
    meetingId,
    hostId: user._id,
    hostUsername: user.username,
    participants: [
        {
            userId: user._id,
            username: user.username,
            name: getDisplayName(user),
            role: "host",
            joinedAt: new Date()
        }
    ],
    activityLogs: [
        {
            type: "join",
            userId: user._id,
            username: getDisplayName(user),
            content: "created and joined the meeting",
            createdAt: new Date()
        }
    ]
});

// Relies on the unique index rather than a read-then-write check, so two
// concurrent creates can never end up with the same code.
const createMeetingWithGeneratedCode = async ({ user }) => {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
        try {
            const meeting = await insertMeeting({ meetingId: generateMeetingCode(), user });
            return serializeMeeting(meeting, user._id);
        } catch (error) {
            if (error?.code !== 11000) {
                throw error;
            }
        }
    }

    throw new AppError("Could not allocate a meeting code. Please try again.", {
        statusCode: httpStatus.SERVICE_UNAVAILABLE,
        code: "MEETING_CODE_EXHAUSTED"
    });
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
            name: getDisplayName(user),
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

        appendActivityLog(meeting, {
            type: "join",
            userId: user._id,
            username: getDisplayName(user),
            content: "joined the meeting"
        });

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
    appendActivityLog(meeting, {
        type: "leave",
        userId: user._id,
        username: getDisplayName(user),
        content: "left the meeting"
    });
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

    appendActivityLog(meeting, {
        type: "ended",
        userId: user._id,
        username: getDisplayName(user),
        content: "ended the meeting"
    });

    meeting.summary = generateMeetingSummary(meeting);
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
    appendActivityLog(meeting, {
        type: "removed",
        userId: participant.userId,
        username: participant.name || participant.username,
        content: "was removed from the meeting"
    });
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

    appendActivityLog(meeting, {
        type: "settings-updated",
        userId: user._id,
        username: getDisplayName(user),
        content: `updated meeting settings: ${Object.keys(settings).join(", ")}`
    });

    await meeting.save();

    return serializeMeeting(meeting, user._id);
};

const getMeetingDetails = async ({ meetingId, user }) => {
    const meeting = await findMeetingByMeetingId(meetingId);

    if (meeting.status === "active") {
        ensureParticipant(meeting, user._id);
    } else {
        ensureMeetingMember(meeting, user._id);
    }

    return serializeMeeting(meeting, user._id);
};

const getMeetingSummary = async ({ meetingId, user }) => {
    const meeting = await findMeetingByMeetingId(meetingId);
    ensureMeetingMember(meeting, user._id);

    const chat = meeting.activityLogs
        .filter((entry) => entry.type === "chat")
        .slice(-500)
        .map((entry) => ({
            sender: entry.username,
            content: entry.content,
            sentAt: entry.createdAt
        }));

    return {
        meetingId: meeting.meetingId,
        status: meeting.status,
        hostUsername: meeting.hostUsername,
        createdAt: meeting.createdAt,
        endedAt: meeting.endedAt,
        durationMs: getDurationMs(meeting),
        participantCount: meeting.participants.length,
        summary: serializeSummary(meeting.summary),
        chat
    };
};

const getMeetingHistory = async (user) => {
    // Activity logs can be large and are not needed for the list view.
    const meetings = await Meeting.find({ "participants.userId": user._id })
        .select("-activityLogs")
        .sort({ updatedAt: -1 })
        .limit(HISTORY_LIMIT);

    return meetings.map((meeting) => serializeMeeting(meeting, user._id));
};

// Atomic $push instead of load-modify-save: chat arrives concurrently from
// many sockets, and parallel document saves would race on the same version.
const addMeetingChatMessage = async ({ meetingId, userId, username, content }) => {
    const result = await Meeting.updateOne(
        { meetingId, status: "active" },
        {
            $push: {
                activityLogs: {
                    type: "chat",
                    userId,
                    username,
                    content,
                    createdAt: new Date()
                }
            }
        }
    );

    return result.modifiedCount > 0;
};

const getMeetingRealtimePolicy = async (meetingId) => {
    return Meeting.findOne({ meetingId }, { status: 1, settings: 1 }).lean();
};

const markParticipantDisconnected = async ({ meetingId, user }) => {
    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting || meeting.status !== "active") {
        return null;
    }

    const participant = getActiveParticipant(meeting, user._id);

    if (!participant || participant.role === "host") {
        return meeting;
    }

    participant.leftAt = new Date();
    appendActivityLog(meeting, {
        type: "leave",
        userId: user._id,
        username: getDisplayName(user),
        content: "disconnected from the meeting"
    });
    await meeting.save();

    return meeting;
};

export {
    addMeetingChatMessage,
    getMeetingRealtimePolicy,
    createMeeting,
    endMeeting,
    getMeetingDetails,
    getMeetingHistory,
    getMeetingSummary,
    joinMeeting,
    leaveMeeting,
    markParticipantDisconnected,
    serializeParticipant,
    removeParticipant,
    updateMeetingSettings
};
