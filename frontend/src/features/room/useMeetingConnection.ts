import { useCallback, useEffect, useReducer, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { meetingsApi, refreshSession } from "../../lib/api";
import { API_BASE_URL } from "../../lib/env";
import { session } from "../../lib/session";
import type { ChatMessage, MediaState, MeetingParticipant, MeetingSettings } from "../../lib/types";
import { PeerMesh, resolveIceServers, type OutgoingTracks, type PeerConnectionState } from "./peerMesh";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "ended" | "removed" | "replaced" | "failed";

export interface RemotePeer {
    socketId: string;
    userId: string | null;
    name: string;
    /** Null when the server does not report media state (older API). */
    media: MediaState | null;
    stream: MediaStream | null;
    connection: PeerConnectionState | "new";
    /** True once a live media:state event arrived; directory snapshots must not overwrite it. */
    mediaFromEvent?: boolean;
}

interface SocketParticipant {
    socketId: string;
    userId: string;
    username: string;
    name?: string;
    media?: MediaState;
}

interface RealtimeMeetingState {
    participants?: MeetingParticipant[];
    settings?: MeetingSettings;
}

interface State {
    status: ConnectionStatus;
    failureMessage: string | null;
    selfId: string | null;
    peers: Record<string, RemotePeer>;
    roster: MeetingParticipant[];
    settings: MeetingSettings | null;
    messages: ChatMessage[];
}

type Action =
    | { type: "status"; status: ConnectionStatus; message?: string }
    | { type: "joined"; selfId: string; participants: SocketParticipant[]; meeting: RealtimeMeetingState }
    | { type: "directory"; participants: SocketParticipant[] }
    | { type: "peer-left"; socketId: string }
    | { type: "peer-stream"; socketId: string; stream: MediaStream }
    | { type: "peer-connection"; socketId: string; connection: PeerConnectionState }
    | { type: "peer-media"; socketId: string; media: MediaState }
    | { type: "meeting"; meeting: RealtimeMeetingState }
    | { type: "settings"; settings: MeetingSettings }
    | { type: "message"; message: ChatMessage }
    | { type: "reset-peers" };

const TERMINAL: ConnectionStatus[] = ["ended", "removed", "replaced", "failed"];
const MAX_MESSAGES = 300;

export const initialState: State = {
    status: "connecting",
    failureMessage: null,
    selfId: null,
    peers: {},
    roster: [],
    settings: null,
    messages: []
};

const upsertPeers = (peers: Record<string, RemotePeer>, participants: SocketParticipant[], selfId: string | null) => {
    const next = { ...peers };

    participants.forEach((participant) => {
        if (!participant.socketId || participant.socketId === selfId) {
            return;
        }

        const existing = next[participant.socketId];
        next[participant.socketId] = {
            socketId: participant.socketId,
            userId: participant.userId ?? existing?.userId ?? null,
            name: participant.name || participant.username || existing?.name || "Guest",
            media: existing?.mediaFromEvent ? existing.media : participant.media ?? existing?.media ?? null,
            stream: existing?.stream ?? null,
            connection: existing?.connection ?? "new",
            mediaFromEvent: existing?.mediaFromEvent
        };
    });

    return next;
};

const dedupeRoster = (participants: MeetingParticipant[] = []) => {
    const seen = new Set<string>();
    return participants.filter((participant) => {
        const key = String(participant.userId);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

export function reducer(state: State, action: Action): State {
    if (TERMINAL.includes(state.status) && action.type !== "message") {
        return state;
    }

    switch (action.type) {
        case "status":
            return { ...state, status: action.status, failureMessage: action.message ?? state.failureMessage };
        case "joined":
            return {
                ...state,
                status: "connected",
                selfId: action.selfId,
                peers: upsertPeers({}, action.participants, action.selfId),
                roster: dedupeRoster(action.meeting.participants),
                settings: action.meeting.settings ?? state.settings
            };
        case "directory":
            return { ...state, peers: upsertPeers(state.peers, action.participants, state.selfId) };
        case "peer-left": {
            const { [action.socketId]: _left, ...peers } = state.peers;
            return { ...state, peers };
        }
        case "peer-media": {
            // media:state can overtake the user-joined directory entry for the
            // same socket; keep it on a placeholder until the name arrives.
            const peer = state.peers[action.socketId] ?? {
                socketId: action.socketId,
                userId: null,
                name: "Guest",
                media: null,
                stream: null,
                connection: "new" as const
            };
            return {
                ...state,
                peers: { ...state.peers, [action.socketId]: { ...peer, media: action.media, mediaFromEvent: true } }
            };
        }
        case "peer-stream":
        case "peer-connection": {
            const peer = state.peers[action.socketId];
            if (!peer) return state;
            const patch = action.type === "peer-stream" ? { stream: action.stream } : { connection: action.connection };
            return { ...state, peers: { ...state.peers, [action.socketId]: { ...peer, ...patch } } };
        }
        case "meeting":
            return {
                ...state,
                roster: action.meeting.participants ? dedupeRoster(action.meeting.participants) : state.roster,
                settings: action.meeting.settings ?? state.settings
            };
        case "settings":
            return { ...state, settings: action.settings };
        case "message":
            if (state.messages.some((message) => message.id === action.message.id)) return state;
            return { ...state, messages: [...state.messages, action.message].slice(-MAX_MESSAGES) };
        case "reset-peers":
            return { ...state, peers: {}, selfId: null };
        default:
            return state;
    }
}

interface Options {
    meetingId: string;
    enabled: boolean;
    outgoing: OutgoingTracks;
    media: MediaState;
    onNotice: (message: string) => void;
}

export interface MeetingConnection extends State {
    sendMessage: (text: string) => void;
}

export function useMeetingConnection({ meetingId, enabled, outgoing, media, onNotice }: Options): MeetingConnection {
    const [state, dispatch] = useReducer(reducer, initialState);
    const socketRef = useRef<Socket | null>(null);
    const meshRef = useRef<PeerMesh | null>(null);
    const outgoingRef = useRef(outgoing);
    const mediaRef = useRef(media);
    const onNoticeRef = useRef(onNotice);
    outgoingRef.current = outgoing;
    mediaRef.current = media;
    onNoticeRef.current = onNotice;

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let disposed = false;
        let hasConnectedOnce = false;
        let hasJoined = false;
        let fallbackMessageId = 0;

        const mesh = new PeerMesh({
            iceServers: resolveIceServers(),
            sendSignal: (toId, payload) => socket.emit("signal", toId, payload),
            onRemoteStream: (socketId, stream) => dispatch({ type: "peer-stream", socketId, stream }),
            onConnectionState: (socketId, connection) => dispatch({ type: "peer-connection", socketId, connection }),
            onError: (message, error) => {
                if (import.meta.env.DEV) console.warn(message, error);
            }
        });
        mesh.setLocalTracks(outgoingRef.current);
        meshRef.current = mesh;

        const socket = io(API_BASE_URL, {
            // A function so every reconnection picks up a refreshed token.
            auth: (callback) => callback({ token: session.getToken() }),
            transports: ["websocket", "polling"],
            reconnectionDelay: 1000,
            reconnectionDelayMax: 8000,
            reconnectionAttempts: 8,
            timeout: 20_000
        });
        socketRef.current = socket;

        const terminate = (status: ConnectionStatus, message?: string) => {
            dispatch({ type: "status", status, message });
            socket.io.opts.reconnection = false;
            mesh.closeAll();
        };

        socket.on("connect", async () => {
            if (hasConnectedOnce) {
                // A new socket id means every peer connection is stale, and the
                // server marked us as left when the old socket dropped.
                mesh.closeAll();
                dispatch({ type: "reset-peers" });

                try {
                    await meetingsApi.join(meetingId);
                } catch {
                    terminate("failed", "This meeting is no longer available.");
                    return;
                }
            }

            hasConnectedOnce = true;
            socket.emit("join-call", meetingId);
        });

        socket.on("meeting:joined", (payload: { socketId: string; participants?: string[]; socketParticipants?: SocketParticipant[]; meeting: RealtimeMeetingState }) => {
            hasJoined = true;
            const selfId = payload.socketId || socket.id || "";
            mesh.setSelfId(selfId);
            dispatch({ type: "joined", selfId, participants: payload.socketParticipants ?? [], meeting: payload.meeting });
            socket.emit("media:state", mediaRef.current);

            (payload.participants ?? [])
                .filter((socketId) => socketId && socketId !== selfId)
                .forEach((socketId) => mesh.connectTo(socketId));
        });

        socket.on("user-joined", (_socketId: string, _ids: string[], participants: SocketParticipant[] = []) => {
            dispatch({ type: "directory", participants });
        });

        socket.on("user-left", (socketId: string) => {
            mesh.remove(socketId);
            dispatch({ type: "peer-left", socketId });
        });

        socket.on("signal", (fromId: string, payload: string) => {
            void mesh.handleSignal(fromId, payload);
        });

        socket.on("media:state", ({ socketId, media: peerMedia }: { socketId: string; media: MediaState }) => {
            dispatch({ type: "peer-media", socketId, media: peerMedia });
        });

        socket.on("meeting:participants-updated", (meeting: RealtimeMeetingState) => dispatch({ type: "meeting", meeting }));
        socket.on("meeting:settings-updated", ({ settings }: { settings: MeetingSettings }) => dispatch({ type: "settings", settings }));

        socket.on("chat-message", (text: string, sender: string, senderSocketId: string, meta?: { id: string; sentAt: string }) => {
            fallbackMessageId += 1;
            dispatch({
                type: "message",
                message: {
                    id: meta?.id ?? `local-${fallbackMessageId}`,
                    sender,
                    text,
                    sentAt: meta?.sentAt ?? new Date().toISOString(),
                    isOwn: senderSocketId === socket.id
                }
            });
        });

        socket.on("meeting:ended", () => terminate("ended"));
        socket.on("meeting:removed", () => terminate("removed"));

        socket.on("meeting:error", ({ code, message }: { code?: string; message?: string }) => {
            if (code === "REPLACED_BY_NEW_CONNECTION" || message?.includes("another tab")) {
                terminate("replaced");
            } else if (code === "CHAT_DISABLED") {
                onNoticeRef.current(message ?? "Chat is turned off for this meeting.");
            } else if (!hasJoined) {
                terminate("failed", message);
            } else {
                onNoticeRef.current(message ?? "Something went wrong in this meeting.");
            }
        });

        socket.on("connect_error", async (error: Error) => {
            if (disposed) return;

            if (error.message === "TOKEN_EXPIRED" || error.message === "Socket authentication failed") {
                try {
                    await refreshSession();
                    socket.connect();
                } catch {
                    terminate("failed", "Your session expired. Sign in again to rejoin.");
                }
                return;
            }

            dispatch({ type: "status", status: hasConnectedOnce ? "reconnecting" : "connecting" });
        });

        socket.on("disconnect", (reason) => {
            if (disposed) return;
            if (reason !== "io client disconnect") {
                dispatch({ type: "status", status: "reconnecting" });
            }
        });

        socket.io.on("reconnect_failed", () => terminate("failed", "Lost connection to the meeting."));

        return () => {
            disposed = true;
            socket.removeAllListeners();
            socket.io.removeAllListeners();
            socket.disconnect();
            mesh.closeAll();
            socketRef.current = null;
            meshRef.current = null;
        };
    }, [enabled, meetingId]);

    useEffect(() => {
        meshRef.current?.setLocalTracks(outgoing);
    }, [outgoing]);

    const { audio, video, screen } = media;
    useEffect(() => {
        socketRef.current?.emit("media:state", { audio, video, screen });
    }, [audio, video, screen]);

    const sendMessage = useCallback((text: string) => {
        const trimmed = text.trim();

        if (trimmed && socketRef.current?.connected) {
            socketRef.current.emit("chat-message", trimmed);
        }
    }, []);

    return { ...state, sendMessage };
}
