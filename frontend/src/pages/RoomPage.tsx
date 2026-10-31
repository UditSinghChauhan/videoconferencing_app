import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button, ButtonLink } from "../components/Button";
import { FullPageSpinner } from "../components/FullPageSpinner";
import { useToast } from "../components/Toast";
import { Lobby } from "../features/room/Lobby";
import { RoomView } from "../features/room/RoomView";
import { StatusScreen } from "../features/room/StatusScreen";
import type { PersonModel } from "../features/room/SidePanel";
import type { TileModel } from "../features/room/types";
import { useLocalMedia } from "../features/room/useLocalMedia";
import { useMeetingConnection } from "../features/room/useMeetingConnection";
import { getErrorCode, getErrorMessage, getErrorStatus, meetingsApi } from "../lib/api";
import { inviteLinkFor, parseMeetingInput } from "../lib/meetingCode";
import type { Meeting } from "../lib/types";

type Phase =
    | { kind: "checking" }
    | { kind: "lobby"; isHostHint: boolean }
    | { kind: "in-call"; meeting: Meeting }
    | { kind: "left" }
    | { kind: "not-found" }
    | { kind: "ended"; canViewRecap: boolean };

export default function RoomPage() {
    const { roomId: rawRoomId = "" } = useParams();
    const meetingId = parseMeetingInput(rawRoomId);

    if (!meetingId) {
        return (
            <StatusScreen
                title="That link doesn't look right"
                description="Meeting codes look like kmt-vrqp-xhw. Check the link you were sent, or start a new meeting."
                actions={<ButtonLink to="/home">Back to meetings</ButtonLink>}
            />
        );
    }

    // Remounting on "rejoin" gives a clean socket, mesh and media session.
    return <MeetingRoom key={meetingId} meetingId={meetingId} />;
}

function MeetingRoom({ meetingId }: { meetingId: string }) {
    const { user } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [phase, setPhase] = useState<Phase>({ kind: "checking" });
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const notify = useCallback((message: string) => toast.show(message, "error"), [toast]);
    const localMedia = useLocalMedia({ onError: notify });
    const inCall = phase.kind === "in-call";

    const mediaState = useMemo(
        () => ({ audio: localMedia.micOn, video: localMedia.cameraOn, screen: localMedia.screenOn }),
        [localMedia.cameraOn, localMedia.micOn, localMedia.screenOn]
    );

    const connection = useMeetingConnection({
        meetingId,
        enabled: inCall,
        outgoing: localMedia.outgoing,
        media: mediaState,
        onNotice: notify
    });

    // Find out what this link points at before asking for anything.
    useEffect(() => {
        let cancelled = false;

        meetingsApi.get(meetingId)
            .then((meeting) => {
                if (cancelled) return;
                setPhase(meeting.status === "ended"
                    ? { kind: "ended", canViewRecap: true }
                    : { kind: "lobby", isHostHint: meeting.currentUserRole === "host" });
            })
            .catch((error: unknown) => {
                if (cancelled) return;
                const code = getErrorCode(error);

                if (getErrorStatus(error) === 404) {
                    setPhase({ kind: "not-found" });
                } else if (code === "MEETING_ACCESS_DENIED") {
                    setPhase({ kind: "ended", canViewRecap: false });
                } else {
                    // Not yet a participant (403) or a transient error: the join call decides.
                    setPhase({ kind: "lobby", isHostHint: false });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [meetingId]);

    const join = async () => {
        setJoining(true);
        setJoinError(null);

        try {
            const meeting = await meetingsApi.join(meetingId);
            setPhase({ kind: "in-call", meeting });
        } catch (error) {
            const code = getErrorCode(error);
            if (getErrorStatus(error) === 404) {
                setPhase({ kind: "not-found" });
            } else if (code === "MEETING_ENDED") {
                setPhase({ kind: "ended", canViewRecap: true });
            } else {
                setJoinError(getErrorMessage(error, "Couldn't join this meeting. Try again."));
            }
        } finally {
            setJoining(false);
        }
    };

    const isHost = inCall && (phase.meeting.currentUserRole === "host"
        || connection.roster.some((p) => String(p.userId) === String(user?.id) && p.role === "host"));

    const leave = async () => {
        try {
            if (isHost) {
                await meetingsApi.end(meetingId);
                localMedia.release();
                navigate(`/meetings/${encodeURIComponent(meetingId)}`, { replace: true, state: { justEnded: true } });
                return;
            }

            await meetingsApi.leave(meetingId);
        } catch (error) {
            if (isHost) {
                toast.show(getErrorMessage(error, "Couldn't end the meeting. Try again."), "error");
                return;
            }
            // Leaving locally still works: the server marks us as left when the socket closes.
        }

        localMedia.release();
        setPhase({ kind: "left" });
    };

    const removePerson = async (person: PersonModel) => {
        setRemovingId(person.id);
        try {
            await meetingsApi.removeParticipant(meetingId, person.id);
            toast.show(`${person.name} was removed from the call.`);
        } catch (error) {
            toast.show(getErrorMessage(error, `Couldn't remove ${person.name}.`), "error");
        } finally {
            setRemovingId(null);
        }
    };

    const displayName = user?.name || user?.username || "You";
    const inviteLink = inviteLinkFor(meetingId);

    // Local tile carries the mic track too, so the speaking ring works for yourself.
    const { audio: localAudio, video: localVideo } = localMedia.outgoing;
    const localTileStream = useMemo(() => {
        const tracks = [localAudio, localVideo].filter((t): t is MediaStreamTrack => Boolean(t));
        return tracks.length ? new MediaStream(tracks) : null;
    }, [localAudio, localVideo]);

    const hostUserIds = useMemo(
        () => new Set(connection.roster.filter((p) => p.role === "host").map((p) => String(p.userId))),
        [connection.roster]
    );

    const tiles = useMemo<TileModel[]>(() => {
        const local: TileModel = {
            id: "local",
            name: displayName,
            isLocal: true,
            isHost,
            stream: localTileStream,
            media: mediaState
        };

        const remote = Object.values(connection.peers).map<TileModel>((peer) => ({
            id: peer.socketId,
            name: peer.name,
            isLocal: false,
            isHost: peer.userId ? hostUserIds.has(peer.userId) : false,
            stream: peer.stream,
            media: peer.media,
            connecting: peer.connection === "new" || peer.connection === "connecting"
        }));

        return [local, ...remote];
    }, [connection.peers, displayName, hostUserIds, isHost, localTileStream, mediaState]);

    const people = useMemo<PersonModel[]>(() => {
        const peerByUser = new Map(Object.values(connection.peers).map((peer) => [peer.userId, peer]));
        const roster = connection.roster.length
            ? connection.roster
            : inCall ? phase.meeting.participants : [];

        return roster
            .map((participant) => {
                const isYou = String(participant.userId) === String(user?.id);
                const media = isYou ? mediaState : peerByUser.get(String(participant.userId))?.media;
                return {
                    id: String(participant.userId),
                    name: participant.name || participant.username,
                    username: participant.username,
                    isHost: participant.role === "host",
                    isYou,
                    micOn: media ? media.audio : null
                };
            })
            .sort((a, b) => Number(b.isYou) - Number(a.isYou) || Number(b.isHost) - Number(a.isHost));
    }, [connection.peers, connection.roster, inCall, mediaState, phase, user?.id]);

    // Terminal states reported by the server take precedence over local phase.
    if (inCall && connection.status === "ended") {
        return (
            <StatusScreen
                title="The host ended the meeting"
                description="Bridge is putting together the recap from the chat and activity in this call."
                actions={
                    <>
                        <ButtonLink to={`/meetings/${encodeURIComponent(meetingId)}`}>View recap</ButtonLink>
                        <ButtonLink to="/home" variant="secondary">Back to meetings</ButtonLink>
                    </>
                }
                onMount={localMedia.release}
            />
        );
    }

    if (inCall && connection.status === "removed") {
        return (
            <StatusScreen
                title="You were removed from this meeting"
                description="The host removed you from the call. If this was a mistake, ask them to send the link again."
                actions={<ButtonLink to="/home">Back to meetings</ButtonLink>}
                onMount={localMedia.release}
            />
        );
    }

    if (inCall && connection.status === "replaced") {
        return (
            <StatusScreen
                title="You joined from another tab"
                description="Bridge keeps one connection per person so others don't see you twice."
                actions={
                    <>
                        <Button onClick={() => window.location.reload()}>Use this tab instead</Button>
                        <ButtonLink to="/home" variant="secondary">Back to meetings</ButtonLink>
                    </>
                }
                onMount={localMedia.release}
            />
        );
    }

    if (inCall && connection.status === "failed") {
        return (
            <StatusScreen
                title="Connection lost"
                description={connection.failureMessage ?? "Bridge couldn't reconnect to the meeting."}
                actions={
                    <>
                        <Button onClick={() => window.location.reload()}>Rejoin</Button>
                        <ButtonLink to="/home" variant="secondary">Back to meetings</ButtonLink>
                    </>
                }
                onMount={localMedia.release}
            />
        );
    }

    switch (phase.kind) {
        case "checking":
            return <FullPageSpinner label="Opening meeting" />;
        case "not-found":
            return (
                <StatusScreen
                    title="No meeting with that code"
                    description={<>We couldn't find <code>{meetingId}</code>. Check the code with whoever invited you, or start a new meeting.</>}
                    actions={<ButtonLink to="/home">Back to meetings</ButtonLink>}
                />
            );
        case "ended":
            return (
                <StatusScreen
                    title="This meeting has ended"
                    description={phase.canViewRecap ? "The recap is ready." : "Only people who were in the call can see its recap."}
                    actions={
                        <>
                            {phase.canViewRecap ? <ButtonLink to={`/meetings/${encodeURIComponent(meetingId)}`}>View recap</ButtonLink> : null}
                            <ButtonLink to="/home" variant={phase.canViewRecap ? "secondary" : "primary"}>Back to meetings</ButtonLink>
                        </>
                    }
                />
            );
        case "left":
            return (
                <StatusScreen
                    title="You left the meeting"
                    description="The meeting is still going. You can rejoin while the host keeps it open."
                    actions={
                        <>
                            <Button onClick={() => window.location.reload()}>Rejoin</Button>
                            <ButtonLink to="/home" variant="secondary">Back to meetings</ButtonLink>
                        </>
                    }
                />
            );
        case "lobby":
            return (
                <Lobby
                    meetingId={meetingId}
                    displayName={displayName}
                    username={user?.username}
                    previewStream={localMedia.previewStream}
                    micOn={localMedia.micOn}
                    cameraOn={localMedia.cameraOn}
                    micStatus={localMedia.micStatus}
                    cameraStatus={localMedia.cameraStatus}
                    onToggleMic={localMedia.toggleMic}
                    onToggleCamera={localMedia.toggleCamera}
                    title={phase.isHostHint ? "Your meeting is ready" : "Ready to join?"}
                    description={
                        phase.isHostHint
                            ? "Share the link so people can join. You can also copy it from inside the call."
                            : "Check your camera and microphone. Others will see your name and video when you join."
                    }
                    error={joinError}
                    actions={
                        <>
                            <Button size="lg" onClick={join} loading={joining} data-testid="join-meeting-button">
                                Join now
                            </Button>
                            {phase.isHostHint ? (
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    icon={<Copy size={16} aria-hidden="true" />}
                                    onClick={() => {
                                        navigator.clipboard.writeText(inviteLink)
                                            .then(() => toast.show("Invite link copied", "success"))
                                            .catch(() => toast.show(inviteLink));
                                    }}
                                >
                                    Copy invite link
                                </Button>
                            ) : null}
                        </>
                    }
                />
            );
        case "in-call":
            return (
                <RoomView
                    meetingId={meetingId}
                    startedAt={new Date(phase.meeting.createdAt).getTime()}
                    status={connection.status === "connected" ? "connected" : connection.status === "reconnecting" ? "reconnecting" : "connecting"}
                    isHost={isHost}
                    tiles={tiles}
                    people={people}
                    messages={connection.messages}
                    chatEnabled={(connection.settings ?? phase.meeting.settings)?.allowChat !== false}
                    screenShareAllowed={isHost || (connection.settings ?? phase.meeting.settings)?.allowScreenShare !== false}
                    inviteLink={inviteLink}
                    media={localMedia}
                    removingId={removingId}
                    onSendMessage={connection.sendMessage}
                    onRemovePerson={removePerson}
                    onLeave={leave}
                />
            );
        default:
            return null;
    }
}
