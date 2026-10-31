/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BACKEND_URL?: string;
    readonly REACT_APP_BACKEND_URL?: string;
    /** JSON array of RTCIceServer, e.g. to add a TURN server. */
    readonly VITE_ICE_SERVERS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
