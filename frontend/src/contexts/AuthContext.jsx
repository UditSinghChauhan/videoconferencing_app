import axios from "axios";
import httpStatus from "http-status";
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const TOKEN_STORAGE_KEY = "token";
const CSRF_STORAGE_KEY = "csrfToken";

const client = axios.create({
    baseURL: `${server}/api/v1/users`,
    withCredentials: true
});

const meetingClient = axios.create({
    baseURL: `${server}/api/v1/meetings`,
    withCredentials: true
});

const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);
const getStoredCsrfToken = () => localStorage.getItem(CSRF_STORAGE_KEY);

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [token, setToken] = useState(() => getStoredToken());
    const [csrfToken, setCsrfToken] = useState(() => getStoredCsrfToken());
    const [user, setUser] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const refreshPromiseRef = useRef(null);

    const applySession = useCallback((nextToken, nextUser = null, nextCsrfToken = null) => {
        if (nextToken) {
            localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
        } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
        }

        if (nextCsrfToken) {
            localStorage.setItem(CSRF_STORAGE_KEY, nextCsrfToken);
        } else {
            localStorage.removeItem(CSRF_STORAGE_KEY);
        }

        setToken(nextToken);
        setUser(nextUser);
        setCsrfToken(nextCsrfToken);
    }, []);

    const clearSession = useCallback(() => {
        applySession(null, null, null);
    }, [applySession]);

    const redirectToAuth = useCallback(() => {
        navigate("/auth");
    }, [navigate]);

    const fetchCurrentUser = useCallback(async (accessToken) => {
        const request = await client.get("/me", {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        return request.data.data.user;
    }, []);

    const refreshSession = useCallback(async () => {
        if (!refreshPromiseRef.current) {
            refreshPromiseRef.current = client.post("/refresh", null, {
                headers: {
                    "X-CSRF-Token": getStoredCsrfToken() || ""
                }
            }).then((response) => {
                applySession(response.data.data.token, response.data.data.user, response.data.data.csrfToken);
                return response.data.data.token;
            }).catch((error) => {
                clearSession();
                throw error;
            }).finally(() => {
                refreshPromiseRef.current = null;
            });
        }

        return refreshPromiseRef.current;
    }, [applySession, clearSession]);

    const logout = useCallback(async (redirectToLogin = true) => {
        try {
            await client.post("/logout", null, {
                headers: {
                    "X-CSRF-Token": getStoredCsrfToken() || ""
                }
            });
        } catch (error) {
            // Clearing local auth state is still the safest fallback.
        } finally {
            clearSession();

            if (redirectToLogin) {
                redirectToAuth();
            }
        }
    }, [clearSession, redirectToAuth]);

    const logoutAllSessions = useCallback(async () => {
        try {
            await client.post("/logout-all");
        } finally {
            clearSession();
            redirectToAuth();
        }
    }, [clearSession, redirectToAuth]);

    useEffect(() => {
        const requestInterceptor = client.interceptors.request.use((config) => {
            const activeToken = getStoredToken();
            const activeCsrfToken = getStoredCsrfToken();

            if (activeToken) {
                config.headers.Authorization = `Bearer ${activeToken}`;
            }

            if ((config.url?.includes("/refresh") || config.url?.includes("/logout")) && activeCsrfToken) {
                config.headers["X-CSRF-Token"] = activeCsrfToken;
            }

            return config;
        });

        const responseInterceptor = client.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                const status = error?.response?.status;
                const code = error?.response?.data?.error?.code;
                const shouldRefresh = status === httpStatus.UNAUTHORIZED
                    && !originalRequest?._retry
                    && code === "TOKEN_EXPIRED"
                    && !originalRequest?.url?.includes("/refresh")
                    && !originalRequest?.url?.includes("/login")
                    && !originalRequest?.url?.includes("/logout");

                if (!shouldRefresh) {
                    return Promise.reject(error);
                }

                originalRequest._retry = true;

                try {
                    const nextToken = await refreshSession();
                    originalRequest.headers.Authorization = `Bearer ${nextToken}`;
                    return client(originalRequest);
                } catch (refreshError) {
                    return Promise.reject(refreshError);
                }
            }
        );

        return () => {
            client.interceptors.request.eject(requestInterceptor);
            client.interceptors.response.eject(responseInterceptor);
        };
    }, [refreshSession]);

    useEffect(() => {
        const requestInterceptor = meetingClient.interceptors.request.use((config) => {
            const activeToken = getStoredToken();

            if (activeToken) {
                config.headers.Authorization = `Bearer ${activeToken}`;
            }

            return config;
        });

        const responseInterceptor = meetingClient.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                const status = error?.response?.status;
                const code = error?.response?.data?.error?.code;
                const shouldRefresh = status === httpStatus.UNAUTHORIZED
                    && !originalRequest?._retry
                    && code === "TOKEN_EXPIRED";

                if (!shouldRefresh) {
                    return Promise.reject(error);
                }

                originalRequest._retry = true;

                try {
                    const nextToken = await refreshSession();
                    originalRequest.headers.Authorization = `Bearer ${nextToken}`;
                    return meetingClient(originalRequest);
                } catch (refreshError) {
                    return Promise.reject(refreshError);
                }
            }
        );

        return () => {
            meetingClient.interceptors.request.eject(requestInterceptor);
            meetingClient.interceptors.response.eject(responseInterceptor);
        };
    }, [refreshSession]);

    useEffect(() => {
        const bootstrapAuth = async () => {
            const storedToken = getStoredToken();

            if (!storedToken) {
                setIsCheckingAuth(false);
                return;
            }

            try {
                const currentUser = await fetchCurrentUser(storedToken);
                applySession(getStoredToken() || storedToken, currentUser, getStoredCsrfToken());
            } catch (error) {
                const code = error?.response?.data?.error?.code;

                if (code === "TOKEN_EXPIRED") {
                    try {
                        const refreshedToken = await refreshSession();
                        const currentUser = await fetchCurrentUser(refreshedToken);
                        applySession(refreshedToken, currentUser, getStoredCsrfToken());
                    } catch (refreshError) {
                        clearSession();
                    }
                } else {
                    clearSession();
                }
            } finally {
                setIsCheckingAuth(false);
            }
        };

        bootstrapAuth();
    }, [applySession, clearSession, fetchCurrentUser, refreshSession]);

    useEffect(() => {
        const syncAcrossTabs = (event) => {
            if (event.key !== TOKEN_STORAGE_KEY && event.key !== CSRF_STORAGE_KEY) {
                return;
            }

            const nextToken = getStoredToken();
            const nextCsrfToken = getStoredCsrfToken();

            if (!nextToken) {
                setToken(null);
                setUser(null);
                setCsrfToken(null);
                return;
            }

            setToken(nextToken);
            setCsrfToken(nextCsrfToken);
            fetchCurrentUser(nextToken)
                .then((currentUser) => setUser(currentUser))
                .catch(() => {
                    clearSession();
                });
        };

        window.addEventListener("storage", syncAcrossTabs);
        return () => window.removeEventListener("storage", syncAcrossTabs);
    }, [clearSession, fetchCurrentUser]);

    const handleRegister = useCallback(async (name, username, password) => {
        const request = await client.post("/register", {
            name,
            username,
            password
        });

        if (request.status === httpStatus.CREATED) {
            return request.data.message;
        }

        return "Account created successfully.";
    }, []);

    const handleLogin = useCallback(async (username, password) => {
        const request = await client.post("/login", {
            username,
            password
        });

        if (request.status === httpStatus.OK) {
            applySession(request.data.data.token, request.data.data.user, request.data.data.csrfToken);
            navigate("/home");
        }
    }, [applySession, navigate]);

    const getHistoryOfUser = useCallback(async () => {
        try {
            const request = await meetingClient.get("/");
            return request.data.data.meetings || [];
        } catch (error) {
            if (error?.response?.status === httpStatus.UNAUTHORIZED || error?.response?.status === httpStatus.FORBIDDEN) {
                clearSession();
                redirectToAuth();
            }

            throw error;
        }
    }, [clearSession, redirectToAuth]);

    const createMeeting = useCallback(async (meetingId) => {
        try {
            const request = await meetingClient.post("/", {
                meetingId
            });
            return request.data.data.meeting;
        } catch (error) {
            if (error?.response?.status === httpStatus.UNAUTHORIZED || error?.response?.status === httpStatus.FORBIDDEN) {
                clearSession();
                redirectToAuth();
            }

            throw error;
        }
    }, [clearSession, redirectToAuth]);

    const joinMeeting = useCallback(async (meetingId) => {
        try {
            const request = await meetingClient.post(`/${meetingId}/join`);
            return request.data.data.meeting;
        } catch (error) {
            if (error?.response?.status === httpStatus.NOT_FOUND) {
                return createMeeting(meetingId);
            }

            if (error?.response?.status === httpStatus.UNAUTHORIZED || error?.response?.status === httpStatus.FORBIDDEN) {
                clearSession();
                redirectToAuth();
            }

            throw error;
        }
    }, [clearSession, createMeeting, redirectToAuth]);

    const leaveMeeting = useCallback(async (meetingId) => {
        const request = await meetingClient.post(`/${meetingId}/leave`);
        return request.data.data.meeting;
    }, []);

    const endMeeting = useCallback(async (meetingId) => {
        const request = await meetingClient.post(`/${meetingId}/end`);
        return request.data.data.meeting;
    }, []);

    const getMeetingDetails = useCallback(async (meetingId) => {
        const request = await meetingClient.get(`/${meetingId}`);
        return request.data.data.meeting;
    }, []);

    const value = useMemo(() => ({
        createMeeting,
        csrfToken,
        getHistoryOfUser,
        getMeetingDetails,
        handleRegister,
        handleLogin,
        joinMeeting,
        leaveMeeting,
        endMeeting,
        isAuthenticated: Boolean(token && user),
        isCheckingAuth,
        logout,
        logoutAllSessions,
        refreshSession,
        token,
        user
    }), [createMeeting, csrfToken, endMeeting, getHistoryOfUser, getMeetingDetails, handleRegister, handleLogin, isCheckingAuth, joinMeeting, leaveMeeting, logout, logoutAllSessions, refreshSession, token, user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
