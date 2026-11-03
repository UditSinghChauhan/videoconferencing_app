export interface User {
    id: string;
    name: string;
    username: string;
}

export type MeetingRole = "host" | "participant";
export type MeetingStatus = "active" | "ended";

export interface MeetingSettings {
    allowChat: boolean;
    allowScreenShare: boolean;
    allowParticipantMic: boolean;
}

export interface MeetingParticipant {
    userId: string;
    username: string;
    /** Display name. Absent on API versions before display names were stored. */
    name?: string;
    role: MeetingRole;
    joinedAt: string;
}

/** A statement from the call; the speaker is shown as an avatar chip, never as a "Name:" prefix. */
export interface KeyPoint {
    speaker: string | null;
    text: string;
}

export interface ActionItem {
    owner: string;
    task: string;
    due?: string;
}

export interface MeetingSummaryContent {
    version?: number;
    generatedAt: string | null;
    keyPoints: KeyPoint[];
    /** Absent on recaps from API versions before action items. */
    actionItems?: ActionItem[];
    highlights: string[];
    keywords: string[];
    participantsInvolved: string[];
    conclusion: string;
}

export interface Meeting {
    id: string;
    meetingId: string;
    hostId: string;
    hostUsername: string;
    /** The host's display name; null when none was stored. */
    hostName?: string | null;
    status: MeetingStatus;
    settings: MeetingSettings;
    createdAt: string;
    updatedAt: string;
    endedAt: string | null;
    hasSummary: boolean;
    currentUserRole: MeetingRole | null;
    participantCount?: number;
    durationMs?: number | null;
    participants: MeetingParticipant[];
    summary: MeetingSummaryContent | null;
}

export interface TranscriptEntry {
    sender: string;
    content: string;
    sentAt: string;
}

export interface MeetingRecap {
    meetingId: string;
    status: MeetingStatus;
    hostUsername?: string;
    /** The host's display name. The handle above is internal and never shown. */
    hostName?: string | null;
    createdAt?: string;
    endedAt?: string | null;
    durationMs?: number | null;
    participantCount?: number;
    summary: MeetingSummaryContent;
    chat?: TranscriptEntry[];
}

export interface MediaState {
    audio: boolean;
    video: boolean;
    screen: boolean;
}

export interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    sentAt: string;
    isOwn: boolean;
}
