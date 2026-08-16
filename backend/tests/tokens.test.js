import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import {
    decodeToken,
    generateAccessToken,
    generateCsrfToken,
    generateRefreshToken,
    generateSessionId,
    hashToken,
    verifyAccessToken,
    verifyRefreshToken
} from "../src/utils/tokens.js";

const ACCESS_SECRET = "test-access-secret";
const REFRESH_SECRET = "test-refresh-secret";

const withSecrets = (fn) => {
    const previous = {
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN
    };

    process.env.JWT_SECRET = ACCESS_SECRET;
    process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
    delete process.env.JWT_EXPIRES_IN;

    try {
        return fn();
    } finally {
        Object.entries(previous).forEach(([key, value]) => {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        });
    }
};

const testUser = { _id: "user-1", username: "alice" };

test("hashToken produces a deterministic SHA-256 digest", () => {
    const digest = hashToken("refresh-token-value");

    assert.equal(digest, hashToken("refresh-token-value"));
    assert.match(digest, /^[a-f0-9]{64}$/);
});

test("hashToken produces a different digest for a different token", () => {
    assert.notEqual(hashToken("token-a"), hashToken("token-b"));
});

test("hashToken never returns the token it was given", () => {
    const token = "plaintext-refresh-token";

    assert.notEqual(hashToken(token), token);
});

test("generateAccessToken embeds the user, session and access type", () => {
    withSecrets(() => {
        const token = generateAccessToken(testUser, "session-1");
        const payload = verifyAccessToken(token);

        assert.equal(payload.userId, "user-1");
        assert.equal(payload.username, "alice");
        assert.equal(payload.sessionId, "session-1");
        assert.equal(payload.type, "access");
    });
});

test("generateRefreshToken embeds the session and refresh type", () => {
    withSecrets(() => {
        const token = generateRefreshToken(testUser, "session-1");
        const payload = verifyRefreshToken(token);

        assert.equal(payload.userId, "user-1");
        assert.equal(payload.sessionId, "session-1");
        assert.equal(payload.type, "refresh");
    });
});

test("a refresh token is not accepted as an access token", () => {
    withSecrets(() => {
        const refreshToken = generateRefreshToken(testUser, "session-1");

        assert.throws(() => verifyAccessToken(refreshToken), /invalid signature/);
    });
});

test("an access token is not accepted as a refresh token", () => {
    withSecrets(() => {
        const accessToken = generateAccessToken(testUser, "session-1");

        assert.throws(() => verifyRefreshToken(accessToken), /invalid signature/);
    });
});

test("a token signed with an unrelated secret is rejected", () => {
    withSecrets(() => {
        const forged = jwt.sign({ userId: "user-1", type: "access" }, "not-the-secret");

        assert.throws(() => verifyAccessToken(forged), /invalid signature/);
    });
});

test("a tampered token is rejected", () => {
    withSecrets(() => {
        const token = generateAccessToken(testUser, "session-1");
        const tampered = `${token.slice(0, -1)}${token.at(-1) === "A" ? "B" : "A"}`;

        assert.throws(() => verifyAccessToken(tampered));
    });
});

test("access tokens default to a 15 minute lifetime", () => {
    withSecrets(() => {
        const payload = decodeToken(generateAccessToken(testUser, "session-1"));

        assert.equal(payload.exp - payload.iat, 15 * 60);
    });
});

test("token generation throws when the signing secret is not configured", () => {
    const previous = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    try {
        assert.throws(
            () => generateAccessToken(testUser, "session-1"),
            /JWT_SECRET is not defined/
        );
    } finally {
        if (previous === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = previous;
        }
    }
});

test("generateCsrfToken returns 32 random bytes as hex and does not repeat", () => {
    const first = generateCsrfToken();

    assert.match(first, /^[a-f0-9]{64}$/);
    assert.notEqual(first, generateCsrfToken());
});

test("generateSessionId returns a unique identifier per call", () => {
    const first = generateSessionId();

    assert.match(first, /^[a-f0-9-]{36}$/);
    assert.notEqual(first, generateSessionId());
});
