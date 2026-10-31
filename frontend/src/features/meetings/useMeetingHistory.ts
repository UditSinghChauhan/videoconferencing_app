import { useCallback, useEffect, useState } from "react";
import { getErrorMessage, meetingsApi } from "../../lib/api";
import type { Meeting } from "../../lib/types";

type HistoryState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; meetings: Meeting[] };

export function useMeetingHistory() {
    const [state, setState] = useState<HistoryState>({ status: "loading" });

    const load = useCallback(async () => {
        setState({ status: "loading" });
        try {
            setState({ status: "success", meetings: await meetingsApi.history() });
        } catch (error) {
            setState({ status: "error", message: getErrorMessage(error, "Couldn't load your meetings.") });
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    return { state, reload: load };
}
