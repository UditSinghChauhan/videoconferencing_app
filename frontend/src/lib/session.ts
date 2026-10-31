/**
 * Access token and CSRF token storage, shared by the HTTP client, the socket
 * layer and the auth provider. The refresh token itself never reaches
 * JavaScript: it lives in an httpOnly cookie scoped to /api/v1/users.
 */
const TOKEN_KEY = "token";
const CSRF_KEY = "csrfToken";

type Listener = () => void;
const expiryListeners = new Set<Listener>();

const read = (key: string): string | null => {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
};

const write = (key: string, value: string | null) => {
    try {
        if (value) {
            window.localStorage.setItem(key, value);
        } else {
            window.localStorage.removeItem(key);
        }
    } catch {
        // Storage can be unavailable (private mode, quota); the in-tab session still works.
    }
};

export const session = {
    TOKEN_KEY,
    CSRF_KEY,
    getToken: () => read(TOKEN_KEY),
    getCsrfToken: () => read(CSRF_KEY),
    set(token: string, csrfToken: string | null) {
        write(TOKEN_KEY, token);
        write(CSRF_KEY, csrfToken);
    },
    clear() {
        write(TOKEN_KEY, null);
        write(CSRF_KEY, null);
    },
    /** Fired when a refresh fails and the user must sign in again. */
    onExpired(listener: Listener) {
        expiryListeners.add(listener);
        return () => {
            expiryListeners.delete(listener);
        };
    },
    notifyExpired() {
        expiryListeners.forEach((listener) => listener());
    }
};
