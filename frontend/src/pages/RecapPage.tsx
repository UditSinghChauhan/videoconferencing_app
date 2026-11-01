import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ArrowLeft, RotateCw } from "lucide-react";
import { Button, ButtonLink } from "../components/Button";
import { PageShell } from "../components/PageShell";
import { RecapView } from "../features/meetings/RecapView";
import { getErrorMessage, getErrorStatus, meetingsApi } from "../lib/api";
import type { MeetingRecap } from "../lib/types";
import styles from "../features/meetings/Recap.module.css";

type RecapState =
    | { status: "loading" }
    | { status: "error"; message: string; notFound: boolean }
    | { status: "success"; recap: MeetingRecap };

export default function RecapPage() {
    const { meetingId = "" } = useParams();
    const location = useLocation();
    const justEnded = Boolean((location.state as { justEnded?: boolean } | null)?.justEnded);
    const [state, setState] = useState<RecapState>({ status: "loading" });

    const load = useCallback(async () => {
        setState({ status: "loading" });
        try {
            setState({ status: "success", recap: await meetingsApi.recap(meetingId) });
        } catch (error) {
            const status = getErrorStatus(error);
            setState({
                status: "error",
                notFound: status === 404 || status === 403,
                message: status === 403
                    ? "Only people who were in this meeting can see its recap."
                    : getErrorMessage(error, "Couldn't load this recap.")
            });
        }
    }, [meetingId]);

    useEffect(() => {
        void load();
    }, [load]);

    const back = (
        <ButtonLink to="/history" variant="ghost" size="sm" icon={<ArrowLeft size={16} aria-hidden="true" />} className={styles.back}>
            History
        </ButtonLink>
    );

    if (state.status === "loading") {
        return (
            <PageShell narrow>
                {back}
                <div className={styles.loading} aria-busy="true" aria-label="Loading recap">
                    <span className={styles.skeleton} style={{ width: "40%", height: 40 }} />
                    <span className={styles.skeleton} style={{ width: "70%" }} />
                    <span className={styles.skeleton} style={{ width: "100%", height: 120 }} />
                    <span className={styles.skeleton} style={{ width: "100%", height: 160 }} />
                </div>
            </PageShell>
        );
    }

    if (state.status === "error") {
        return (
            <PageShell narrow>
                {back}
                <div className={styles.errorState} role="alert">
                    <h1>{state.notFound ? "Recap not available" : "Couldn't load the recap"}</h1>
                    <p>{state.message}</p>
                    {!state.notFound ? (
                        <Button variant="secondary" icon={<RotateCw size={16} aria-hidden="true" />} onClick={load}>Try again</Button>
                    ) : null}
                </div>
            </PageShell>
        );
    }

    const { recap } = state;

    if (recap.status === "active") {
        return (
            <PageShell narrow>
                {back}
                <div className={styles.errorState}>
                    <h1>This meeting is still live</h1>
                    <p>The recap is generated when the host ends the meeting.</p>
                    <ButtonLink to={`/room/${encodeURIComponent(recap.meetingId)}`}>Rejoin meeting</ButtonLink>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell narrow>
            {back}
            <RecapView
                recap={recap}
                notice={justEnded ? "Meeting ended. Here's the recap." : null}
            />
        </PageShell>
    );
}
