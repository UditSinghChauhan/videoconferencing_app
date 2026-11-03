// The static host serves files only; it ignores public/_redirects, so a direct
// visit to /demo or /auth returned "Not Found". Copy index.html to every static
// route so those URLs resolve, and to 404.html for hosts that serve one.
// Dynamic routes (/room/:id, /meetings/:id) still need a host rewrite rule:
// /* -> /index.html (Render: Settings -> Redirects/Rewrites).
import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// Keep in sync with the static paths in src/App.tsx.
const STATIC_ROUTES = ["demo", "auth", "home", "history"];
const buildDir = new URL("../build/", import.meta.url).pathname;
const index = join(buildDir, "index.html");

for (const route of STATIC_ROUTES) {
    await mkdir(join(buildDir, route), { recursive: true });
    await copyFile(index, join(buildDir, route, "index.html"));
}
await copyFile(index, join(buildDir, "404.html"));
console.log(`SPA fallback written for /${STATIC_ROUTES.join(", /")} and 404.html`);
