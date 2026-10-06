export interface WhatsappCloudTextMessage {
    messaging_product: 'whatsapp';
    to: string;
    type: 'text';
    text: {
        body: string;
        preview_url?: boolean;
    };
}
export interface WhatsappCloudTemplateMessage {
    messaging_product: 'whatsapp';
    to: string;
    type: 'template';
    template: {
        name: string;
        language: {
            code: string;
        };
        components?: Array<{
            type: 'body';
            parameters: Array<{
                type: 'text';
                text: string;
            }>;
        }>;
    };
}
export interface WhatsappCloudSendResult {
    waMessageId: string | null;
    waId: string | null;
}
export declare class WhatsappCloudApiError extends Error {
    readonly status?: number | undefined;
    readonly code?: number | undefined;
    constructor(message: string, status?: number | undefined, code?: number | undefined);
}
export declare function verifyMetaSignature(rawBody: Buffer | string, signatureHeader: string | undefined, appSecret: string | null): boolean;
export declare class WhatsappCloudClient {
    private readonly apiVersion;
    constructor(apiVersion: string);
    sendText(accessToken: string, phoneNumberId: string, to: string, body: string): Promise<WhatsappCloudSendResult>;
    sendTemplate(accessToken: string, phoneNumberId: string, to: string, templateName: string, languageCode: string, parameters?: string[]): Promise<WhatsappCloudSendResult>;
    private send;
    private graphBase;
}
