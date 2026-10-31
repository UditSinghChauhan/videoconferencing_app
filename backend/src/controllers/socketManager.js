import crypto from "node:crypto";
import { Server } from "socket.io";
import { Meeting } from "../models/meeting.model.js";
import { User } from "../models/user.model.js";
import {
    addMeetingChatMessage,
    getMeetingRealtimePolicy,
    markParticipantDisconnected,
    serializeParticipant
} from "../services/meeting.service.js";
import { buildCorsOptions } from "../utils/cors.js";
import { logger } from "../utils/logger.js";
import { MEETING_ID_PATTERN } from "../utils/meetingCode.js";
import { verifyAccessToken } from "../utils/tokens.js";

const MAX_CHAT_LENGTH = 2000;
const MAX_SIGNAL_BYTES = 64 * 1024;
const CHAT_REPLAY_LIMIT = 200;

let ioInstance = null;

// Recent chat per meeting, replayed to late joiners. Bounded per room and
// dropped when the meeting ends; the durable copy lives in activityLogs.
const roomMessages = new Map();

const getRoomKey = (meetingId) => `meeting:${meetingId}`;
const defaultMediaState = () => ({ audio: false, video: false, screen: false });
const getDisplayName = (user) => user?.name || user?.username;

const serializeSocketParticipant = (socket) => ({
    socketId: socket.id,
    userId: socket.data.user._id.toString(),
    username: socket.data.user.username,
    name: getDisplayName(socket.data.user),
    media: socket.data.media || defaultMediaState()
});

const getActiveParticipants = (meeting) => {
    return meeting.participants.filter((participant) => !participant.leftAt && !participant.removedAt);
};

const serializeMeetingRealtimeState = (meeting) => ({
    meetingId: meeting.meetingId,
    status: meeting.status,
    settings: meeting.settings,
    summary: meeting.summary || null,
    participants: getActiveParticipants(meeting).map(serializeParticipant)
});

const getMeetingRealtimeState = async (meetingId) => {
    const meeting = await Meeting.findOne({ meetingId }).select("-activityLogs");

    if (!meeting) {
        return null;
    }

    return serializeMeetingRealtimeState(meeting);
};

const getSocketsForMeeting = async (meetingId) => {
    if (!ioInstance) {
        return [];
    }

    return ioInstance.in(getRoomKey(meetingId)).fetchSockets();
};

const isSameUser = (socket, userId) => socket.data.user?._id?.toString() === userId.toString();

const ensureSocketCanAccessMeeting = async (socket, meetingId) => {
    const meeting = await Meeting.findOne({ meetingId }).select("-activityLogs");

    if (!meeting || meeting.status !== "active") {
        throw new Error("This meeting is no longer available.");
    }

    const participant = meeting.participants.find(
        (entry) => isSameUser(socket, entry.userId) && !entry.leftAt && !entry.removedAt
    );

    if (!participant) {
        throw new Error("You are not an active participant in this meeting.");
    }

    return { meeting, participant };
};

const emitMeetingParticipantsUpdated = async (meetingId) => {
    if (!ioInstance) {
        return;
    }

    const state = await getMeetingRealtimeState(meetingId);

    if (state) {
        ioInstance.to(getRoomKey(meetingId)).emit("meeting:participants-updated", state);
    }
};

const emitMeetingEnded = async (meeting) => {
    if (!ioInstance) {
        return;
    }

    const roomKey = getRoomKey(meeting.meetingId);
    const sockets = await getSocketsForMeeting(meeting.meetingId);
    roomMessages.delete(meeting.meetingId);

    ioInstance.to(roomKey).emit("meeting:ended", {
        meetingId: meeting.meetingId,
        status: meeting.status,
        summary: meeting.summary || null
    });

    setTimeout(() => {
        sockets.forEach((socket) => socket.disconnect(true));
    }, 50);
};

const emitParticipantRemoved = async ({ meeting, participantUserId }) => {
    if (!ioInstance) {
        return;
    }

    const roomKey = getRoomKey(meeting.meetingId);
    const sockets = await getSocketsForMeeting(meeting.meetingId);
    const targetSockets = sockets.filter((socket) => isSameUser(socket, participantUserId));

    targetSockets.forEach((socket) => {
        socket.emit("meeting:removed", {
            meetingId: meeting.meetingId,
            participantUserId
        });
    });

    ioInstance.to(roomKey).emit("meeting:participant-removed", {
        meetingId: meeting.meetingId,
        participantUserId
    });

    setTimeout(() => {
        targetSockets.forEach((socket) => socket.disconnect(true));
    }, 50);
};

const emitMeetingSettingsUpdated = async (meeting) => {
    if (!ioInstance) {
        return;
    }

    ioInstance.to(getRoomKey(meeting.meetingId)).emit("meeting:settings-updated", {
        meetingId: meeting.meetingId,
        settings: meeting.settings
    });
};

const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Authentication token is required"));
        }

        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return next(new Error("Socket authentication failed"));
        }

        const session = user.sessions?.find((candidate) => candidate.sessionId === decoded.sessionId);

        if (!decoded.sessionId || !session || session.expiresAt <= new Date()) {
            return next(new Error("Socket session is inactive"));
        }

        socket.data.user = {
            _id: user._id,
            username: user.username,
            name: user.name
        };
        socket.data.sessionId = decoded.sessionId;
        socket.data.media = defaultMediaState();
        next();
    } catch (error) {
        logger.warn("Socket authentication failed", {
            error: error.message
        });
        next(new Error(error.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "Socket authentication failed"));
    }
};

const handleJoinCall = async (socket, meetingId) => {
    if (typeof meetingId !== "string" || !MEETING_ID_PATTERN.test(meetingId)) {
        socket.emit("meeting:error", { message: "That meeting code is not valid." });
        return;
    }

    try {
        const { meeting } = await ensureSocketCanAccessMeeting(socket, meetingId);
        const roomKey = getRoomKey(meetingId);

        // One live connection per user per meeting: an older tab is replaced.
        // It is flagged first so its disconnect does not mark the user as left.
        const previousSockets = (await getSocketsForMeeting(meetingId)).filter(
            (roomSocket) => isSameUser(roomSocket, socket.data.user._id) && roomSocket.id !== socket.id
        );

        previousSockets.forEach((previousSocket) => {
            previousSocket.data.replaced = true;
            previousSocket.emit("meeting:error", {
                code: "REPLACED_BY_NEW_CONNECTION",
                message: "You joined this meeting from another tab or device."
            });
            previousSocket.disconnect(true);
        });

        socket.join(roomKey);
        socket.data.meetingId = meetingId;

        const roomSockets = await getSocketsForMeeting(meetingId);
        const participantIds = roomSockets.map((roomSocket) => roomSocket.id);
        const socketParticipants = roomSockets.map(serializeSocketParticipant);

        socket.emit("meeting:joined", {
            meeting: serializeMeetingRealtimeState(meeting),
            socketId: socket.id,
            participants: participantIds,
            socketParticipants
        });

        (roomMessages.get(meetingId) || []).forEach((entry) => {
            socket.emit("chat-message", entry.data, entry.sender, entry.socketIdSender, entry.meta);
        });

        socket.to(roomKey).emit("user-joined", socket.id, participantIds, socketParticipants);
        await emitMeetingParticipantsUpdated(meetingId);
    } catch (error) {
        socket.emit("meeting:error", {
            message: error.message
        });
    }
};

const handleSignal = (socket, toId, message) => {
    const meetingId = socket.data.meetingId;

    if (!meetingId || typeof toId !== "string" || typeof message !== "string" || message.length > MAX_SIGNAL_BYTES) {
        return;
    }

    // Only relay to a socket in the same meeting room. Without this check any
    // authenticated client could push SDP/ICE to any socket id on the server.
    const target = ioInstance.sockets.sockets.get(toId);

    if (!target || target.data.meetingId !== meetingId) {
        return;
    }

    target.emit("signal", socket.id, message);
};

const handleMediaState = (socket, state) => {
    const meetingId = socket.data.meetingId;

    if (!meetingId || !state || typeof state !== "object") {
        return;
    }

    const media = {
        audio: state.audio === true,
        video: state.video === true,
        screen: state.screen === true
    };

    socket.data.media = media;
    socket.to(getRoomKey(meetingId)).emit("media:state", { socketId: socket.id, media });
};

const handleChatMessage = async (socket, data) => {
    const meetingId = socket.data.meetingId;

    if (!meetingId || typeof data !== "string") {
        return;
    }

    const content = data.trim();

    if (content.length === 0 || content.length > MAX_CHAT_LENGTH) {
        return;
    }

    const policy = await getMeetingRealtimePolicy(meetingId);

    if (!policy || policy.status !== "active") {
        return;
    }

    if (policy.settings?.allowChat === false) {
        socket.emit("meeting:error", {
            code: "CHAT_DISABLED",
            message: "The host has turned off chat for this meeting."
        });
        return;
    }

    const sender = getDisplayName(socket.data.user);
    const meta = {
        id: crypto.randomUUID(),
        sentAt: new Date().toISOString(),
        userId: socket.data.user._id.toString()
    };
    const history = roomMessages.get(meetingId) || [];
    history.push({ data: content, sender, socketIdSender: socket.id, meta });
    roomMessages.set(meetingId, history.slice(-CHAT_REPLAY_LIMIT));

    addMeetingChatMessage({
        meetingId,
        userId: socket.data.user._id,
        username: sender,
        content
    }).catch((error) => {
        logger.warn("Failed to persist meeting chat message", {
            error: error.message,
            meetingId
        });
    });

    ioInstance.to(getRoomKey(meetingId)).emit("chat-message", content, sender, socket.id, meta);
};

const handleDisconnect = async (socket) => {
    const meetingId = socket.data.meetingId;

    if (meetingId && socket.data.user) {
        socket.to(getRoomKey(meetingId)).emit("user-left", socket.id);

        try {
            // A replaced tab, or a user still connected from another tab, has
            // not left the meeting; only the last connection counts as leaving.
            const stillConnected = (await getSocketsForMeeting(meetingId))
                .some((roomSocket) => isSameUser(roomSocket, socket.data.user._id));

            if (!socket.data.replaced && !stillConnected) {
                await markParticipantDisconnected({
                    meetingId,
                    user: socket.data.user
                });
            }

            await emitMeetingParticipantsUpdated(meetingId);
        } catch (error) {
            logger.warn("Error handling disconnect cleanup", {
                error: error.message,
                meetingId,
                userId: socket.data.user._id?.toString()
            });
        }
    }

    logger.info("Socket disconnected", {
        socketId: socket.id,
        userId: socket.data.user?._id?.toString()
    });
};

const connectToSocket = (server) => {
    const corsOptions = buildCorsOptions({
        allowedHeaders: ["Authorization", "X-Forwarded-For"]
    });

    ioInstance = new Server(server, {
        cors: corsOptions,
        transports: ["websocket", "polling"],
        maxHttpBufferSize: MAX_SIGNAL_BYTES * 2
    });

    ioInstance.use(authenticateSocket);

    ioInstance.on("connection", (socket) => {
        logger.info("Socket connected", {
            socketId: socket.id,
            userId: socket.data.user._id.toString()
        });

        socket.on("join-call", (meetingId) => handleJoinCall(socket, meetingId));
        socket.on("signal", (toId, message) => handleSignal(socket, toId, message));
        socket.on("media:state", (state) => handleMediaState(socket, state));
        socket.on("chat-message", (data) => {
            handleChatMessage(socket, data).catch((error) => {
                logger.warn("Failed to handle chat message", { error: error.message, meetingId: socket.data.meetingId });
            });
        });
        socket.on("disconnect", () => handleDisconnect(socket));
    });

    return ioInstance;
};

export {
    connectToSocket,
    emitMeetingEnded,
    emitMeetingParticipantsUpdated,
    emitMeetingSettingsUpdated,
    emitParticipantRemoved
};
