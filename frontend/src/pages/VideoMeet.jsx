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
    const { endMeeting, joinMeeting, leaveMeeting, user } = useContext(AuthContext);

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
    const chatOpenRef = useRef(false);

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
        socketRef.current = io.connect(server, { secure: false });

        socketRef.current.on("signal", gotMessageFromServer);

        socketRef.current.on("connect", () => {
            socketRef.current.emit("join-call", roomId);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on("chat-message", addMessage);

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
        };
    }, [attachLocalStream]);

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

    const handleEndCall = () => {
        try {
            localVideoRef.current?.srcObject?.getTracks().forEach((track) => track.stop());
        } catch (error) {
            setRoomError("Unable to stop local media cleanly.");
        }

        socketRef.current?.disconnect();
        navigate("/home");
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
            handleEndCall();
        }
    };

    const sendMessage = () => {
        const trimmedMessage = message.trim();

        if (!trimmedMessage || !socketRef.current) {
            return;
        }

        socketRef.current.emit("chat-message", trimmedMessage, username);
        setMessage("");
    };

    const connect = async () => {
        const displayName = username.trim() || user?.username || "";

        if (!displayName) {
            setRoomError("Enter a display name before joining the room.");
            return;
        }

        try {
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
                    <div className={styles.lobbyCard}>
                        <span className={styles.roomBadge}>Room: {roomId}</span>
                        <h1>Prepare your setup before joining.</h1>
                        <p>
                            Choose a display name, confirm your camera and microphone access, and enter the room when you
                            are ready.
                        </p>

                        <TextField
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

                        <Button variant="contained" onClick={connect}>
                            Join Meeting
                        </Button>
                    </div>

                    <div className={styles.lobbyPreview}>
                        <video ref={localVideoRef} autoPlay muted playsInline />
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
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
                                        value={message}
                                        onChange={(event) => setMessage(event.target.value)}
                                        label="Message"
                                        variant="outlined"
                                        fullWidth
                                    />
                                    <Button variant="contained" onClick={sendMessage}>
                                        Send
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
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
