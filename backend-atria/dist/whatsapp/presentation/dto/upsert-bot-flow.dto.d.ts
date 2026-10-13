export declare class BotFlowOptionDto {
    key: string;
    label: string;
    nextId?: string | null;
}
export declare class BotFlowNodeDto {
    id: string;
    type: 'message' | 'menu' | 'question' | 'ai' | 'handoff';
    text?: string;
    field?: string;
    options?: BotFlowOptionDto[];
    nextId?: string | null;
}
export declare class BotFlowDefinitionDto {
    startId: string;
    nodes: BotFlowNodeDto[];
}
export declare class UpsertBotFlowDto {
    name?: string;
    enabled?: boolean;
    definition?: BotFlowDefinitionDto;
}
