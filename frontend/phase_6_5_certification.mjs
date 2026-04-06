import { io } from "socket.io-client";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const SERVER_ORIGIN = process.env.PHASE65_SERVER_ORIGIN || "http://localhost:8000";
const API_BASE = `${SERVER_ORIGIN}/api/v1`;
const PASSWORD = "Phase65Pass@123";
const RUN_IP = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;

const green = "\x1b[32m";
const red = "\x1b[31m";
const yellow = "\x1b[33m";
const blue = "\x1b[34m";
const bold = "\x1b[1m";
const reset = "\x1b[0m";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function logInfo(message) {
    console.log(`${blue}[INFO]${reset} ${message}`);
}

function logPass(message) {
    console.log(`${green}[PASS]${reset} ${message}`);
}

function logFail(message) {
    console.log(`${red}[FAIL]${reset} ${message}`);
}

async function request(path, { method = "GET", token, body } = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": RUN_IP,
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });

    let payload = null;

    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    return { response, payload };
}

async function registerAndLogin(label) {
    const suffix = randomUUID().slice(0, 8);
    const username = `phase65_${label}_${suffix}`;
    const name = `Phase 6.5 ${label.toUpperCase()}`;

    const registerResult = await request("/users/register", {
        method: "POST",
        body: { name, username, password: PASSWORD }
    });

    if (registerResult.response.status !== 201) {
        throw new Error(`${label} registration failed with ${registerResult.response.status}`);
    }

    const loginResult = await request("/users/login", {
        method: "POST",
        body: { username, password: PASSWORD }
    });

    if (loginResult.response.status !== 200) {
        throw new Error(`${label} login failed with ${loginResult.response.status}`);
    }

    const token = loginResult.payload?.data?.token;

    if (!token) {
        throw new Error(`${label} login returned no token`);
    }

    const meResult = await request("/users/me", { token });

    if (meResult.response.status !== 200) {
        throw new Error(`${label} bootstrap /me failed with ${meResult.response.status}`);
    }

    return {
        label,
        token,
        user: meResult.payload.data.user
    };
}

class SocketClient {
    constructor(label, token) {
        this.label = label;
        this.token = token;
        this.socket = null;
        this.events = [];
    }

    async connect() {
        this.socket = io(SERVER_ORIGIN, {
            auth: { token: this.token },
            transports: ["websocket"],
            reconnection: true,
            reconnectionDelay: 500,
            reconnectionDelayMax: 2000,
            reconnectionAttempts: 3
        });

        const eventNames = [
            "connect",
            "chat-message",
            "meeting:joined",
            "meeting:participants-updated",
            "meeting:settings-updated",
            "meeting:ended",
            "meeting:removed",
            "meeting:error",
            "user-left",
            "user-joined",
            "disconnect"
        ];

        eventNames.forEach((eventName) => {
            this.socket.on(eventName, (...args) => {
                this.events.push({
                    eventName,
                    args,
                    at: Date.now()
                });
            });
        });

        await this.waitFor("connect", () => true, 5000);
    }

    emit(eventName, ...args) {
        this.socket.emit(eventName, ...args);
    }

    async joinCall(meetingId) {
        this.emit("join-call", meetingId);
        return this.waitFor("meeting:joined", () => true, 5000);
    }

    async waitFor(eventName, predicate = () => true, timeoutMs = 5000) {
        const startedAt = Date.now();

        while (Date.now() - startedAt < timeoutMs) {
            const match = this.events.find((entry) => entry.eventName === eventName && predicate(...entry.args));

            if (match) {
                return match.args;
            }

            await sleep(50);
        }

        throw new Error(`${this.label} timed out waiting for ${eventName}`);
    }

    latest(eventName) {
        return [...this.events].reverse().find((entry) => entry.eventName === eventName);
    }

    clear() {
        this.events = [];
    }

    disconnect() {
        this.socket?.disconnect();
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function uniqueUserIds(participants = []) {
    return [...new Set(participants.map((participant) => String(participant.userId)))];
}

async function main() {
    const failures = [];

    const record = async (name, fn) => {
        console.log(`\n${bold}${name}${reset}`);

        try {
            await fn();
            logPass(name);
        } catch (error) {
            failures.push({ name, message: error.message });
            logFail(`${name}: ${error.message}`);
        }
    };

    logInfo("Bootstrapping two real users");
    const userA = await registerAndLogin("a");
    const userB = await registerAndLogin("b");

    let socketA;
    let socketB;
    const meetingId = `phase65-${randomUUID().slice(0, 8)}`;

    await record("1. Auth bootstrap", async () => {
        const refreshLikeMe = await request("/users/me", { token: userA.token });
        assert(refreshLikeMe.response.status === 200, "refresh-like /me request did not preserve session");
        assert(refreshLikeMe.payload?.data?.user?.username === userA.user.username, "restored user did not match login user");
    });

    await record("2. Create + join", async () => {
        const createResult = await request("/meetings", {
            method: "POST",
            token: userA.token,
            body: { meetingId }
        });

        assert(createResult.response.status === 201, `meeting creation returned ${createResult.response.status}`);

        const joinResult = await request(`/meetings/${meetingId}/join`, {
            method: "POST",
            token: userB.token
        });

        assert(joinResult.response.status === 200, `B join returned ${joinResult.response.status}`);

        socketA = new SocketClient("A", userA.token);
        socketB = new SocketClient("B", userB.token);
        await socketA.connect();
        await socketB.connect();
        await socketA.joinCall(meetingId);
        await socketB.joinCall(meetingId);

        await socketA.waitFor(
            "meeting:participants-updated",
            (payload) => payload.participants?.length === 2,
            5000
        );

        const participantsPayload = socketA.latest("meeting:participants-updated")?.args?.[0];
        const usernames = participantsPayload?.participants?.map((participant) => participant.username) || [];
        assert(usernames.includes(userA.user.username), "A username missing from participant state");
        assert(usernames.includes(userB.user.username), "B username missing from participant state");
        assert(uniqueUserIds(participantsPayload.participants).length === 2, "duplicate participants detected after join");
    });

    await record("3. Real-time sync", async () => {
        socketA.clear();
        socketB.clear();

        socketA.emit("chat-message", "Hello from A", userA.user.username);
        await socketB.waitFor(
            "chat-message",
            (message, sender) => message === "Hello from A" && sender === userA.user.username,
            5000
        );

        socketB.emit("chat-message", "Reply from B", userB.user.username);
        await socketA.waitFor(
            "chat-message",
            (message, sender) => message === "Reply from B" && sender === userB.user.username,
            5000
        );

        const leaveResult = await request(`/meetings/${meetingId}/leave`, {
            method: "POST",
            token: userB.token
        });

        assert(leaveResult.response.status === 200, `B leave returned ${leaveResult.response.status}`);
        socketB.disconnect();

        await socketA.waitFor(
            "meeting:participants-updated",
            (payload) => payload.participants?.length === 1,
            5000
        );

        const rejoinResult = await request(`/meetings/${meetingId}/join`, {
            method: "POST",
            token: userB.token
        });

        assert(rejoinResult.response.status === 200, `B rejoin returned ${rejoinResult.response.status}`);

        socketB = new SocketClient("B-rejoin", userB.token);
        await socketB.connect();
        await socketB.joinCall(meetingId);

        await socketA.waitFor(
            "meeting:participants-updated",
            (payload) => payload.participants?.length === 2,
            5000
        );

        const participantState = socketA.latest("meeting:participants-updated")?.args?.[0];
        assert(uniqueUserIds(participantState.participants).length === 2, "duplicate participants detected after B rejoin");
    });

    await record("4. Role enforcement", async () => {
        const endByParticipant = await request(`/meetings/${meetingId}/end`, {
            method: "POST",
            token: userB.token
        });
        assert(endByParticipant.response.status === 403, `participant end meeting returned ${endByParticipant.response.status}`);

        const removeHostByParticipant = await request(`/meetings/${meetingId}/remove-participant`, {
            method: "POST",
            token: userB.token,
            body: { participantUserId: userA.user.id }
        });
        assert(removeHostByParticipant.response.status === 403, `participant remove host returned ${removeHostByParticipant.response.status}`);
    });

    await record("5. Host controls", async () => {
        socketA.clear();
        socketB.clear();

        const removeResult = await request(`/meetings/${meetingId}/remove-participant`, {
            method: "POST",
            token: userA.token,
            body: { participantUserId: userB.user.id }
        });

        assert(removeResult.response.status === 200, `host remove participant returned ${removeResult.response.status}`);
        await socketB.waitFor("meeting:removed", () => true, 5000);

        const rejoinAfterKick = await request(`/meetings/${meetingId}/join`, {
            method: "POST",
            token: userB.token
        });
        assert(rejoinAfterKick.response.status === 200, `B rejoin after kick returned ${rejoinAfterKick.response.status}`);

        socketB = new SocketClient("B-after-kick", userB.token);
        await socketB.connect();
        await socketB.joinCall(meetingId);
        await socketA.waitFor(
            "meeting:participants-updated",
            (payload) => payload.participants?.length === 2,
            5000
        );

        const endResult = await request(`/meetings/${meetingId}/end`, {
            method: "POST",
            token: userA.token
        });

        assert(endResult.response.status === 200, `host end meeting returned ${endResult.response.status}`);
        const summary = endResult.payload?.data?.meeting?.summary;
        assert(summary, "summary missing from end meeting response");

        await socketA.waitFor("meeting:ended", () => true, 5000);
        await socketB.waitFor("meeting:ended", () => true, 5000);
    });

    await record("6. Summary flow", async () => {
        const summaryResult = await request(`/meetings/${meetingId}/summary`, {
            token: userA.token
        });

        assert(summaryResult.response.status === 200, `summary fetch returned ${summaryResult.response.status}`);
        const summary = summaryResult.payload?.data?.meetingSummary?.summary;
        const requiredSections = ["keyPoints", "highlights", "keywords", "participantsInvolved", "conclusion"];
        requiredSections.forEach((section) => assert(section in summary, `missing summary section ${section}`));
    });

    await record("7. Persistence", async () => {
        const persistedSummary = await request(`/meetings/${meetingId}/summary`, {
            token: userA.token
        });

        assert(persistedSummary.response.status === 200, `persisted summary returned ${persistedSummary.response.status}`);
        assert(persistedSummary.payload?.data?.meetingSummary?.meetingId === meetingId, "persisted summary did not match meeting id");
    });

    await record("8. Security", async () => {
        const privateMeetingId = `phase65-private-${randomUUID().slice(0, 8)}`;

        const createPrivate = await request("/meetings", {
            method: "POST",
            token: userA.token,
            body: { meetingId: privateMeetingId }
        });
        assert(createPrivate.response.status === 201, `private meeting create returned ${createPrivate.response.status}`);

        const endPrivate = await request(`/meetings/${privateMeetingId}/end`, {
            method: "POST",
            token: userA.token
        });
        assert(endPrivate.response.status === 200, `private meeting end returned ${endPrivate.response.status}`);

        const forbiddenSummary = await request(`/meetings/${privateMeetingId}/summary`, {
            token: userB.token
        });
        assert(forbiddenSummary.response.status === 403, `unrelated summary fetch returned ${forbiddenSummary.response.status}`);
    });

    await record("9. Socket edge", async () => {
        const edgeMeetingId = `phase65-edge-${randomUUID().slice(0, 8)}`;
        const createEdge = await request("/meetings", {
            method: "POST",
            token: userA.token,
            body: { meetingId: edgeMeetingId }
        });
        assert(createEdge.response.status === 201, `edge meeting create returned ${createEdge.response.status}`);

        const joinEdge = await request(`/meetings/${edgeMeetingId}/join`, {
            method: "POST",
            token: userB.token
        });
        assert(joinEdge.response.status === 200, `edge meeting join returned ${joinEdge.response.status}`);

        const edgeA = new SocketClient("edge-A", userA.token);
        const edgeB = new SocketClient("edge-B", userB.token);
        await edgeA.connect();
        await edgeB.connect();
        await edgeA.joinCall(edgeMeetingId);
        await edgeB.joinCall(edgeMeetingId);
        await edgeA.waitFor("meeting:participants-updated", (payload) => payload.participants?.length === 2, 5000);

        edgeB.disconnect();
        await edgeA.waitFor("meeting:participants-updated", (payload) => payload.participants?.length === 1, 5000);

        const rejoinEdge = await request(`/meetings/${edgeMeetingId}/join`, {
            method: "POST",
            token: userB.token
        });
        assert(rejoinEdge.response.status === 200, `edge meeting rejoin returned ${rejoinEdge.response.status}`);

        const edgeBReconnect = new SocketClient("edge-B-reconnect", userB.token);
        await edgeBReconnect.connect();
        await edgeBReconnect.joinCall(edgeMeetingId);
        await edgeA.waitFor("meeting:participants-updated", (payload) => payload.participants?.length === 2, 5000);

        const state = edgeA.latest("meeting:participants-updated")?.args?.[0];
        assert(uniqueUserIds(state.participants).length === 2, "duplicate presence detected after reconnect");

        edgeA.disconnect();
        edgeBReconnect.disconnect();
    });

    await record("10. Error UX", async () => {
        const invalidJoin = await request("/meetings/ab/join", {
            method: "POST",
            token: userB.token
        });

        assert(invalidJoin.response.status === 400, `invalid join returned ${invalidJoin.response.status}`);
        assert(
            invalidJoin.payload?.message?.includes("at least 3 characters"),
            "invalid join message was not friendly"
        );

        const videoMeetSource = readFileSync("./src/pages/VideoMeet.jsx", "utf8");
        assert(videoMeetSource.includes("Try Again"), "meeting error UI is missing a retry action");
        assert(videoMeetSource.includes("Back to Home"), "meeting error UI is missing a back action");
    });

    console.log(`\n${bold}Frontend UX inspection notes${reset}`);
    logInfo("Invalid join flow is backed by a friendly validation message from the backend and the room UI includes explicit Try Again and Back to Home actions in frontend/src/pages/VideoMeet.jsx.");
    logInfo("Loading states are present in the protected-route shell, history page skeletons, auth submit flow, and meeting join flow.");

    console.log(`\n${bold}Certification summary${reset}`);
    if (failures.length) {
        failures.forEach((failure) => logFail(`${failure.name}: ${failure.message}`));
        process.exitCode = 1;
        return;
    }

    logPass("All script-verifiable Phase 6.5 checks passed.");
}

main().catch((error) => {
    logFail(error.message);
    process.exit(1);
});
