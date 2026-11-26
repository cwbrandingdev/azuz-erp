export type LeadCallTone = "answered" | "missed" | "pending";

const ANSWERED_OUTCOMES = new Set([
  "COMPLETED",
  "INTERESTED",
  "NO_INTEREST",
  "MEETING",
]);

const MISSED_OUTCOMES = new Set(["NO_ANSWER", "BUSY", "FAILED", "WHATSAPP"]);

export function describeCallOutcome(outcome: string): {
  label: string;
  tone: LeadCallTone;
} {
  if (ANSWERED_OUTCOMES.has(outcome))
    return { label: "Atendeu", tone: "answered" };
  if (MISSED_OUTCOMES.has(outcome))
    return { label: "Não atendeu", tone: "missed" };
  return { label: "Sem resultado", tone: "pending" };
}
