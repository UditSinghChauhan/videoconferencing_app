/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The landing page's largest paint is the serif headline. Preload the three
 * Latin font files above the fold (Geist, and Instrument Serif upright and
 * italic) so the browser fetches them with the HTML instead of after the CSS.
 */
function preloadFonts(): Plugin {
    const wanted = [/geist-latin-wght-normal-.*\.woff2$/, /instrument-serif-latin-400-normal-.*\.woff2$/, /instrument-serif-latin-400-italic-.*\.woff2$/];
    return {
        name: "preload-fonts",
        apply: "build",
        transformIndexHtml: {
            order: "post",
            handler(_html, context) {
                const files = Object.keys(context.bundle ?? {});
                return wanted
                    .map((pattern) => files.find((file) => pattern.test(file)))
                    .filter((file): file is string => Boolean(file))
                    .map((file) => ({ tag: "link", attrs: { rel: "preload", href: `/${file}`, as: "font", type: "font/woff2", crossorigin: "" }, injectTo: "head" as const }));
            }
        }
    };
}

export default defineConfig({
    plugins: [react(), preloadFonts()],
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
