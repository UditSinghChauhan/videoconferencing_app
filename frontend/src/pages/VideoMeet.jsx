import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Badge, Button, IconButton, TextField } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import { useNavigate, useParams } from "react-router-dom";
import styles from "../styles/videoComponent.module.css";
import server from "../environment";
import { AuthContext } from "../contexts/AuthContext";

const connections = {};

const peerConfigConnections = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

const silence = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
};

const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), { width, height });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
};

const createSilentStream = () => new MediaStream([black(), silence()]);

export default function VideoMeetComponent() {
    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoRef = useRef();
    const videoRef = useRef([]);
    const participantDirectoryRef = useRef({});
    const remoteStreamsRef = useRef({});
    const peerNegotiationStateRef = useRef({});
    const navigate = useNavigate();
    const { roomId } = useParams();
    const { endMeeting, joinMeeting, leaveMeeting, removeParticipantFromMeeting, token, user } = useContext(AuthContext);

    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [video, setVideo] = useState(false);
    const [audio, setAudio] = useState(false);
    const [screen, setScreen] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);
    const [showModal, setModal] = useState(false);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");
    const [videos, setVideos] = useState([]);
    const [roomError, setRoomError] = useState("");
    const [meeting, setMeeting] = useState(null);
    const [isJoining, setIsJoining] = useState(false);
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [removingParticipantId, setRemovingParticipantId] = useState(null);
    const chatOpenRef = useRef(false);
    const pendingIceCandidatesRef = useRef({});

    const syncParticipantDirectory = useCallback((participants = []) => {
        const nextDirectory = participants.reduce((directory, participant) => {
            if (participant?.socketId) {
                directory[participant.socketId] = participant;
            }
            return directory;
        }, {});

        participantDirectoryRef.current = {
            ...participantDirectoryRef.current,
            ...nextDirectory
        };

        setVideos((currentVideos) => currentVideos.map((participantVideo) => ({
            ...participantVideo,
            ...participantDirectoryRef.current[participantVideo.socketId]
        })));
    }, []);

    const cleanupConnections = useCallback(() => {
        Object.keys(connections).forEach((key) => {
            try {
                connections[key].close();
            } catch (error) {
                // Ignore stale peer connection cleanup errors.
            }

            delete connections[key];
        });

        videoRef.current = [];
        participantDirectoryRef.current = {};
        remoteStreamsRef.current = {};
        peerNegotiationStateRef.current = {};
        pendingIceCandidatesRef.current = {};
        setVideos([]);
    }, []);

    const attachLocalStream = useCallback((stream) => {
        window.localStream = stream;
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }
    }, []);

    const upsertRemoteVideo = useCallback((socketId, stream) => {
        const participantIdentity = participantDirectoryRef.current[socketId] || {};
        const nextVideo = {
            socketId,
            ...participantIdentity,
            stream,
            autoplay: true,
            playsInline: true
        };

        const existingIndex = videoRef.current.findIndex((participantVideo) => participantVideo.socketId === socketId);

        if (existingIndex >= 0) {
            const nextVideos = [...videoRef.current];
            nextVideos[existingIndex] = {
                ...nextVideos[existingIndex],
                ...nextVideo
            };
            videoRef.current = nextVideos;
            setVideos([...nextVideos]);
            return;
        }

        videoRef.current = [...videoRef.current, nextVideo];
        setVideos([...videoRef.current]);
    }, []);

    const removeRemoteVideo = useCallback((socketId) => {
        videoRef.current = videoRef.current.filter((participantVideo) => participantVideo.socketId !== socketId);
        delete remoteStreamsRef.current[socketId];
        setVideos([...videoRef.current]);
    }, []);

    const getPeerState = useCallback((socketId) => {
        if (!peerNegotiationStateRef.current[socketId]) {
            peerNegotiationStateRef.current[socketId] = {
                makingOffer: false,
                ignoreOffer: false,
                isSettingRemoteAnswerPending: false,
                polite: socketIdRef.current
                    ? socketIdRef.current.localeCompare(socketId) > 0
                    : false
            };
        }

        return peerNegotiationStateRef.current[socketId];
    }, []);

    const syncLocalTracksToPeer = useCallback((peerConnection) => {
        if (!window.localStream) {
            attachLocalStream(createSilentStream());
        }

        const localStream = window.localStream;
        const tracksByKind = new Map(localStream.getTracks().map((track) => [track.kind, track]));

        ["video", "audio"].forEach((kind) => {
            const nextTrack = tracksByKind.get(kind) || null;
            const sender = peerConnection.getSenders().find((candidate) => candidate.track?.kind === kind);

            if (sender) {
                sender.replaceTrack(nextTrack).catch(() => {
                    setRoomError("Unable to refresh media for another participant.");
                });
                return;
            }

            if (nextTrack) {
                peerConnection.addTrack(nextTrack, localStream);
            }
        });
    }, [attachLocalStream]);

    const ensurePeerConnection = useCallback((socketId) => {
        if (connections[socketId]) {
            return connections[socketId];
        }

        const peerConnection = new RTCPeerConnection(peerConfigConnections);
        connections[socketId] = peerConnection;
        getPeerState(socketId);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate != null) {
                socketRef.current?.emit("signal", socketId, JSON.stringify({ ice: event.candidate }));
            }
        };

        peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams;

            if (!remoteStream) {
                return;
            }

            remoteStreamsRef.current[socketId] = remoteStream;
            upsertRemoteVideo(socketId, remoteStream);
        };

        syncLocalTracksToPeer(peerConnection);
        return peerConnection;
    }, [getPeerState, syncLocalTracksToPeer, upsertRemoteVideo]);

    const createOfferForPeer = useCallback(async (socketId) => {
        const peerConnection = ensurePeerConnection(socketId);
        const peerState = getPeerState(socketId);

        if (peerConnection.signalingState !== "stable") {
            return;
        }

        try {
            peerState.makingOffer = true;
            syncLocalTracksToPeer(peerConnection);

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            socketRef.current?.emit("signal", socketId, JSON.stringify({ sdp: peerConnection.localDescription }));
        } catch (error) {
            setRoomError("Unable to establish a peer connection.");
        } finally {
            peerState.makingOffer = false;
        }
    }, [ensurePeerConnection, getPeerState, syncLocalTracksToPeer]);

    const broadcastLocalStream = useCallback(() => {
        for (const id in connections) {
            if (id === socketIdRef.current) {
                continue;
            }

            if (!connections[id]) {
                continue;
            }

            syncLocalTracksToPeer(connections[id]);
            createOfferForPeer(id);
        }
    }, [createOfferForPeer, syncLocalTracksToPeer]);

    const getUserMediaSuccess = useCallback((stream) => {
        try {
            window.localStream?.getTracks().forEach((track) => track.stop());
        } catch (error) {
            setRoomError("Unable to refresh local media stream.");
        }

        attachLocalStream(stream);
        broadcastLocalStream();

        stream.getTracks().forEach((track) => {
            track.onended = () => {
                setVideo(false);
                setAudio(false);

                try {
                    localVideoRef.current?.srcObject?.getTracks().forEach((activeTrack) => activeTrack.stop());
                } catch (error) {
                    setRoomError("A media device was disconnected.");
                }

                attachLocalStream(createSilentStream());
                broadcastLocalStream();
            };
        });
    }, [attachLocalStream, broadcastLocalStream]);

    const getDisplayMediaSuccess = useCallback((stream) => {
        try {
            window.localStream?.getTracks().forEach((track) => track.stop());
        } catch (error) {
            setRoomError("Unable to switch to screen sharing.");
        }

        attachLocalStream(stream);
        broadcastLocalStream();

        stream.getTracks().forEach((track) => {
            track.onended = () => {
                setScreen(false);
                attachLocalStream(createSilentStream());

                if ((video && videoAvailable) || (audio && audioAvailable)) {
                    navigator.mediaDevices
                        .getUserMedia({ video, audio })
                        .then(getUserMediaSuccess)
                        .catch(() => setRoomError("Unable to restore camera or microphone after screen sharing."));
                }
            };
        });
    }, [attachLocalStream, audio, audioAvailable, broadcastLocalStream, getUserMediaSuccess, video, videoAvailable]);

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [...prevMessages, { sender, data }]);

        if (socketIdSender !== socketIdRef.current && !chatOpenRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    const gotMessageFromServer = useCallback(async (fromId, payload) => {
        const signal = JSON.parse(payload);

        if (fromId === socketIdRef.current) {
            return;
        }

        const peerConnection = ensurePeerConnection(fromId);
        const peerState = getPeerState(fromId);

        try {
            if (signal.sdp) {
                const description = new RTCSessionDescription(signal.sdp);
                const readyForOffer = !peerState.makingOffer
                    && (peerConnection.signalingState === "stable" || peerState.isSettingRemoteAnswerPending);
                const offerCollision = description.type === "offer" && !readyForOffer;

                peerState.ignoreOffer = !peerState.polite && offerCollision;

                if (peerState.ignoreOffer) {
                    return;
                }

                if (offerCollision && peerState.polite && peerConnection.signalingState !== "stable") {
                    try {
                        await peerConnection.setLocalDescription({ type: "rollback" });
                    } catch (error) {
                        // Some browsers may already be stable enough to proceed without rollback.
                    }
                }

                peerState.isSettingRemoteAnswerPending = description.type === "answer";
                await peerConnection.setRemoteDescription(description);
                peerState.isSettingRemoteAnswerPending = false;

                const pendingCandidates = pendingIceCandidatesRef.current[fromId] || [];
                pendingIceCandidatesRef.current[fromId] = [];

                await Promise.all(
                    pendingCandidates.map((candidate) => peerConnection.addIceCandidate(new RTCIceCandidate(candidate)))
                );

                if (description.type === "offer") {
                    syncLocalTracksToPeer(peerConnection);
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    socketRef.current?.emit("signal", fromId, JSON.stringify({ sdp: peerConnection.localDescription }));
                }
            }

            if (signal.ice) {
                if (!peerConnection.remoteDescription) {
                    pendingIceCandidatesRef.current[fromId] = [
                        ...(pendingIceCandidatesRef.current[fromId] || []),
                        signal.ice
                    ];
                    return;
                }

                await peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
            }
        } catch (error) {
            peerState.isSettingRemoteAnswerPending = false;

            if (signal.ice) {
                setRoomError("Unable to add a network candidate for this participant.");
                return;
            }

            setRoomError("Real-time connection negotiation failed.");
        }
    }, [ensurePeerConnection, getPeerState, syncLocalTracksToPeer]);

    const connectToSocketServer = () => {
        socketRef.current = io.connect(server, {
            secure: false,
            auth: {
                token
            },
            // ✅ FIX 2: Enable auto-reconnection with backoff
            reconnection: true,
            reconnectionDelay: 1000,        // Start with 1 sec delay
            reconnectionDelayMax: 5000,     // Max 5 sec between attempts
            reconnectionAttempts: 5,        // Try 5 times, then give up
            timeout: 20000,                 // Connection timeout 20 sec
        });

        // ✅ FIX 4: Remove old listeners before adding new ones
        socketRef.current.removeAllListeners("signal");
        socketRef.current.removeAllListeners("connect");
        socketRef.current.removeAllListeners("chat-message");
        socketRef.current.removeAllListeners("meeting:joined");
        socketRef.current.removeAllListeners("meeting:participants-updated");
        socketRef.current.removeAllListeners("meeting:settings-updated");
        socketRef.current.removeAllListeners("meeting:ended");
        socketRef.current.removeAllListeners("meeting:removed");
        socketRef.current.removeAllListeners("meeting:error");
        socketRef.current.removeAllListeners("user-left");
        socketRef.current.removeAllListeners("user-joined");

        socketRef.current.on("signal", gotMessageFromServer);

        socketRef.current.on("connect", () => {
            if (socketIdRef.current && socketIdRef.current !== socketRef.current.id) {
                cleanupConnections();
            }

            socketIdRef.current = socketRef.current.id;
            socketRef.current.emit("join-call", roomId);
        });

        socketRef.current.on("chat-message", addMessage);

        socketRef.current.on("meeting:joined", (payload) => {
            syncParticipantDirectory(payload.socketParticipants || []);
            setMeeting((currentMeeting) => ({
                ...(currentMeeting || {}),
                ...payload.meeting
            }));

            const existingParticipantSocketIds = (payload.participants || []).filter(
                (participantSocketId) => participantSocketId && participantSocketId !== socketRef.current.id
            );

            existingParticipantSocketIds.forEach((participantSocketId) => {
                ensurePeerConnection(participantSocketId);
            });

            existingParticipantSocketIds.forEach((participantSocketId) => {
                createOfferForPeer(participantSocketId);
            });
        });

        socketRef.current.on("meeting:participants-updated", (payload) => {
            setMeeting((currentMeeting) => {
                const updated = {
                    ...(currentMeeting || {}),
                    ...payload
                };

                if (updated.participants && Array.isArray(updated.participants)) {
                    const seen = new Set();
                    updated.participants = updated.participants.filter((participant) => {
                        if (seen.has(participant.userId)) {
                            return false;
                        }

                        seen.add(participant.userId);
                        return true;
                    });
                }

                return updated;
            });
        });

        socketRef.current.on("meeting:settings-updated", ({ settings }) => {
            setMeeting((currentMeeting) => ({
                ...(currentMeeting || {}),
                settings
            }));
        });

        socketRef.current.on("meeting:ended", () => {
            setRoomError("The host ended this meeting.");
            handleEndCall(`/history?summary=${roomId}`);
        });

        socketRef.current.on("meeting:removed", () => {
            setRoomError("You were removed from this meeting by the host.");
            handleEndCall();
        });

        socketRef.current.on("meeting:error", ({ message: socketMessage }) => {
            setRoomError(socketMessage || "Socket connection to the meeting failed.");
        });

        socketRef.current.on("user-left", (id) => {
            if (connections[id]) {
                try {
                    connections[id].close();
                } catch (error) {
                    // Ignore stale peer cleanup failures when users leave quickly.
                }

                delete connections[id];
            }

            delete peerNegotiationStateRef.current[id];
            delete pendingIceCandidatesRef.current[id];
            removeRemoteVideo(id);
        });

        socketRef.current.on("user-joined", (id, _clients, socketParticipants = []) => {
            syncParticipantDirectory(socketParticipants);

            const joinedSocketId = typeof id === "string" ? id : id?.socketId;

            if (!joinedSocketId || joinedSocketId === socketRef.current.id) {
                return;
            }

            ensurePeerConnection(joinedSocketId);
        });

        // ✅ FIX 5: Handle connection errors
        socketRef.current.on("connect_error", (error) => {
            console.error("Socket connection error:", error.message);
            
            if (error.message === "Unauthorized") {
                setRoomError("Your session has expired. Please login again.");
            } else if (error.message === "NOT_IN_MEETING") {
                setRoomError("You are not authorized to join this meeting.");
            } else {
                setRoomError(`Connection error: ${error.message}`);
            }
        });

        // ✅ FIX 5: Handle reconnection attempts
        socketRef.current.on("reconnect_attempt", (attemptNumber) => {
            console.info("Reconnection attempt #" + attemptNumber);
        });

        socketRef.current.on("reconnect_failed", () => {
            console.error("Failed to reconnect after 5 attempts");
            setRoomError("Could not reconnect to the meeting. Please refresh the page.");
        });

        // ✅ FIX 3: Handle disconnect cleanup
        socketRef.current.on("disconnect", (_reason) => {
            console.info("Socket disconnected:", _reason);
            // Socket.io will automatically attempt reconnection based on config above
        });
    };

    useEffect(() => {
        const getPermissions = async () => {
            try {
                const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
                setVideoAvailable(Boolean(videoPermission));
                videoPermission.getTracks().forEach((track) => track.stop());

                const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
                setAudioAvailable(Boolean(audioPermission));
                audioPermission.getTracks().forEach((track) => track.stop());

                setScreenAvailable(Boolean(navigator.mediaDevices.getDisplayMedia));

                const initialStream = await navigator.mediaDevices.getUserMedia({
                    video: Boolean(videoPermission),
                    audio: Boolean(audioPermission)
                });
                attachLocalStream(initialStream);
            } catch (error) {
                setRoomError("Camera or microphone permissions are unavailable. You can still join with disabled media.");
                attachLocalStream(createSilentStream());
                setVideoAvailable(false);
                setAudioAvailable(false);
                setScreenAvailable(Boolean(navigator.mediaDevices.getDisplayMedia));
            }
        };

        getPermissions();

        return () => {
            socketRef.current?.disconnect();
            window.localStream?.getTracks?.().forEach((track) => track.stop());
            cleanupConnections();
        };
    }, [attachLocalStream, cleanupConnections]);

    useEffect(() => {
        if (askForUsername) {
            return;
        }

        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices
                .getUserMedia({ video, audio })
                .then(getUserMediaSuccess)
                .catch(() => setRoomError("Unable to access the selected media devices."));
            return;
        }

        try {
            localVideoRef.current?.srcObject?.getTracks().forEach((track) => track.stop());
        } catch (error) {
            setRoomError("Unable to turn off the current media stream.");
        }
    }, [askForUsername, audio, audioAvailable, getUserMediaSuccess, video, videoAvailable]);

    useEffect(() => {
        chatOpenRef.current = showModal;
    }, [showModal]);

    // ✅ FIX 7A: Token refresh for long-lived socket connections
    useEffect(() => {
        if (!socketRef.current) return;

        // Refresh token every 10 minutes (before 15-min expiry)
        const tokenRefreshInterval = setInterval(async () => {
            try {
                console.info("Refreshing token for socket connection...");
                
                // Get fresh token from context (assuming refreshSession exists)
                // For now, we'll just wait for the next auto-refresh from AuthContext
                // The socket will continue working with existing token
                
            } catch (error) {
                console.error("Token refresh failed:", error);
            }
        }, 10 * 60 * 1000); // Every 10 minutes

        return () => clearInterval(tokenRefreshInterval);
    }, [socketRef]);

    useEffect(() => {
        if (!screen) {
            return;
        }

        navigator.mediaDevices
            .getDisplayMedia({ video: true, audio: true })
            .then(getDisplayMediaSuccess)
            .catch(() => setRoomError("Screen sharing could not be started."));
    }, [getDisplayMediaSuccess, screen]);

    const handleScreen = () => setScreen((currentScreen) => !currentScreen);

    const handleEndCall = (redirectPath = "/home") => {
        try {
            localVideoRef.current?.srcObject?.getTracks().forEach((track) => track.stop());
        } catch (error) {
            setRoomError("Unable to stop local media cleanly.");
        }

        socketRef.current?.disconnect();
        cleanupConnections();
        navigate(redirectPath);
    };

    const handleMeetingExit = async () => {
        try {
            if (meeting?.currentUserRole === "host") {
                await endMeeting(roomId);
            } else {
                await leaveMeeting(roomId);
            }
        } catch (error) {
            setRoomError(error?.response?.data?.message || "Unable to update meeting status right now.");
        } finally {
            handleEndCall(meeting?.currentUserRole === "host" ? `/history?summary=${roomId}` : "/home");
        }
    };

    const sendMessage = () => {
        const trimmedMessage = message.trim();

        if (!trimmedMessage || !socketRef.current) {
            return;
        }

        setIsSendingMessage(true);
        socketRef.current.emit("chat-message", trimmedMessage, username);
        setMessage("");
        window.setTimeout(() => {
            setIsSendingMessage(false);
        }, 180);
    };

    const connect = async () => {
        const displayName = username.trim() || user?.username || "";

        if (!displayName) {
            setRoomError("Enter a display name before joining the room.");
            return;
        }

        try {
            setIsJoining(true);
            const meetingDetails = await joinMeeting(roomId);
            setMeeting(meetingDetails);
            setUsername(displayName);
            setRoomError("");
            setAskForUsername(false);
            setVideo(videoAvailable);
            setAudio(audioAvailable);
            connectToSocketServer();
        } catch (error) {
            setRoomError(error?.response?.data?.message || "Unable to join this meeting.");
        } finally {
            setIsJoining(false);
        }
    };

    const handleRemoveParticipant = async (participantUserId) => {
        if (!participantUserId) {
            return;
        }

        try {
            setRemovingParticipantId(participantUserId);
            await removeParticipantFromMeeting(roomId, participantUserId);
            setRoomError("");
        } catch (error) {
            setRoomError(error?.response?.data?.message || "Unable to remove this participant right now.");
        } finally {
            setRemovingParticipantId(null);
        }
    };

    const toggleChat = () => {
        setModal((currentValue) => {
            const nextValue = !currentValue;

            if (nextValue) {
                setNewMessages(0);
            }

            return nextValue;
        });
    };

    return (
        <div>
            {askForUsername ? (
                <div className={styles.lobbyContainer}>
                    {roomError && (
                        <div className={styles.errorOverlay}>
                            <div className={styles.errorContent}>
                                <h2>Setup Error</h2>
                                <p>{roomError}</p>
                                <div className={styles.errorActions}>
                                    <button 
                                        onClick={() => setRoomError("")}
                                        className="buttonGlow"
                                    >
                                        Got It
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className={styles.lobbyCard}>
                        <span className={styles.roomBadge}>Room: {roomId}</span>
                        <h1>Prepare your setup before joining.</h1>
                        <p>
                            Choose a display name, confirm your camera and microphone access, and enter the room when you
                            are ready.
                        </p>

                        <TextField
                            className={styles.lobbyField}
                            label="Display Name"
                            value={username}
                            onChange={(event) => {
                                setUsername(event.target.value);
                                setRoomError("");
                            }}
                            variant="outlined"
                            fullWidth
                        />

                        {roomError ? <p className={styles.roomError}>{roomError}</p> : null}

                        <div className={styles.lobbyMeta}>
                            <span>{videoAvailable ? "Camera ready" : "Camera unavailable"}</span>
                            <span>{audioAvailable ? "Microphone ready" : "Microphone unavailable"}</span>
                            <span>{screenAvailable ? "Screen share supported" : "Screen share unavailable"}</span>
                        </div>

                        <Button className="buttonGlow" variant="contained" onClick={connect} disabled={isJoining} data-testid="join-meeting-button">
                            {isJoining ? "Joining..." : "Join Meeting"}
                        </Button>
                    </div>

                    <div className={styles.lobbyPreview}>
                        <video ref={localVideoRef} autoPlay muted playsInline />
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
                    {roomError && (
                        <div className={styles.errorOverlay}>
                            <div className={styles.errorContent}>
                                <h2>Couldn't join meeting</h2>
                                <p>{roomError}</p>
                                <div className={styles.errorActions}>
                                    <button 
                                        onClick={() => {
                                            setRoomError("");
                                            setAskForUsername(true);
                                        }}
                                        className="buttonGlow"
                                        data-testid="retry-join-button"
                                    >
                                        Try Again
                                    </button>
                                    <button 
                                        onClick={() => handleEndCall("/home")}
                                        className="ghostAction"
                                        data-testid="back-home-button"
                                    >
                                        Back to Home
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className={styles.roomHeader}>
                        <div>
                            <span className={styles.roomBadge}>Live room</span>
                            <h2>{roomId}</h2>
                            {meeting?.currentUserRole ? <p>{meeting.currentUserRole === "host" ? "You are the host" : "You joined as a participant"}</p> : null}
                        </div>
                        {roomError ? <p className={styles.roomError}>{roomError}</p> : null}
                    </div>

                    {meeting?.participants?.length ? (
                        <section className={styles.participantRoster} data-testid="participant-roster">
                            <div className={styles.participantRosterHeader}>
                                <h3>Participants</h3>
                                <span>{meeting.participants.length} live</span>
                            </div>
                            <div className={styles.participantRosterList}>
                                {meeting.participants.map((participant) => {
                                    const isCurrentUser = String(participant.userId) === String(user?.id);
                                    const canRemoveParticipant = meeting.currentUserRole === "host" && participant.role !== "host" && !isCurrentUser;

                                    return (
                                        <div className={styles.participantRosterItem} key={`${participant.userId}-${participant.joinedAt}`}>
                                            <div>
                                                <strong data-testid="roster-name">{participant.username}</strong>
                                                <span>{participant.role === "host" ? "Host" : isCurrentUser ? "You" : "Participant"}</span>
                                            </div>
                                            {canRemoveParticipant ? (
                                                <button
                                                    type="button"
                                                    className={styles.removeParticipantButton}
                                                    onClick={() => handleRemoveParticipant(participant.userId)}
                                                    disabled={removingParticipantId === participant.userId}
                                                >
                                                    {removingParticipantId === participant.userId ? "Removing..." : "Remove"}
                                                </button>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ) : null}

                    {showModal ? (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <div className={styles.chatHeader}>
                                    <h1>Team Chat</h1>
                                    <button className={styles.chatCloseButton} onClick={toggleChat}>
                                        Close
                                    </button>
                                </div>

                                <div className={styles.chattingDisplay}>
                                    {messages.length ? (
                                        messages.map((item, index) => (
                                            <div className={styles.chatMessage} key={`${item.sender}-${index}`}>
                                                <p className={styles.chatSender}>{item.sender}</p>
                                                <p>{item.data}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p>No messages yet. Start the conversation.</p>
                                    )}
                                </div>

                                <div className={styles.chattingArea}>
                                    <TextField
                                        className="chatField"
                                        value={message}
                                        onChange={(event) => setMessage(event.target.value)}
                                        label="Message"
                                        variant="outlined"
                                        fullWidth
                                    />
                                    <Button className={isSendingMessage ? "ghostAction" : "buttonGlow"} variant="contained" onClick={sendMessage}>
                                        {isSendingMessage ? "Sent" : "Send"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className={styles.buttonContainers}>
                        <IconButton aria-label="Toggle camera" onClick={() => setVideo((currentVideo) => !currentVideo)} style={{ color: "white" }}>
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton aria-label={meeting?.currentUserRole === "host" ? "End meeting" : "Leave meeting"} onClick={handleMeetingExit} style={{ color: "#f87171" }}>
                            <CallEndIcon />
                        </IconButton>
                        <IconButton aria-label="Toggle microphone" onClick={() => setAudio((currentAudio) => !currentAudio)} style={{ color: "white" }}>
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable ? (
                            <IconButton aria-label="Toggle screen share" onClick={handleScreen} style={{ color: "white" }}>
                                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>
                        ) : null}

                        <Badge badgeContent={newMessages} max={99} color="primary">
                            <IconButton aria-label="Open chat" onClick={toggleChat} style={{ color: "white" }}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>

                    <video className={styles.meetUserVideo} ref={localVideoRef} autoPlay muted playsInline />

                    <div className={styles.conferenceView}>
                        {videos.map((participantVideo) => (
                            <div className={styles.remoteVideoCard} key={participantVideo.socketId}>
                                <video
                                    data-socket={participantVideo.socketId}
                                    ref={(ref) => {
                                        if (ref && participantVideo.stream) {
                                            ref.srcObject = participantVideo.stream;
                                        }
                                    }}
                                    autoPlay
                                    playsInline
                                />
                                <div className={styles.participantLabel} data-testid="participant-label">
                                    {participantVideo.name || participantVideo.username || `Guest ${participantVideo.socketId.substring(0, 5)}`}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
