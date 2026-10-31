import test from "node:test";
import assert from "node:assert/strict";

import { buildRefreshCookieOptions } from "../src/services/auth.service.js";

test("production refresh cookie works for a cross-site frontend", () => {
    const options = buildRefreshCookieOptions({ NODE_ENV: "production" });

    assert.equal(options.sameSite, "none");
    assert.equal(options.secure, true);
    assert.equal(options.httpOnly, true);
    assert.equal(options.path, "/api/v1/users");
});

test("development refresh cookie stays lax and does not require https", () => {
    const options = buildRefreshCookieOptions({ NODE_ENV: "development" });

    assert.equal(options.sameSite, "lax");
    assert.equal(options.secure, false);
});

test("COOKIE_SAME_SITE overrides the default for same-site deployments", () => {
    assert.equal(buildRefreshCookieOptions({ NODE_ENV: "production", COOKIE_SAME_SITE: "Strict" }).sameSite, "strict");
});

test("an invalid COOKIE_SAME_SITE value falls back to the safe default", () => {
    assert.equal(buildRefreshCookieOptions({ NODE_ENV: "production", COOKIE_SAME_SITE: "bogus" }).sameSite, "none");
});

test("SameSite=None always implies Secure", () => {
    assert.equal(buildRefreshCookieOptions({ NODE_ENV: "development", COOKIE_SAME_SITE: "none" }).secure, true);
});
