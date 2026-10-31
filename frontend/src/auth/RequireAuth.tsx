import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { FullPageSpinner } from "../components/FullPageSpinner";
import { useAuth } from "./AuthContext";

/** Route guard. Unauthenticated visitors are sent to sign in and brought back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
    const { status } = useAuth();
    const location = useLocation();

    if (status === "checking") {
        return <FullPageSpinner label="Restoring your session" />;
    }

    if (status === "anonymous") {
        const next = `${location.pathname}${location.search}`;
        return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
    }

    return <>{children}</>;
}
