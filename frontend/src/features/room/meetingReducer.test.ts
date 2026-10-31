import { describe, expect, test } from "vitest";
import { initialState, reducer } from "./useMeetingConnection";

const joined = reducer(initialState, {
    type: "joined",
    selfId: "me",
    participants: [{ socketId: "me", userId: "u0", username: "me" }],
    meeting: { participants: [] }
});

describe("meeting connection reducer", () => {
    test("never lists yourself as a remote peer", () => {
        expect(joined.peers).toEqual({});
        expect(joined.status).toBe("connected");
    });

    test("a media:state that overtakes user-joined is not lost", () => {
        const early = reducer(joined, { type: "peer-media", socketId: "s1", media: { audio: true, video: true, screen: false } });
        const named = reducer(early, {
            type: "directory",
            participants: [{ socketId: "s1", userId: "u1", username: "maya", name: "Maya", media: { audio: false, video: false, screen: false } }]
        });

        expect(named.peers.s1?.name).toBe("Maya");
        expect(named.peers.s1?.media).toEqual({ audio: true, video: true, screen: false });
    });

    test("removing a peer drops it from the map", () => {
        const withPeer = reducer(joined, { type: "directory", participants: [{ socketId: "s1", userId: "u1", username: "maya" }] });
        expect(reducer(withPeer, { type: "peer-left", socketId: "s1" }).peers).toEqual({});
    });

    test("terminal states are sticky", () => {
        const ended = reducer(joined, { type: "status", status: "ended" });
        expect(reducer(ended, { type: "status", status: "reconnecting" }).status).toBe("ended");
    });

    test("duplicate chat messages are ignored", () => {
        const message = { id: "m1", sender: "Maya", text: "hi", sentAt: "2026-10-31T12:00:00Z", isOwn: false };
        const once = reducer(joined, { type: "message", message });
        expect(reducer(once, { type: "message", message }).messages).toHaveLength(1);
    });
});
