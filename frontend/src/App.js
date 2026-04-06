import "./App.css";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import LandingPage from "./pages/landing";
import Authentication from "./pages/authentication";
import { AuthProvider } from "./contexts/AuthContext";
import VideoMeetComponent from "./pages/VideoMeet";
import HomeComponent from "./pages/home";
import History from "./pages/history";
import withAuth from "./utils/withAuth";

const ProtectedVideoMeet = withAuth(VideoMeetComponent);

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/auth" element={<Authentication />} />
                    <Route path="/home" element={<HomeComponent />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/room/:roomId" element={<ProtectedVideoMeet />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
