import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, IconButton, TextField } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import VideocamOffOutlinedIcon from "@mui/icons-material/VideocamOffOutlined";
import styles from "../styles/videoComponent.module.css";

const DEMO_ROOM_ID = "product-demo";

const demoParticipants = [
    { userId: "u1", username: "Aarav", role: "participant", joinedAt: "2026-04-08T12:00:00Z" },
    { userId: "u2", username: "Maya", role: "participant", joinedAt: "2026-04-08T12:00:05Z" },
    { userId: "u3", username: "Jordan", role: "participant", joinedAt: "2026-04-08T12:00:10Z" }
];

const demoRemoteVideos = [
    { socketId: "s1", name: "Aarav", username: "Aarav" },
    { socketId: "s2", name: "Maya", username: "Maya" },
    { socketId: "s3", name: "Jordan", username: "Jordan" }
];

const initialMessages = [
    { sender: "Aarav", data: "Hey everyone, glad we could sync up today." },
    { sender: "Maya", data: "Same here — let's run through the sprint updates real quick." },
    { sender: "Jordan", data: "Sounds good. I've got a few things to share on the API work." }
];

const botResponses = [
    "This standup is going smoothly — love the new feature grid.",
    "Should we schedule a follow-up for the API integration?",
    "I'll share my screen in a sec to show the updated dashboard.",
    "Great progress on the sprint. Let's sync again Thursday.",
    "The meeting summary will capture all of our key decisions.",
    "Has everyone reviewed the latest PR? I linked it in Slack.",
    "Nice work shipping that fix before the deadline.",
    "Let me pull up the Figma file — one second.",
    "We should loop in the backend team for the next review.",
    "Looks like we're ahead of schedule. Great work, team.",
    "I'll drop the action items in the channel after this.",
    "Can someone take notes for the folks who couldn't join?"
];

export default function DemoPreviewPage() {
    const navigate = useNavigate();

    // Mirror the real VideoMeet state
    const [video, setVideo] = useState(false);
    const [audio, setAudio] = useState(false);
    const [screen, setScreen] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [messages, setMessages] = useState(initialMessages);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const chatOpenRef = useRef(false);
    const chatEndRef = useRef(null);

    const getRandomResponder = useCallback(() => {
        const responders = ["Aarav", "Maya", "Jordan"];
        return responders[Math.floor(Math.random() * responders.length)];
    }, []);

    const getRandomBotReply = useMemo(() => {
        return () => botResponses[Math.floor(Math.random() * botResponses.length)];
    }, []);

    useEffect(() => {
        chatOpenRef.current = showModal;
    }, [showModal]);

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const toggleChat = useCallback(() => {
        setShowModal((current) => {
            const next = !current;
            if (next) setNewMessages(0);
            return next;
        });
    }, []);

    const sendMessage = useCallback(() => {
        const trimmed = message.trim();
        if (!trimmed) return;

        setIsSendingMessage(true);
        setMessages((prev) => [...prev, { sender: username || "You", data: trimmed }]);
        setMessage("");

        setTimeout(() => setIsSendingMessage(false), 180);

        // Bot reply after a short delay
        setTimeout(() => {
            const reply = getRandomBotReply();
            const responder = getRandomResponder();
            setMessages((prev) => [...prev, { sender: responder, data: reply }]);

            if (!chatOpenRef.current) {
                setNewMessages((prev) => prev + 1);
            }
        }, 1000 + Math.random() * 1000);
    }, [message, username, getRandomBotReply, getRandomResponder]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    const connect = useCallback(() => {
        const displayName = username.trim();
        if (!displayName) return;
        setAskForUsername(false);
    }, [username]);

    const handleEndCall = useCallback(() => {
        navigate("/");
    }, [navigate]);

    // ===== LOBBY (matches real VideoMeet lobby) =====
    if (askForUsername) {
        return (
            <div className={styles.lobbyContainer}>
                <div className={styles.lobbyCard}>
                    <span className={styles.roomBadge}>Room: {DEMO_ROOM_ID}</span>
                    <h1>Prepare your setup before joining.</h1>
                    <p>
                        Enter a display name to join this demo meeting. This is a live preview of the Bridge meeting
                        experience — no account required.
                    </p>

                    <TextField
                        className={styles.lobbyField}
                        label="Display Name"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && username.trim()) connect();
                        }}
                        variant="outlined"
                        fullWidth
                        placeholder="Enter your name"
                    />

                    <div className={styles.lobbyMeta}>
                        <span>Camera off — simulated session</span>
                        <span>Microphone off — simulated session</span>
                        <span>Screen share off — simulated session</span>
                    </div>

                    <Button className="buttonGlow" variant="contained" onClick={connect} disabled={!username.trim()}>
                        Join Meeting
                    </Button>
                </div>

                <div className={styles.lobbyPreview}>
                    {/* Styled camera-off placeholder instead of broken-looking text */}
                    <div style={{
                        width: "100%",
                        height: "100%",
                        minHeight: "488px",
                        borderRadius: "18px",
                        background: "linear-gradient(180deg, #020617 0%, #0a1628 100%)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "1rem"
                    }}>
                        <div style={{
                            width: "80px",
                            height: "80px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, rgba(249,115,22,0.18), rgba(56,189,248,0.12))",
                            border: "1px solid rgba(148,163,184,0.16)",
                            display: "grid",
                            placeItems: "center"
                        }}>
                            <VideocamOffOutlinedIcon style={{ fontSize: "2rem", color: "#475569" }} />
                        </div>
                        <span style={{ color: "#475569", fontSize: "0.88rem", fontWeight: 600 }}>
                            Camera off
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // ===== MEETING ROOM (matches real VideoMeet room exactly) =====
    return (
        <div className={styles.meetVideoContainer}>
            {/* Room header — identical to real */}
            <div className={styles.roomHeader}>
                <div>
                    <span className={styles.roomBadge}>Live room</span>
                    <h2>{DEMO_ROOM_ID}</h2>
                    <p>You are the host</p>
                </div>
            </div>

            {/* Participant roster — identical to real */}
            <section className={styles.participantRoster}>
                <div className={styles.participantRosterHeader}>
                    <h3>Participants</h3>
                    <span>{demoParticipants.length + 1} live</span>
                </div>
                <div className={styles.participantRosterList}>
                    {/* Current user */}
                    <div className={styles.participantRosterItem}>
                        <div>
                            <strong>{username}</strong>
                            <span>Host</span>
                        </div>
                    </div>
                    {/* Other participants — all non-host, with Remove buttons */}
                    {demoParticipants.map((participant) => (
                        <div className={styles.participantRosterItem} key={`${participant.userId}-${participant.joinedAt}`}>
                            <div>
                                <strong>{participant.username}</strong>
                                <span>Participant</span>
                            </div>
                            <button
                                type="button"
                                className={styles.removeParticipantButton}
                                onClick={() => {
                                    // Simulate remove (no-op in demo)
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Chat overlay — identical to real */}
            {showModal && (
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
                            <div ref={chatEndRef} />
                        </div>

                        <div className={styles.chattingArea}>
                            <TextField
                                className="chatField"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={handleKeyPress}
                                label="Message"
                                variant="outlined"
                                fullWidth
                            />
                            <Button
                                className={isSendingMessage ? "ghostAction" : "buttonGlow"}
                                variant="contained"
                                onClick={sendMessage}
                            >
                                {isSendingMessage ? "Sent" : "Send"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Control bar — identical to real (fixed at bottom center) */}
            <div className={styles.buttonContainers}>
                <IconButton aria-label="Toggle camera" onClick={() => setVideo((v) => !v)} style={{ color: "white" }}>
                    {video ? <VideocamIcon /> : <VideocamOffIcon />}
                </IconButton>
                <IconButton aria-label="End meeting" onClick={handleEndCall} style={{ color: "#f87171" }}>
                    <CallEndIcon />
                </IconButton>
                <IconButton aria-label="Toggle microphone" onClick={() => setAudio((a) => !a)} style={{ color: "white" }}>
                    {audio ? <MicIcon /> : <MicOffIcon />}
                </IconButton>
                <IconButton aria-label="Toggle screen share" onClick={() => setScreen((s) => !s)} style={{ color: "white" }}>
                    {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                </IconButton>
                <Badge badgeContent={newMessages} max={99} color="primary">
                    <IconButton aria-label="Open chat" onClick={toggleChat} style={{ color: "white" }}>
                        <ChatIcon />
                    </IconButton>
                </Badge>
            </div>

            {/* Local video (bottom-right) — styled camera-off card */}
            <div className={styles.meetUserVideo} style={{
                background: "linear-gradient(180deg, #020617 0%, #0a1628 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.35rem"
            }}>
                <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #f97316, #38bdf8)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "0.85rem"
                }}>
                    {username ? username.slice(0, 1).toUpperCase() : "?"}
                </div>
                <span style={{ color: "#94a3b8", fontSize: "0.72rem", fontWeight: 600 }}>
                    {username} (You)
                </span>
            </div>

            {/* Conference view — remote participant cards */}
            <div className={styles.conferenceView}>
                {demoRemoteVideos.map((participant) => (
                    <div className={styles.remoteVideoCard} key={participant.socketId}>
                        <div style={{
                            width: "100%",
                            aspectRatio: "16 / 9",
                            borderRadius: "18px",
                            background: "linear-gradient(180deg, #020617 0%, #0a1628 100%)",
                            display: "grid",
                            placeItems: "center"
                        }}>
                            <div style={{
                                width: "56px",
                                height: "56px",
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #f97316, #38bdf8)",
                                display: "grid",
                                placeItems: "center",
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: "1.3rem"
                            }}>
                                {participant.name.slice(0, 1)}
                            </div>
                        </div>
                        <div className={styles.participantLabel}>
                            {participant.name}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
