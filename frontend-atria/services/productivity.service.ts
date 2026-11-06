import { apiRequest } from "./api";

export interface ProductivityRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  calls: number;
  callsAnswered: number;
  callsUnanswered: number;
  callMinutes: number;
  messagesSent: number;
  leadsOnKanban: number;
  meetings: number;
  stageMoves: number;
  tasksCreated: number;
  uploads: number;
  tasksCompleted: number;
  comments: number;
  internalApprovals: number;
  internalRejections: number;
  clientApprovals: number;
  clientAdjustments: number;
}

export interface ProductivityReport {
  from: string | null;
  to: string | null;
  rows: ProductivityRow[];
}

export interface ProductivityQuery {
  from?: string;
  to?: string;
  role?: string;
  q?: string;
}

export async function getProductivityReport(
  query: ProductivityQuery = {},
): Promise<ProductivityReport> {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.role) params.set("role", query.role);
  if (query.q) params.set("q", query.q);
  const search = params.toString();
  return apiRequest<ProductivityReport>(
    `/productivity${search ? `?${search}` : ""}`,
  );
}
