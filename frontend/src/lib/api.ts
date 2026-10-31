import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./env";
import { session } from "./session";
import type { Meeting, MeetingRecap, MeetingSettings, User } from "./types";

interface Envelope<T> {
    success: boolean;
    message: string;
    data: T;
}

interface ErrorEnvelope {
    success: false;
    message: string;
    error?: { code?: string; details?: unknown };
}

interface AuthPayload {
    token: string;
    csrfToken: string;
    user: User;
}

const http = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    withCredentials: true,
    timeout: 20_000
});

const AUTH_ENDPOINTS = ["/users/login", "/users/register", "/users/refresh", "/users/logout"];
const CSRF_ENDPOINTS = ["/users/refresh", "/users/logout"];

http.interceptors.request.use((config) => {
    const token = session.getToken();
    const csrfToken = session.getCsrfToken();

    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (csrfToken && CSRF_ENDPOINTS.some((path) => config.url?.startsWith(path))) {
        config.headers["X-CSRF-Token"] = csrfToken;
    }

    return config;
});

let refreshInFlight: Promise<string> | null = null;

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers
 * share one request, because the server rotates the refresh token and a
 * second parallel refresh would be rejected as a replay.
 */
export const refreshSession = (): Promise<string> => {
    if (!refreshInFlight) {
        refreshInFlight = http
            .post<Envelope<AuthPayload>>("/users/refresh")
            .then(({ data }) => {
                session.set(data.data.token, data.data.csrfToken);
                return data.data.token;
            })
            .catch((error: unknown) => {
                session.clear();
                session.notifyExpired();
                throw error;
            })
            .finally(() => {
                refreshInFlight = null;
            });
    }

    return refreshInFlight;
};

type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

http.interceptors.response.use(undefined, async (error: AxiosError<ErrorEnvelope>) => {
    const config = error.config as RetriableConfig | undefined;
    const isExpired = error.response?.status === 401 && error.response.data?.error?.code === "TOKEN_EXPIRED";
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => config?.url?.startsWith(path));

    if (!config || !isExpired || isAuthEndpoint || config._retried) {
        return Promise.reject(error);
    }

    config._retried = true;
    const token = await refreshSession();
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    return http(config);
});

const unwrap = <T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> => promise.then(({ data }) => data.data);

export const authApi = {
    async login(username: string, password: string): Promise<User> {
        const payload = await unwrap(http.post<Envelope<AuthPayload>>("/users/login", { username, password }));
        session.set(payload.token, payload.csrfToken);
        return payload.user;
    },
    register: (name: string, username: string, password: string) =>
        http.post("/users/register", { name, username, password }).then(() => undefined),
    me: () => unwrap(http.get<Envelope<{ user: User }>>("/users/me")).then((data) => data.user),
    logout: () => http.post("/users/logout").then(() => undefined),
    logoutAll: () => http.post("/users/logout-all").then(() => undefined)
};

const room = (meetingId: string) => `/meetings/${encodeURIComponent(meetingId)}`;

export const meetingsApi = {
    create: (meetingId?: string) =>
        unwrap(http.post<Envelope<{ meeting: Meeting }>>("/meetings", meetingId ? { meetingId } : {})).then((d) => d.meeting),
    join: (meetingId: string) =>
        unwrap(http.post<Envelope<{ meeting: Meeting }>>(`${room(meetingId)}/join`)).then((d) => d.meeting),
    leave: (meetingId: string) =>
        unwrap(http.post<Envelope<{ meeting: Meeting }>>(`${room(meetingId)}/leave`)).then((d) => d.meeting),
    end: (meetingId: string) =>
        unwrap(http.post<Envelope<{ meeting: Meeting }>>(`${room(meetingId)}/end`)).then((d) => d.meeting),
    get: (meetingId: string) =>
        unwrap(http.get<Envelope<{ meeting: Meeting }>>(room(meetingId))).then((d) => d.meeting),
    history: () => unwrap(http.get<Envelope<{ meetings: Meeting[] }>>("/meetings")).then((d) => d.meetings ?? []),
    recap: (meetingId: string) =>
        unwrap(http.get<Envelope<{ meetingSummary: MeetingRecap }>>(`${room(meetingId)}/summary`)).then((d) => d.meetingSummary),
    removeParticipant: (meetingId: string, participantUserId: string) =>
        unwrap(http.post<Envelope<{ meeting: Meeting }>>(`${room(meetingId)}/remove-participant`, { participantUserId }))
            .then((d) => d.meeting),
    updateSettings: (meetingId: string, settings: Partial<MeetingSettings>) =>
        unwrap(http.patch<Envelope<{ meeting: Meeting }>>(`${room(meetingId)}/settings`, settings)).then((d) => d.meeting)
};

export const getErrorCode = (error: unknown): string | null => {
    if (axios.isAxiosError<ErrorEnvelope>(error)) {
        return error.response?.data?.error?.code ?? null;
    }

    return null;
};

export const getErrorStatus = (error: unknown): number | null =>
    axios.isAxiosError(error) ? error.response?.status ?? null : null;

export const isNetworkError = (error: unknown): boolean => axios.isAxiosError(error) && !error.response;

/** A sentence a user can act on, never a raw stack or status code. */
export const getErrorMessage = (error: unknown, fallback: string): string => {
    if (isNetworkError(error)) {
        return "Can't reach Bridge right now. The server may be waking up; try again in a few seconds.";
    }

    if (axios.isAxiosError<ErrorEnvelope>(error)) {
        if (error.response?.status === 429) {
            return "Too many attempts. Wait a minute and try again.";
        }

        return error.response?.data?.message || fallback;
    }

    return fallback;
};
