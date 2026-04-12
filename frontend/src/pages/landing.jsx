import React from "react";
import "../App.css";
import { Link, useNavigate } from "react-router-dom";

export default function LandingPage() {
    const navigate = useNavigate();

    const handleDemoJoin = () => {
        navigate("/demo");
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
                            Try Demo
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
                        <span className="heroBadge">Built for focused conversations and fast collaboration</span>
                        <h1>
                            Professional video meetings. Real‑time collaboration.
                        </h1>
                        <p>
                            Bridge makes it easy to host focused video meetings. Create a room, share the code, and start
                            talking. Everything you need for quick conversations—no complex setup.
                        </p>

                        <div className="heroActions">
                            <Link className="primaryAction" to="/auth">
                                Launch Workspace
                            </Link>
                            <button className="secondaryAction" onClick={handleDemoJoin}>
                                Open Public Demo
                            </button>
                        </div>

                        <div className="heroHighlights">
                            <div className="heroHighlight">
                                <strong>Real-time video</strong>
                                <span>Peer-to-peer calling with chat, screen sharing, and room-based collaboration.</span>
                            </div>
                            <div className="heroHighlight">
                                <strong>Your meeting history</strong>
                                <span>Find past meetings and jump back in. Everything's saved automatically.</span>
                            </div>
                            <div className="heroHighlight">
                                <strong>Production-ready architecture</strong>
                                <span>Built with WebRTC peer connections, Socket.IO signaling, and JWT session management.</span>
                            </div>
                        </div>
                    </section>

                    <aside className="heroVisual">
                        <div className="heroCard">
                            <img className="heroPreviewImage" src="/mobile.png" alt="Bridge application preview" />
                            <div className="heroMetricRow">
                                <div className="heroMetric">
                                    <strong>Instant join</strong>
                                    <span>No waiting room. You're live immediately.</span>
                                </div>
                                <div className="heroMetric">
                                    <strong>Everything included</strong>
                                    <span>Video, chat, and screen sharing built-in.</span>
                                </div>
                                <div className="heroMetric">
                                    <strong>Always ready</strong>
                                    <span>Saved history for faster rejoin</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>

                <footer className="landingFooter">
                    <div className="footerContent">
                        <div className="footerBrand">
                            <h3>Bridge</h3>
                            <p>Real-time video collaboration built with React, Node.js, Socket.IO, and WebRTC.</p>
                        </div>

                        <div className="footerLinks">
                            <div className="footerLinkGroup">
                                <strong>Product</strong>
                                <button onClick={handleDemoJoin}>Try Demo</button>
                                <button onClick={() => navigate("/auth")}>Sign In</button>
                                <button onClick={() => navigate("/auth")}>Create Account</button>
                            </div>
                            <div className="footerLinkGroup">
                                <strong>Developer</strong>
                                <a href="https://github.com/UditSinghChauhan/videoconferencing_app" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
                                <a href="https://github.com/UditSinghChauhan" target="_blank" rel="noopener noreferrer">@UditSinghChauhan</a>
                            </div>
                        </div>
                    </div>

                    <div className="footerBottom">
                        <span>© {new Date().getFullYear()} Bridge. Built by Udit Singh Chauhan.</span>
                        <span className="footerTech">React · Node.js · MongoDB · Socket.IO · WebRTC</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}
