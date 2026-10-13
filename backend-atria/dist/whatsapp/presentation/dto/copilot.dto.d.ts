export declare class WhatsAppCopilotDto {
    action: 'suggest' | 'rewrite' | 'grammar' | 'tone' | 'summarize';
    text?: string;
    tone?: 'formal' | 'casual' | 'empathetic';
}
