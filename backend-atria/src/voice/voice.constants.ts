export const AGENT_CALL_OUTCOMES = [
  'NO_ANSWER',
  'BUSY',
  'FAILED',
  'COMPLETED',
  'NO_INTEREST',
  'INTERESTED',
  'WHATSAPP',
  'MEETING',
  'SKIPPED',
] as const;

export type AgentCallOutcome = (typeof AGENT_CALL_OUTCOMES)[number];

export const LOCKED_AGENT_OUTCOMES = new Set<string>([
  'NO_INTEREST',
  'INTERESTED',
  'WHATSAPP',
  'MEETING',
  'SKIPPED',
]);
