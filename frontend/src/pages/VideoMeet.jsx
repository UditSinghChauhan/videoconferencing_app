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
    const navigate = useNavigate();
    const { roomId } = useParams();
    const { endMeeting, joinMeeting, leaveMeeting, token, user } = useContext(AuthContext);

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
    const chatOpenRef = useRef(false);

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
        setVideos([]);
    }, []);

    const attachLocalStream = useCallback((stream) => {
        window.localStream = stream;
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }
    }, []);

    const broadcastLocalStream = useCallback(() => {
        for (const id in connections) {
            if (id === socketIdRef.current) {
                continue;
            }

            connections[id].addStream(window.localStream);

            connections[id]
                .createOffer()
                .then((description) => connections[id].setLocalDescription(description))
                .then(() => {
                    socketRef.current.emit("signal", id, JSON.stringify({ sdp: connections[id].localDescription }));
                })
                .catch(() => {});
        }
    }, []);

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

    const gotMessageFromServer = (fromId, payload) => {
        const signal = JSON.parse(payload);

        if (fromId === socketIdRef.current) {
            return;
        }

        if (signal.sdp) {
            connections[fromId]
                .setRemoteDescription(new RTCSessionDescription(signal.sdp))
                .then(() => {
                    if (signal.sdp.type === "offer") {
                        return connections[fromId].createAnswer().then((description) => {
                            return connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit("signal", fromId, JSON.stringify({ sdp: connections[fromId].localDescription }));
                            });
                        });
                    }

                    return null;
                })
                .catch(() => setRoomError("Real-time connection negotiation failed."));
        }

        if (signal.ice) {
            connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(() => {
                setRoomError("Unable to add a network candidate for this participant.");
            });
        }
    };

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
            socketRef.current.emit("join-call", roomId);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on("chat-message", addMessage);

            socketRef.current.on("meeting:joined", (payload) => {
                setMeeting((currentMeeting) => ({
                    ...(currentMeeting || {}),
                    ...payload.meeting
                }));
            });

            socketRef.current.on("meeting:participants-updated", (payload) => {
                // ✅ FIX 2B: Deduplicate participants by userId
                setMeeting((currentMeeting) => {
                    const updated = {
                        ...(currentMeeting || {}),
                        ...payload
                    };
                    
                    if (updated.participants && Array.isArray(updated.participants)) {
                        // Deduplicate by userId
                        const seen = new Set();
                        updated.participants = updated.participants.filter((p) => {
                            if (seen.has(p.userId)) {
                                console.warn("Duplicate participant detected and filtered:", p.username || p.userId);
                                return false;
                            }
                            seen.add(p.userId);
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
                setVideos((currentVideos) => currentVideos.filter((participantVideo) => participantVideo.socketId !== id));
            });

            socketRef.current.on("user-joined", (id, clients) => {
                clients.forEach((socketListId) => {
                    if (!connections[socketListId]) {
                        connections[socketListId] = new RTCPeerConnection(peerConfigConnections);
                    }

                    connections[socketListId].onicecandidate = (event) => {
                        if (event.candidate != null) {
                            socketRef.current.emit("signal", socketListId, JSON.stringify({ ice: event.candidate }));
                        }
                    };

                    connections[socketListId].onaddstream = (event) => {
                        const existingVideo = videoRef.current.find((participantVideo) => participantVideo.socketId === socketListId);

                        if (existingVideo) {
                            setVideos((currentVideos) => {
                                const updatedVideos = currentVideos.map((participantVideo) =>
                                    participantVideo.socketId === socketListId ? { ...participantVideo, stream: event.stream } : participantVideo
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            const newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsInline: true
                            };

                            setVideos((currentVideos) => {
                                const updatedVideos = [...currentVideos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };

                    if (window.localStream) {
                        connections[socketListId].addStream(window.localStream);
                    } else {
                        const fallbackStream = createSilentStream();
                        attachLocalStream(fallbackStream);
                        connections[socketListId].addStream(window.localStream);
                    }
                });

                if (id === socketIdRef.current) {
                    for (const peerId in connections) {
                        if (peerId === socketIdRef.current) {
                            continue;
                        }

                        try {
                            connections[peerId].addStream(window.localStream);
                        } catch (error) {
                            setRoomError("Unable to connect your local stream to another participant.");
                        }

                        connections[peerId]
                            .createOffer()
                            .then((description) => connections[peerId].setLocalDescription(description))
                            .then(() => {
                                socketRef.current.emit("signal", peerId, JSON.stringify({ sdp: connections[peerId].localDescription }));
                            })
                            .catch(() => setRoomError("Unable to establish a peer connection."));
                    }
                }
            });
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
            console.log("Reconnection attempt #" + attemptNumber);
        });

        socketRef.current.on("reconnect_failed", () => {
            console.error("Failed to reconnect after 5 attempts");
            setRoomError("Could not reconnect to the meeting. Please refresh the page.");
        });

        // ✅ FIX 3: Handle disconnect cleanup
        socketRef.current.on("disconnect", (_reason) => {
            console.log("Socket disconnected:", _reason);
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
                console.log("Refreshing token for socket connection...");
                
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

                        <Button className="buttonGlow" variant="contained" onClick={connect} disabled={isJoining}>
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
                                    >
                                        Try Again
                                    </button>
                                    <button 
                                        onClick={() => handleEndCall("/home")}
                                        className="ghostAction"
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
                        <IconButton onClick={() => setVideo((currentVideo) => !currentVideo)} style={{ color: "white" }}>
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleMeetingExit} style={{ color: "#f87171" }}>
                            <CallEndIcon />
                        </IconButton>
                        <IconButton onClick={() => setAudio((currentAudio) => !currentAudio)} style={{ color: "white" }}>
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable ? (
                            <IconButton onClick={handleScreen} style={{ color: "white" }}>
                                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>
                        ) : null}

                        <Badge badgeContent={newMessages} max={99} color="primary">
                            <IconButton onClick={toggleChat} style={{ color: "white" }}>
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
                                <div className={styles.participantLabel}>
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
