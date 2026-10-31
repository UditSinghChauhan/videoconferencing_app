import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../lib/api";
import { session } from "../lib/session";
import type { User } from "../lib/types";

type AuthStatus = "checking" | "authenticated" | "anonymous";

interface AuthContextValue {
    status: AuthStatus;
    user: User | null;
    signIn: (username: string, password: string) => Promise<void>;
    signUp: (name: string, username: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    signOutEverywhere: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [status, setStatus] = useState<AuthStatus>(() => (session.getToken() ? "checking" : "anonymous"));

    const setAnonymous = useCallback(() => {
        setUser(null);
        setStatus("anonymous");
    }, []);

    const loadCurrentUser = useCallback(async () => {
        try {
            // An expired access token is refreshed transparently by the HTTP client.
            const currentUser = await authApi.me();
            setUser(currentUser);
            setStatus("authenticated");
        } catch {
            session.clear();
            setAnonymous();
        }
    }, [setAnonymous]);

    useEffect(() => {
        if (session.getToken()) {
            void loadCurrentUser();
        }
    }, [loadCurrentUser]);

    useEffect(() => session.onExpired(setAnonymous), [setAnonymous]);

    // Keep tabs in sync: signing out in one tab signs out the others.
    useEffect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.key !== session.TOKEN_KEY) {
                return;
            }

            if (!event.newValue) {
                setAnonymous();
            } else if (!event.oldValue) {
                void loadCurrentUser();
            }
        };

        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [loadCurrentUser, setAnonymous]);

    const signIn = useCallback(async (username: string, password: string) => {
        const signedInUser = await authApi.login(username, password);
        setUser(signedInUser);
        setStatus("authenticated");
    }, []);

    const signUp = useCallback(async (name: string, username: string, password: string) => {
        await authApi.register(name, username, password);
        await signIn(username, password);
    }, [signIn]);

    const signOut = useCallback(async () => {
        try {
            await authApi.logout();
        } catch {
            // The local session is cleared regardless; the server session expires on its own.
        } finally {
            session.clear();
            setAnonymous();
        }
    }, [setAnonymous]);

    const signOutEverywhere = useCallback(async () => {
        try {
            await authApi.logoutAll();
        } finally {
            session.clear();
            setAnonymous();
        }
    }, [setAnonymous]);

    const value = useMemo<AuthContextValue>(
        () => ({ status, user, signIn, signUp, signOut, signOutEverywhere }),
        [signIn, signOut, signOutEverywhere, signUp, status, user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside <AuthProvider>");
    }

    return context;
}
