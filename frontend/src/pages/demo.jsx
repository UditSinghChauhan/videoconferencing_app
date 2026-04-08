import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const samplePresence = [
    { name: "Aarav", role: "Host", status: "Camera on" },
    { name: "Maya", role: "Participant", status: "Screen sharing" },
    { name: "Jordan", role: "Participant", status: "Chat active" }
];

const sampleMessages = [
    { sender: "Aarav", text: "Welcome to Bridge. This is a public product preview." },
    { sender: "Maya", text: "The real app supports live chat, host controls, and summaries after meetings end." },
    { sender: "Jordan", text: "Create an account when you want full real-time meetings and saved history." }
];

export default function DemoPreviewPage() {
    const navigate = useNavigate();
    const [selectedPanel, setSelectedPanel] = useState("chat");

    // Prevent any accidental navigation away from demo page
    useEffect(() => {
        console.log("Demo page mounted - guest preview interface ready");
        return () => {
            console.log("Demo page unmounted");
        };
    }, []);

    const summaryHighlights = useMemo(() => ([
        "Host-controlled meeting actions with participant removal",
        "Persistent meeting history and summary retrieval",
        "JWT session handling with refresh-token based sign-in persistence"
    ]), []);

    return (
        <div className="pageContainer">
            <div className="topNav">
                <div className="navHeader">
                    <h2 className="brandMark">Bridge</h2>
                    <span className="brandTagline">Interactive product preview</span>
                </div>

                <div className="topNavActions">
                    <button className="ghostAction" onClick={() => navigate("/")}>
                        Back to Landing
                    </button>
                    <button className="buttonGlow" onClick={() => navigate("/auth")}>
                        Create Account
                    </button>
                </div>
            </div>

            <div className="demoHero">
                <section className="dashboardCard">
                    <span className="dashboardEyebrow">No signup required</span>
                    <h1>Explore how Bridge feels before you commit.</h1>
                    <p>
                        This public demo is a guided preview of the meeting experience. The live production room flow
                        still requires authentication for access control, summaries, and real-time permissions.
                    </p>

                    <div className="heroActions">
                        <button className="buttonGlow" onClick={() => navigate("/auth")}>
                            Unlock Full Workspace
                        </button>
                        <button className="ghostAction" onClick={() => setSelectedPanel(selectedPanel === "chat" ? "summary" : "chat")}>
                            {selectedPanel === "chat" ? "Preview Summary" : "Preview Chat"}
                        </button>
                    </div>

                    <div className="dashboardPoints">
                        <div className="dashboardPoint">
                            <strong>Guest-safe preview</strong>
                            <span>Anyone can inspect the product flow without being pushed into signup first.</span>
                        </div>
                        <div className="dashboardPoint">
                            <strong>What the real app adds</strong>
                            <span>Authenticated meetings include live sockets, role enforcement, and persistent history.</span>
                        </div>
                        <div className="dashboardPoint">
                            <strong>Clear upgrade path</strong>
                            <span>When you are ready to host or join a real room, your account unlocks the full meeting stack.</span>
                        </div>
                        <div className="dashboardPoint">
                            <strong>Recruiter-friendly story</strong>
                            <span>The preview shows the UX while the signed-in product demonstrates the deeper architecture.</span>
                        </div>
                    </div>
                </section>

                <aside className="demoStage">
                    <div className="demoStageHeader">
                        <div>
                            <span className="heroBadge">Bridge live preview</span>
                            <h2>Room: product-demo</h2>
                        </div>
                        <span className="demoStatus">3 participants</span>
                    </div>

                    <div className="demoVideoGrid">
                        {samplePresence.map((participant) => (
                            <div className="demoVideoCard" key={participant.name}>
                                <div className="demoAvatar">{participant.name.slice(0, 1)}</div>
                                <strong>{participant.name}</strong>
                                <span>{participant.role}</span>
                                <p>{participant.status}</p>
                            </div>
                        ))}
                    </div>

                    <div className="demoPanelTabs">
                        <button
                            type="button"
                            className={selectedPanel === "chat" ? "buttonGlow" : "ghostAction"}
                            onClick={() => setSelectedPanel("chat")}
                        >
                            Team Chat
                        </button>
                        <button
                            type="button"
                            className={selectedPanel === "summary" ? "buttonGlow" : "ghostAction"}
                            onClick={() => setSelectedPanel("summary")}
                        >
                            Meeting Summary
                        </button>
                    </div>

                    {selectedPanel === "chat" ? (
                        <div className="demoPanelCard">
                            {sampleMessages.map((message) => (
                                <div className="demoMessage" key={`${message.sender}-${message.text}`}>
                                    <strong>{message.sender}</strong>
                                    <p>{message.text}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="demoPanelCard">
                            <div className="summaryBlock">
                                <strong className="summarySectionTitle">Highlights</strong>
                                <ul className="summaryList">
                                    {summaryHighlights.map((highlight) => (
                                        <li key={highlight}>{highlight}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="summaryBlock">
                                <strong className="summarySectionTitle">Conclusion</strong>
                                <p className="summaryParagraph">
                                    Bridge is designed for focused real-time collaboration, with authenticated meeting control
                                    and persistent summaries once a session ends.
                                </p>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
