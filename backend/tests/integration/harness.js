import { once } from "node:events";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { io as connectClient } from "socket.io-client";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "integration-access-secret";
process.env.JWT_REFRESH_SECRET = "integration-refresh-secret";
process.env.LOG_LEVEL = "error";

const { createApp } = await import("../../src/createApp.js");

/**
 * Boots the real app on an ephemeral port against an in-memory MongoDB.
 * Returns helpers for creating users and connecting sockets.
 */
const startHarness = async () => {
    const mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    const { app, io, server } = createApp();
    server.listen(0);
    await once(server, "listening");
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const sockets = [];
    let userCounter = 0;

    const createUser = async (name = "Test User") => {
        userCounter += 1;
        const username = `user_${userCounter}_${Date.now().toString(36)}`;
        const password = "Passw0rd!";
        const agent = request.agent(app);

        await agent.post("/api/v1/users/register").send({ name, username, password }).expect(201);
        const login = await agent.post("/api/v1/users/login").send({ username, password }).expect(200);
        const { token, user, csrfToken } = login.body.data;

        return {
            agent,
            csrfToken,
            token,
            user,
            api: (method, path) => agent[method](`/api/v1/meetings${path}`).set("Authorization", `Bearer ${token}`)
        };
    };

    const connectSocket = async (token) => {
        const socket = connectClient(baseUrl, {
            auth: { token },
            transports: ["websocket"],
            reconnection: false,
            forceNew: true
        });
        sockets.push(socket);
        await once(socket, "connect");
        return socket;
    };

    const joinRoom = async (socket, meetingId) => {
        const joined = once(socket, "meeting:joined");
        socket.emit("join-call", meetingId);
        const [payload] = await joined;
        return payload;
    };

    const stop = async () => {
        sockets.forEach((socket) => socket.close());
        io.close();
        await new Promise((resolve) => server.close(() => resolve()));
        await mongoose.disconnect();
        await mongo.stop();
    };

    return { app, baseUrl, connectSocket, createUser, joinRoom, stop };
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolves with the event payload, or with null when nothing arrives in time. */
const nextEvent = (socket, event, timeoutMs = 400) => new Promise((resolve) => {
    const timer = setTimeout(() => {
        socket.off(event, handler);
        resolve(null);
    }, timeoutMs);
    const handler = (...args) => {
        clearTimeout(timer);
        resolve(args);
    };
    socket.once(event, handler);
});

export { nextEvent, startHarness, wait };
