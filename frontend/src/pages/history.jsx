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
        const userLocale = navigator.language || "en-US";

        return new Intl.DateTimeFormat(userLocale, {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    };

    const renderSkeletons = () => (
        <div className="loadingCard">
            <div className="loadingHeader">
                <div className="loadingSpinner" />
                <div className="loadingCopy">
                    <div className="skeletonLine short" />
                    <div className="skeletonLine medium" />
                </div>
            </div>
            <div className="skeletonGrid">
                {[0, 1, 2].map((item) => (
                    <div key={item} className="skeletonCard" />
                ))}
            </div>
        </div>
    );

    return (
        <div className="pageContainer">
            <div className="historyShell">
                <div className="historyHeader">
                    <div>
                        <span className="dashboardEyebrow">Your meetings</span>
                        <h1>Your recent meetings</h1>
                        <p>See all your past meetings. Click one to view a summary or rejoin.</p>
                    </div>

                    <div className="topNavActions">
                        <button className="ghostAction" onClick={() => navigate("/home")}>
                            Back to Dashboard
                        </button>
                    </div>
                </div>

                {selectedMeetingId ? (
                    <div className="summaryCard">
                        <div>
                            <strong>Meeting Summary: {selectedMeetingId}</strong>
                            {summaryLoading ? <p className="historyMeta">Generating summary view...</p> : null}
                        </div>

                        {!summaryLoading && meetingSummary ? (
                            <div className="summaryGrid">
                                <div className="summaryBlock">
                                    <span className="summarySectionTitle">Key Points</span>
                                    {meetingSummary.summary.keyPoints.length ? (
                                        <ol className="summaryList">
                                            {meetingSummary.summary.keyPoints.map((point, index) => (
                                                <li key={`${point}-${index}`}>{point}</li>
                                            ))}
                                        </ol>
                                    ) : (
                                        <p className="summaryParagraph">No key points were captured.</p>
                                    )}
                                </div>

                                <div className="summaryBlock">
                                    <span className="summarySectionTitle">Highlights</span>
                                    {meetingSummary.summary.highlights.length ? (
                                        <ol className="summaryList">
                                            {meetingSummary.summary.highlights.map((highlight, index) => (
                                                <li key={`${highlight}-${index}`}>{highlight}</li>
                                            ))}
                                        </ol>
                                    ) : (
                                        <p className="summaryParagraph">No major highlights were captured.</p>
                                    )}
                                </div>

                                <div className="summaryBlock">
                                    <span className="summarySectionTitle">Participants</span>
                                    <p className="summaryParagraph">{meetingSummary.summary.participantsInvolved.join(", ") || "No participant activity recorded"}</p>
                                </div>

                                <div className="summaryBlock">
                                    <span className="summarySectionTitle">Keywords</span>
                                    <p className="summaryParagraph">{meetingSummary.summary.keywords.join(", ") || "No dominant keywords"}</p>
                                </div>

                                <div className="summaryBlock">
                                    <span className="summarySectionTitle">Conclusion</span>
                                    <p className="summaryParagraph">{meetingSummary.summary.conclusion || "No conclusion available."}</p>
                                </div>
                            </div>
                        ) : null}

                        <div className="summaryActions">
                            <Button className="ghostAction" variant="outlined" onClick={() => setSearchParams({})}>
                            Hide Summary
                            </Button>
                        </div>
                    </div>
                ) : null}

                {loading ? renderSkeletons() : null}
                {errorMessage ? <p className="errorText">{errorMessage}</p> : null}

                {!loading && !errorMessage && meetings.length === 0 ? (
                    <div className="emptyHistoryState">
                        <h2>No meetings yet</h2>
                        <p>Start your first meeting to see it appear here.</p>
                        <Button className="buttonGlow" variant="contained" onClick={() => navigate("/home")}>
                            Create Meeting
                        </Button>
                    </div>
                ) : null}

                {!loading && !errorMessage && meetings.length > 0 ? (
                    <div className="historyGrid">
                        {meetings.map((meeting) => (
                            <div key={meeting.id || `${meeting.meetingId}-${meeting.createdAt}`} className="historyCard">
                                <div className="historyCardTop">
                                    <div>
                                        <strong>{meeting.meetingId}</strong>
                                        <p className="historyMeta">{formatDate(meeting.updatedAt || meeting.createdAt)}</p>
                                    </div>
                                    <span className="historyTag">{meeting.hasSummary ? "Summary available" : "Saved"}</span>
                                </div>
                                <div className="historyActions">
                                    <Button className="ghostAction" variant="outlined" onClick={() => navigate(`/room/${meeting.meetingId}`)}>
                                        Rejoin Room
                                    </Button>
                                    {meeting.hasSummary ? (
                                        <Button className="buttonGlow" variant="contained" onClick={() => setSearchParams({ summary: meeting.meetingId })}>
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
