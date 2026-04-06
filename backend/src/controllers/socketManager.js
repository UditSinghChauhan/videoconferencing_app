import { Server } from "socket.io";
import { Meeting } from "../models/meeting.model.js";
import { User } from "../models/user.model.js";
import { addMeetingChatMessage, markParticipantDisconnected } from "../services/meeting.service.js";
import { logger } from "../utils/logger.js";
import { verifyAccessToken } from "../utils/tokens.js";

let ioInstance = null;
const messages = new Map();

const getRoomKey = (meetingId) => `meeting:${meetingId}`;
const serializeSocketParticipant = (socket) => ({
    socketId: socket.id,
    userId: socket.data.user._id.toString(),
    username: socket.data.user.username,
    name: socket.data.user.name
});

const getActiveParticipants = (meeting) => {
    return meeting.participants.filter((participant) => !participant.leftAt && !participant.removedAt);
};

const serializeMeetingRealtimeState = (meeting) => ({
    meetingId: meeting.meetingId,
    status: meeting.status,
    settings: meeting.settings,
    summary: meeting.summary || null,
    participants: getActiveParticipants(meeting).map((participant) => ({
        userId: participant.userId,
        username: participant.username,
        role: participant.role,
        joinedAt: participant.joinedAt
    }))
});

const getMeetingRealtimeState = async (meetingId) => {
    const meeting = await Meeting.findOne({ meetingId });

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

const getSocketParticipantIds = async (meetingId) => {
    const sockets = await getSocketsForMeeting(meetingId);
    return sockets.map((socket) => socket.id);
};

const getSocketParticipants = async (meetingId) => {
    const sockets = await getSocketsForMeeting(meetingId);
    return sockets.map(serializeSocketParticipant);
};

const ensureSocketCanAccessMeeting = async (socket, meetingId) => {
    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting || meeting.status !== "active") {
        throw new Error("Meeting is unavailable");
    }

    const participant = meeting.participants.find(
        (entry) => entry.userId.toString() === socket.data.user._id.toString() && !entry.leftAt && !entry.removedAt
    );

    if (!participant) {
        throw new Error("User is not an active participant");
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
    const targetSockets = sockets.filter((socket) => socket.data.user._id.toString() === participantUserId.toString());

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

const connectToSocket = (server) => {
    const NODE_ENV = process.env.NODE_ENV || "development";
    const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

    const corsOptions = {
        origin: NODE_ENV === "production"
            ? CORS_ORIGIN
            : [
                "http://localhost:3000",
                "http://localhost:3100",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3100",
                "http://127.0.0.1:5173"
            ],
        methods: ["GET", "POST", "PATCH"],
        allowedHeaders: ["Authorization", "X-Forwarded-For"],
        credentials: true
    };

    ioInstance = new Server(server, {
        cors: corsOptions,
        secure: NODE_ENV === "production",
        transports: ["websocket", "polling"]
    });

    ioInstance.use(async (socket, next) => {
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
            next();
        } catch (error) {
            logger.warn("Socket authentication failed", {
                error: error.message
            });
            next(new Error("Socket authentication failed"));
        }
    });

    ioInstance.on("connection", (socket) => {
        logger.info("Socket connected", {
            socketId: socket.id,
            userId: socket.data.user._id.toString()
        });

        socket.on("join-call", async (meetingId) => {
            try {
                const { meeting } = await ensureSocketCanAccessMeeting(socket, meetingId);
                const roomKey = getRoomKey(meetingId);

                const roomSockets = await getSocketsForMeeting(meetingId);
                const existingSocket = roomSockets.find(
                    (roomSocket) => roomSocket.data.user?._id?.toString() === socket.data.user._id.toString() && roomSocket.id !== socket.id
                );

                if (existingSocket) {
                    existingSocket.emit("meeting:error", {
                        message: "You are now connected from another tab. This connection will be terminated."
                    });
                    existingSocket.disconnect(true);
                }

                socket.join(roomKey);
                socket.data.meetingId = meetingId;

                const participantIds = await getSocketParticipantIds(meetingId);
                const socketParticipants = await getSocketParticipants(meetingId);
                const roomMessages = messages.get(meetingId) || [];

                socket.emit("meeting:joined", {
                    meeting: serializeMeetingRealtimeState(meeting),
                    socketId: socket.id,
                    participants: participantIds,
                    socketParticipants
                });

                roomMessages.forEach((entry) => {
                    socket.emit("chat-message", entry.data, entry.sender, entry.socketIdSender);
                });

                socket.to(roomKey).emit("user-joined", socket.id, participantIds, socketParticipants);
                await emitMeetingParticipantsUpdated(meetingId);
            } catch (error) {
                socket.emit("meeting:error", {
                    message: error.message
                });
            }
        });

        socket.on("signal", (toId, message) => {
            ioInstance.to(toId).emit("signal", socket.id, message);
        });

        socket.on("chat-message", (data, sender) => {
            const meetingId = socket.data.meetingId;

            if (!meetingId) {
                return;
            }

            const roomMessages = messages.get(meetingId) || [];
            const entry = {
                sender,
                data,
                socketIdSender: socket.id
            };

            roomMessages.push(entry);
            messages.set(meetingId, roomMessages);

            addMeetingChatMessage({
                meetingId,
                userId: socket.data.user._id,
                username: sender || socket.data.user.username,
                content: data
            }).catch((error) => {
                logger.warn("Failed to persist meeting chat message", {
                    error: error.message,
                    meetingId
                });
            });

            ioInstance.to(getRoomKey(meetingId)).emit("chat-message", data, sender, socket.id);
        });

        socket.on("disconnect", async () => {
            const meetingId = socket.data.meetingId;

            if (meetingId && socket.data.user) {
                try {
                    await markParticipantDisconnected({
                        meetingId,
                        user: socket.data.user
                    });
                } catch (error) {
                    logger.warn("Error handling disconnect cleanup", {
                        error: error.message,
                        meetingId,
                        userId: socket.data.user._id?.toString()
                    });
                }

                socket.to(getRoomKey(meetingId)).emit("user-left", socket.id);
                await emitMeetingParticipantsUpdated(meetingId);
            }

            logger.info("Socket disconnected", {
                socketId: socket.id,
                userId: socket.data.user?._id?.toString()
            });
        });
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
