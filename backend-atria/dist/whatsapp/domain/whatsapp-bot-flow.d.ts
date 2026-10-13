export type WhatsAppBotNodeType = 'message' | 'menu' | 'question' | 'ai' | 'handoff';
export type WhatsAppBotOption = {
    key: string;
    label: string;
    nextId?: string | null;
};
export type WhatsAppBotNode = {
    id: string;
    type: WhatsAppBotNodeType;
    text?: string;
    field?: string;
    options?: WhatsAppBotOption[];
    nextId?: string | null;
};
export type WhatsAppBotDefinition = {
    startId: string;
    nodes: WhatsAppBotNode[];
};
export declare function defaultWhatsAppBotDefinition(): WhatsAppBotDefinition;
export declare function parseBotDefinition(raw: unknown): WhatsAppBotDefinition;
export declare function interpolateTemplate(template: string, vars: Record<string, string>): string;
export declare function extractPlaceholders(template: string, vars: Record<string, string>): string[];
export declare function wantsHumanHandoff(text: string): boolean;
