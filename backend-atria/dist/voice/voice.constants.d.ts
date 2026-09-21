export declare const AGENT_CALL_OUTCOMES: readonly ["NO_ANSWER", "BUSY", "FAILED", "COMPLETED", "NO_INTEREST", "INTERESTED", "WHATSAPP", "MEETING", "SKIPPED"];
export type AgentCallOutcome = (typeof AGENT_CALL_OUTCOMES)[number];
export declare const LOCKED_AGENT_OUTCOMES: Set<string>;
