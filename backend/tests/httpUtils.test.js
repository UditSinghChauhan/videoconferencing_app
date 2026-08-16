import test from "node:test";
import assert from "node:assert/strict";

import { AppError } from "../src/utils/appError.js";
import { buildErrorResponse, sendSuccess } from "../src/utils/apiResponse.js";
import { asyncHandler } from "../src/utils/asyncHandler.js";
import { getAllowedOrigins } from "../src/utils/cors.js";

const createResponseRecorder = () => ({
    statusCode: null,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(payload) {
        this.body = payload;
        return this;
    }
});

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

const withNodeEnv = async (value, fn) => {
    const previous = process.env.NODE_ENV;
    const previousCors = process.env.CORS_ORIGIN;
    const previousFrontend = process.env.FRONTEND_URL;

    if (value === undefined) {
        delete process.env.NODE_ENV;
    } else {
        process.env.NODE_ENV = value;
    }

    try {
        return await fn();
    } finally {
        const restore = (key, original) => {
            if (original === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = original;
            }
        };

        restore("NODE_ENV", previous);
        restore("CORS_ORIGIN", previousCors);
        restore("FRONTEND_URL", previousFrontend);
    }
};

test("AppError defaults to an operational 500", () => {
    const error = new AppError("something failed");

    assert.equal(error.statusCode, 500);
    assert.equal(error.code, "INTERNAL_SERVER_ERROR");
    assert.equal(error.isOperational, true);
    assert.equal(error.details, null);
    assert.ok(error instanceof Error);
});

test("AppError carries an explicit status, code and details", () => {
    const error = new AppError("not allowed", {
        statusCode: 403,
        code: "FORBIDDEN",
        details: { reason: "not a host" }
    });

    assert.equal(error.statusCode, 403);
    assert.equal(error.code, "FORBIDDEN");
    assert.deepEqual(error.details, { reason: "not a host" });
});

test("AppError can be marked non-operational", () => {
    const error = new AppError("bug", { isOperational: false });

    assert.equal(error.isOperational, false);
});

test("sendSuccess writes a consistent success envelope", () => {
    const res = createResponseRecorder();

    sendSuccess(res, { statusCode: 201, message: "Created", data: { id: 1 } });

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, { success: true, message: "Created", data: { id: 1 } });
});

test("sendSuccess defaults to status 200 and a null data payload", () => {
    const res = createResponseRecorder();

    sendSuccess(res, { message: "OK" });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data, null);
    assert.equal(res.body.success, true);
});

test("buildErrorResponse never leaks extra fields into the envelope", () => {
    const payload = buildErrorResponse({ message: "Nope", code: "FORBIDDEN" });

    assert.deepEqual(payload, {
        success: false,
        message: "Nope",
        error: { code: "FORBIDDEN", details: null }
    });
});

test("asyncHandler forwards a rejected promise to next", async () => {
    const boom = new Error("boom");
    let forwarded = null;

    asyncHandler(async () => {
        throw boom;
    })({}, {}, (err) => {
        forwarded = err;
    });

    await flushMicrotasks();

    assert.equal(forwarded, boom);
});

test("asyncHandler lets a synchronous throw propagate to Express", async () => {
    // The handler is invoked before Promise.resolve wraps it, so a synchronous
    // throw escapes rather than reaching next(). Express 4 catches synchronous
    // throws in route handlers itself, so this is the intended division of
    // labour: asyncHandler exists specifically to cover rejected promises.
    const boom = new Error("sync boom");
    let forwarded = null;

    assert.throws(
        () => asyncHandler(() => {
            throw boom;
        })({}, {}, (err) => {
            forwarded = err;
        }),
        /sync boom/
    );

    await flushMicrotasks();

    assert.equal(forwarded, null);
});

test("asyncHandler does not call next when the handler resolves", async () => {
    let nextCalled = false;

    asyncHandler(async () => "done")({}, {}, () => {
        nextCalled = true;
    });

    await flushMicrotasks();

    assert.equal(nextCalled, false);
});

test("non-production CORS allows only local development origins", async () => {
    await withNodeEnv("development", () => {
        const origins = getAllowedOrigins();

        assert.ok(origins.includes("http://localhost:3000"));
        assert.ok(origins.includes("http://127.0.0.1:3100"));
        assert.ok(!origins.includes("https://bridgefrontend.onrender.com"));
    });
});

test("production CORS allows the deployed frontend and configured origins", async () => {
    await withNodeEnv("production", () => {
        process.env.CORS_ORIGIN = "https://example.com, https://other.example.com";
        const origins = getAllowedOrigins();

        assert.ok(origins.includes("https://bridgefrontend.onrender.com"));
        assert.ok(origins.includes("https://example.com"));
        assert.ok(origins.includes("https://other.example.com"));
        assert.ok(!origins.includes("http://localhost:3000"), "localhost must not be allowed in production");
    });
});

test("production CORS de-duplicates repeated origins", async () => {
    await withNodeEnv("production", () => {
        process.env.CORS_ORIGIN = "https://example.com";
        process.env.FRONTEND_URL = "https://example.com";
        const origins = getAllowedOrigins();

        assert.equal(origins.filter((origin) => origin === "https://example.com").length, 1);
    });
});
