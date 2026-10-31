import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

import { nextEvent, startHarness, wait } from "./harness.js";

let harness;

before(async () => {
    harness = await startHarness();
});

after(async () => {
    await harness.stop();
});

const createMeetingWithGuest = async () => {
    const host = await harness.createUser("Hannah Host");
    const guest = await harness.createUser("Gabe Guest");
    const created = await host.api("post", "/").send({}).expect(201);
    const { meetingId } = created.body.data.meeting;
    await guest.api("post", `/${meetingId}/join`).expect(200);
    return { guest, host, meetingId };
};

describe("meeting lifecycle over REST", () => {
    test("creating a meeting without a code generates a shareable one", async () => {
        const host = await harness.createUser();
        const response = await host.api("post", "/").send({}).expect(201);

        assert.match(response.body.data.meeting.meetingId, /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
        assert.equal(response.body.data.meeting.currentUserRole, "host");
    });

    test("joining an unknown meeting is a 404 rather than an implicit create", async () => {
        const user = await harness.createUser();
        const response = await user.api("post", "/abc-defg-hij/join").expect(404);

        assert.equal(response.body.error.code, "MEETING_NOT_FOUND");
    });

    test("meeting codes with unsafe characters are rejected", async () => {
        const user = await harness.createUser();
        await user.api("post", "/").send({ meetingId: "../../etc" }).expect(400);
    });

    test("participants carry their display name, not only their username", async () => {
        const { host, meetingId } = await createMeetingWithGuest();
        const response = await host.api("get", `/${meetingId}`).expect(200);
        const names = response.body.data.meeting.participants.map((participant) => participant.name).sort();

        assert.deepEqual(names, ["Gabe Guest", "Hannah Host"]);
    });

    test("history reports participant count and duration for ended meetings", async () => {
        const { host, meetingId } = await createMeetingWithGuest();
        await host.api("post", `/${meetingId}/end`).expect(200);

        const response = await host.api("get", "/").expect(200);
        const entry = response.body.data.meetings.find((meeting) => meeting.meetingId === meetingId);

        assert.equal(entry.status, "ended");
        assert.equal(entry.participantCount, 2);
        assert.equal(typeof entry.durationMs, "number");
        assert.ok(entry.durationMs >= 0);
    });
});

describe("realtime signalling", () => {
    test("opening the room in a second tab keeps the user in the roster", async () => {
        const { guest, host, meetingId } = await createMeetingWithGuest();

        const firstTab = await harness.connectSocket(guest.token);
        await harness.joinRoom(firstTab, meetingId);
        const secondTab = await harness.connectSocket(guest.token);
        await harness.joinRoom(secondTab, meetingId);

        // Let the first tab's disconnect handler run to completion.
        await wait(250);

        const response = await host.api("get", `/${meetingId}`).expect(200);
        const guestEntry = response.body.data.meeting.participants.find(
            (participant) => String(participant.userId) === String(guest.user.id)
        );

        assert.ok(guestEntry, "guest should still be an active participant");
        assert.equal(secondTab.connected, true);
    });

    test("signals are relayed between members of the same meeting", async () => {
        const { guest, host, meetingId } = await createMeetingWithGuest();
        const hostSocket = await harness.connectSocket(host.token);
        await harness.joinRoom(hostSocket, meetingId);
        const guestSocket = await harness.connectSocket(guest.token);
        await harness.joinRoom(guestSocket, meetingId);

        const received = nextEvent(hostSocket, "signal");
        guestSocket.emit("signal", hostSocket.id, JSON.stringify({ sdp: { type: "offer", sdp: "v=0" } }));
        const payload = await received;

        assert.ok(payload, "host should receive the guest's signal");
        assert.equal(payload[0], guestSocket.id);
    });

    test("signals cannot be sent to a socket in a different meeting", async () => {
        const first = await createMeetingWithGuest();
        const second = await createMeetingWithGuest();

        const victim = await harness.connectSocket(first.host.token);
        await harness.joinRoom(victim, first.meetingId);
        const attacker = await harness.connectSocket(second.host.token);
        await harness.joinRoom(attacker, second.meetingId);

        const received = nextEvent(victim, "signal");
        attacker.emit("signal", victim.id, JSON.stringify({ sdp: { type: "offer", sdp: "v=0" } }));

        assert.equal(await received, null);
    });

    test("media state changes are broadcast to the rest of the room", async () => {
        const { guest, host, meetingId } = await createMeetingWithGuest();
        const hostSocket = await harness.connectSocket(host.token);
        await harness.joinRoom(hostSocket, meetingId);
        const guestSocket = await harness.connectSocket(guest.token);
        await harness.joinRoom(guestSocket, meetingId);

        const received = nextEvent(hostSocket, "media:state");
        guestSocket.emit("media:state", { audio: false, video: true, screen: false, injected: "x" });
        const payload = await received;

        assert.ok(payload);
        assert.deepEqual(payload[0], {
            socketId: guestSocket.id,
            media: { audio: false, video: true, screen: false }
        });
    });

    test("chat messages are rejected when the host has disabled chat", async () => {
        const { guest, host, meetingId } = await createMeetingWithGuest();
        await host.api("patch", `/${meetingId}/settings`).send({ allowChat: false }).expect(200);
        const guestSocket = await harness.connectSocket(guest.token);
        await harness.joinRoom(guestSocket, meetingId);

        const received = nextEvent(guestSocket, "chat-message");
        guestSocket.emit("chat-message", "hello?");

        assert.equal(await received, null);
    });

    test("chat messages carry the sender's display name and a timestamp", async () => {
        const { guest, meetingId } = await createMeetingWithGuest();
        const guestSocket = await harness.connectSocket(guest.token);
        await harness.joinRoom(guestSocket, meetingId);

        const received = nextEvent(guestSocket, "chat-message");
        guestSocket.emit("chat-message", "Shipping the release today");
        const payload = await received;

        assert.ok(payload);
        const [data, sender, socketIdSender, meta] = payload;
        assert.equal(data, "Shipping the release today");
        assert.equal(sender, "Gabe Guest");
        assert.equal(socketIdSender, guestSocket.id);
        assert.ok(meta && typeof meta.id === "string" && typeof meta.sentAt === "string");
    });
});
