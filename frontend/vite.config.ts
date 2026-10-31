/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    // REACT_APP_* is still accepted so existing hosting env vars keep working
    // after the move from Create React App.
    envPrefix: ["VITE_", "REACT_APP_"],
    server: {
        port: 3000
    },
    build: {
        // Same output directory as CRA, so the static host's publish path is unchanged.
        outDir: "build",
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ["react", "react-dom", "react-router-dom"],
                    realtime: ["socket.io-client"]
                }
            }
        }
    },
    test: {
        environment: "node",
        include: ["src/**/*.test.ts"]
    }
});
