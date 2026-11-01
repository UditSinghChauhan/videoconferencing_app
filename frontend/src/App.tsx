import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { FullPageSpinner } from "./components/FullPageSpinner";
import { ToastProvider } from "./components/Toast";
import LandingPage from "./pages/LandingPage";

// Route-level splitting: the landing page ships alone; WebRTC and Socket.IO
// code only loads when someone opens a room or the demo.
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const RecapPage = lazy(() => import("./pages/RecapPage"));
const RoomPage = lazy(() => import("./pages/RoomPage"));
const DemoPage = lazy(() => import("./pages/DemoPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const DesignNotesPage = lazy(() => import("./pages/DesignNotesPage"));
// Development only: the illustrated cast for review and for scripts/render-cast.mjs.
// `import.meta.env.DEV` is false in production builds, so the route and its chunk are dropped.
const CastPage = import.meta.env.DEV ? lazy(() => import("./features/landing/cast/CastPage")) : null;

/** Old links used /history?summary=<id>; keep them working. */
function HistoryRoute() {
    const [params] = useSearchParams();
    const legacySummary = params.get("summary");

    if (legacySummary) {
        return <Navigate to={`/meetings/${encodeURIComponent(legacySummary)}`} replace />;
    }

    return <HistoryPage />;
}

export default function App() {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToastProvider>
                <AuthProvider>
                    <a className="skip-link" href="#main">Skip to content</a>
                    <Suspense fallback={<FullPageSpinner label="Loading" />}>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/demo" element={<DemoPage />} />
                            <Route path="/design-notes" element={<DesignNotesPage />} />
                            <Route path="/auth" element={<AuthPage />} />
                            <Route path="/home" element={<RequireAuth><DashboardPage /></RequireAuth>} />
                            <Route path="/history" element={<RequireAuth><HistoryRoute /></RequireAuth>} />
                            <Route path="/meetings/:meetingId" element={<RequireAuth><RecapPage /></RequireAuth>} />
                            <Route path="/room/:roomId" element={<RequireAuth><RoomPage /></RequireAuth>} />
                            {CastPage ? <Route path="/__cast" element={<CastPage />} /> : null}
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </Suspense>
                </AuthProvider>
            </ToastProvider>
        </BrowserRouter>
    );
}
