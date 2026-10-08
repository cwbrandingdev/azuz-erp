export type WhatsAppSendTextResult = {
    whatsappMessageId: string | null;
    to: string;
};
export type WhatsAppCallSession = {
    sdpType: 'offer' | 'answer';
    sdp: string;
};
export type WhatsAppCallPermissionsResult = {
    status: string;
    expirationTime: number | null;
    canStartCall: boolean;
    canRequestPermission: boolean;
};
export declare abstract class WhatsAppGraphGateway {
    abstract sendText(to: string, body: string): Promise<WhatsAppSendTextResult>;
    abstract getBusinessPhone(): Promise<string>;
    abstract enableCalling(): Promise<void>;
    abstract getCallPermissions(userWaId: string): Promise<WhatsAppCallPermissionsResult>;
    abstract sendCallPermissionRequest(to: string): Promise<WhatsAppSendTextResult>;
    abstract connectCall(to: string, session: WhatsAppCallSession): Promise<{
        callId: string;
    }>;
    abstract callAction(callId: string, action: 'pre_accept' | 'accept' | 'reject' | 'terminate', session?: WhatsAppCallSession): Promise<void>;
}
