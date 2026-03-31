import React from "react";
import "../App.css";
import { Link, useNavigate } from "react-router-dom";

const createDemoRoomCode = () => `demo-${Math.random().toString(36).slice(2, 8)}`;

export default function LandingPage() {
    const navigate = useNavigate();

    const handleDemoJoin = () => {
        navigate(`/room/${createDemoRoomCode()}`);
    };

    return (
        <div className="appShell">
            <div className="landingPageContainer">
                <nav>
                    <div className="navHeader">
                        <h2>Bridge</h2>
                        <span className="brandTagline">Professional video collaboration for focused conversations.</span>
                    </div>

                    <div className="navlist">
                        <button className="navButton" onClick={handleDemoJoin}>
                            Try Demo Room
                        </button>
                        <button className="navButton" onClick={() => navigate("/auth")}>
                            Sign In
                        </button>
                        <button className="navButton primary" onClick={() => navigate("/auth")}>
                            Create Account
                        </button>
                    </div>
                </nav>

                <div className="landingMainContainer">
                    <section className="heroSection">
                        <span className="heroBadge">Full-stack WebRTC product showcase</span>
                        <h1>
                            Run fast, reliable meetings without the noise of bloated collaboration tools.
                        </h1>
                        <p>
                            Bridge is a deployed video meeting platform built with React, Node.js, Socket.IO, MongoDB, and
                            WebRTC. It supports authentication, reusable room codes, meeting history, chat, and media
                            controls in a clean interview-ready workflow.
                        </p>

                        <div className="heroActions">
                            <Link className="primaryAction" to="/auth">
                                Launch Workspace
                            </Link>
                            <button className="secondaryAction" onClick={handleDemoJoin}>
                                Join as Guest
                            </button>
                        </div>

                        <div className="heroHighlights">
                            <div className="heroHighlight">
                                <strong>Real-time video</strong>
                                <span>Peer-to-peer calling with chat, screen sharing, and room-based collaboration.</span>
                            </div>
                            <div className="heroHighlight">
                                <strong>Secure account flow</strong>
                                <span>Authenticated users can track their recent sessions and rejoin past rooms quickly.</span>
                            </div>
                            <div className="heroHighlight">
                                <strong>Deployment ready</strong>
                                <span>Production environment support, health checks, and configurable backend endpoints.</span>
                            </div>
                        </div>
                    </section>

                    <aside className="heroVisual">
                        <div className="heroCard">
                            <img className="heroPreviewImage" src="/mobile.png" alt="Bridge application preview" />
                            <div className="heroMetricRow">
                                <div className="heroMetric">
                                    <strong>WebRTC</strong>
                                    <span>Low-latency video sessions</span>
                                </div>
                                <div className="heroMetric">
                                    <strong>Socket.IO</strong>
                                    <span>Live room coordination</span>
                                </div>
                                <div className="heroMetric">
                                    <strong>MERN</strong>
                                    <span>Full-stack architecture</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
