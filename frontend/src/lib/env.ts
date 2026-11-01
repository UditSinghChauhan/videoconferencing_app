const configured = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;

/** Base URL of the Bridge API, without a trailing slash. */
export const API_BASE_URL = (configured || (import.meta.env.PROD ? window.location.origin : "http://localhost:8000"))
    .replace(/\/+$/, "");

export const REPOSITORY_URL = "https://github.com/UditSinghChauhan/videoconferencing_app";
export const AUTHOR_URL = "https://github.com/UditSinghChauhan";
export const LINKEDIN_URL = "https://www.linkedin.com/in/udit-singh-31382137a/";
/** The designer's portfolio. Empty until it exists: when empty, no portfolio link renders anywhere. */
export const PORTFOLIO_URL = "";
