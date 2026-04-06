import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import { AuthContext } from "../contexts/AuthContext";
import withAuth from "../utils/withAuth";
import "../App.css";

function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch (error) {
                setErrorMessage(error?.response?.data?.message || "Unable to load meeting history.");
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [getHistoryOfUser]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);

        return new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    };

    return (
        <div className="pageContainer">
            <div className="historyShell">
                <div className="historyHeader">
                    <div>
                        <span className="dashboardEyebrow">Meeting archive</span>
                        <h1>Recent room activity</h1>
                        <p>Review previous room codes and jump back into a conversation without hunting through messages.</p>
                    </div>

                    <div className="topNavActions">
                        <button className="ghostAction" onClick={() => navigate("/home")}>
                            Back to Dashboard
                        </button>
                    </div>
                </div>

                {loading ? <p className="historyStatus">Loading meeting history...</p> : null}
                {errorMessage ? <p className="errorText">{errorMessage}</p> : null}

                {!loading && !errorMessage && meetings.length === 0 ? (
                    <div className="emptyState">
                        <h2>No meetings yet</h2>
                        <p>Create or join a room from the dashboard and it will appear here for quick reuse.</p>
                        <Button variant="contained" onClick={() => navigate("/home")}>
                            Go to Dashboard
                        </Button>
                    </div>
                ) : null}

                {!loading && !errorMessage && meetings.length > 0 ? (
                    <div className="historyGrid">
                        {meetings.map((meeting) => (
                            <div key={meeting.id || `${meeting.meetingId}-${meeting.createdAt}`} className="historyCard">
                                <div>
                                    <strong>{meeting.meetingId}</strong>
                                    <p className="historyMeta">{formatDate(meeting.updatedAt || meeting.createdAt)}</p>
                                </div>
                                <Button variant="outlined" onClick={() => navigate(`/room/${meeting.meetingId}`)}>
                                    Rejoin Room
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default withAuth(History);
