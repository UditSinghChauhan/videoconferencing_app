import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "@mui/material/Button";
import { AuthContext } from "../contexts/AuthContext";
import withAuth from "../utils/withAuth";
import "../App.css";

function History() {
    const { getHistoryOfUser, getMeetingSummary } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [meetingSummary, setMeetingSummary] = useState(null);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedMeetingId = searchParams.get("summary");

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

    useEffect(() => {
        if (!selectedMeetingId) {
            setMeetingSummary(null);
            return;
        }

        const fetchSummary = async () => {
            setSummaryLoading(true);

            try {
                const summary = await getMeetingSummary(selectedMeetingId);
                setMeetingSummary(summary);
            } catch (error) {
                setErrorMessage(error?.response?.data?.message || "Unable to load meeting summary.");
            } finally {
                setSummaryLoading(false);
            }
        };

        fetchSummary();
    }, [getMeetingSummary, selectedMeetingId]);

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

                {selectedMeetingId ? (
                    <div className="historyCard" style={{ marginBottom: "1rem" }}>
                        <div>
                            <strong>Meeting Summary: {selectedMeetingId}</strong>
                            {summaryLoading ? <p className="historyMeta">Generating summary view...</p> : null}
                        </div>

                        {!summaryLoading && meetingSummary ? (
                            <div style={{ marginTop: "1rem" }}>
                                <p><strong>Key Points:</strong></p>
                                {meetingSummary.summary.keyPoints.length ? (
                                    meetingSummary.summary.keyPoints.map((point, index) => (
                                        <p key={`${point}-${index}`} className="historyMeta">{index + 1}. {point}</p>
                                    ))
                                ) : (
                                    <p className="historyMeta">No key points were captured.</p>
                                )}

                                <p style={{ marginTop: "1rem" }}><strong>Highlights:</strong></p>
                                {meetingSummary.summary.highlights.length ? (
                                    meetingSummary.summary.highlights.map((highlight, index) => (
                                        <p key={`${highlight}-${index}`} className="historyMeta">{index + 1}. {highlight}</p>
                                    ))
                                ) : (
                                    <p className="historyMeta">No major highlights were captured.</p>
                                )}

                                <p style={{ marginTop: "1rem" }}><strong>Participants:</strong> {meetingSummary.summary.participantsInvolved.join(", ") || "No participant activity recorded"}</p>
                                <p><strong>Keywords:</strong> {meetingSummary.summary.keywords.join(", ") || "No dominant keywords"}</p>
                                <p><strong>Conclusion:</strong> {meetingSummary.summary.conclusion || "No conclusion available."}</p>
                            </div>
                        ) : null}

                        <Button variant="outlined" onClick={() => setSearchParams({})}>
                            Hide Summary
                        </Button>
                    </div>
                ) : null}

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
                                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                                    <Button variant="outlined" onClick={() => navigate(`/room/${meeting.meetingId}`)}>
                                        Rejoin Room
                                    </Button>
                                    {meeting.hasSummary ? (
                                        <Button variant="contained" onClick={() => setSearchParams({ summary: meeting.meetingId })}>
                                            View Summary
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default withAuth(History);
