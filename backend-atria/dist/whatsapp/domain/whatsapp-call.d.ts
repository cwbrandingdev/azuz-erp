export declare enum WhatsAppCallDirection {
    INBOUND = "INBOUND",
    OUTBOUND = "OUTBOUND"
}
export declare enum WhatsAppCallStatus {
    CONNECTING = "CONNECTING",
    RINGING = "RINGING",
    IN_PROGRESS = "IN_PROGRESS",
    ENDED = "ENDED",
    REJECTED = "REJECTED",
    FAILED = "FAILED"
}
export type WhatsAppCallRecord = {
    id: string;
    whatsappCallId: string;
    phone: string;
    direction: WhatsAppCallDirection;
    status: WhatsAppCallStatus;
    offerSdp: string | null;
    answerSdp: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
    durationSeconds: number | null;
    createdAt: Date;
    updatedAt: Date;
};
export type WhatsAppCallPermission = {
    status: string;
    expirationTime: number | null;
    canStartCall: boolean;
    canRequestPermission: boolean;
};
export type WhatsAppWebhookCall = {
    id?: string;
    from?: string;
    to?: string;
    event?: string;
    direction?: string;
    status?: string | string[];
    timestamp?: string;
    start_time?: string;
    end_time?: string;
    duration?: number;
    session?: {
        sdp_type?: string;
        sdp?: string;
    };
    connection?: {
        webrtc?: {
            sdp?: string;
        };
    };
};
export type WhatsAppWebhookCallStatus = {
    id?: string;
    type?: string;
    status?: string;
    recipient_id?: string;
};
export declare const LIVE_CALL_STATUSES: WhatsAppCallStatus[];
export declare function readCallSdp(call: WhatsAppWebhookCall): {
    type: string | null;
    sdp: string | null;
};
export declare function mapCallDirection(value: string | undefined): WhatsAppCallDirection;
