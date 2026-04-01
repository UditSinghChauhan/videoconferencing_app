import React, { useContext, useState } from "react";
import withAuth from "../utils/withAuth";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { Button, TextField } from "@mui/material";
import { AuthContext } from "../contexts/AuthContext";

function HomeComponent() {
    const navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const { addToUserHistory, logout } = useContext(AuthContext);

    const handleJoinVideoCall = async () => {
        const trimmedMeetingCode = meetingCode.trim();

        if (!trimmedMeetingCode) {
            setErrorMessage("Enter a valid meeting code to continue.");
            return;
        }

        try {
            await addToUserHistory(trimmedMeetingCode);
            navigate(`/room/${trimmedMeetingCode}`);
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Unable to join the room right now. Please try again.");
        }
    };

    return (
        <div className="pageContainer">
            <div className="topNav">
                <div className="navHeader">
                    <h2 className="brandMark">Bridge</h2>
                    <span className="brandTagline">Meeting dashboard</span>
                </div>

                <div className="topNavActions">
                    <button className="historyAction ghostAction" onClick={() => navigate("/history")}>
                        View History
                    </button>
                    <button className="ghostAction" onClick={logout}>
                        Log Out
                    </button>
                </div>
            </div>

            <div className="dashboardPanel">
                <section className="dashboardCard">
                    <span className="dashboardEyebrow">Ready to collaborate</span>
                    <h1>Start a professional meeting in seconds.</h1>
                    <p>
                        Use a room code to launch a quick team sync, project discussion, or one-on-one call. Your recent
                        sessions are automatically saved so you can revisit them from the history page.
                    </p>

                    <div className="meetingForm">
                        <TextField
                            className="meetingInput"
                            onChange={(event) => {
                                setMeetingCode(event.target.value);
                                setErrorMessage("");
                            }}
                            value={meetingCode}
                            label="Meeting Code"
                            variant="outlined"
                            placeholder="Enter room code"
                        />
                        <Button className="meetingAction" onClick={handleJoinVideoCall} variant="contained">
                            Join Room
                        </Button>
                    </div>

                    {errorMessage ? <p className="errorText">{errorMessage}</p> : <p className="helperText">Example: `frontend-sync` or `internship-review`</p>}

                    <div className="dashboardPoints">
                        <div className="dashboardPoint">
                            <strong>Guest-friendly</strong>
                            <span>Participants can join with only a room code and display name.</span>
                        </div>
                        <div className="dashboardPoint">
                            <strong>Reliable controls</strong>
                            <span>Chat, audio, video, and screen sharing are available during sessions.</span>
                        </div>
                        <div className="dashboardPoint">
                            <strong>Persistent history</strong>
                            <span>Authenticated users can revisit previously used room codes from one place.</span>
                        </div>
                        <div className="dashboardPoint">
                            <strong>Clean workflow</strong>
                            <span>Minimal distractions and straightforward controls for faster collaboration.</span>
                        </div>
                    </div>
                </section>

                <aside className="previewCard">
                    <img src="/logo3.png" alt="Bridge dashboard illustration" />
                    <div className="previewMeta">
                        <span>Quick room joins</span>
                        <span>Saved meeting history</span>
                        <span>Live collaboration tools</span>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default withAuth(HomeComponent);
