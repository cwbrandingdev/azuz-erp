export const taskKeys = {
  all: (companyId: string) => ["tasks", companyId] as const,
  root: ["tasks"] as const,
};

export const tvMonitoringKeys = {
  all: (companyId: string) => ["tv-monitoring", companyId] as const,
  root: ["tv-monitoring"] as const,
};

export const calendarKeys = {
  all: (companyId: string) => ["calendar", companyId] as const,
  events: (
    companyId: string,
    params: { from?: string; to?: string; clientId?: string | null },
  ) =>
    [
      "calendar",
      companyId,
      "events",
      params.from ?? null,
      params.to ?? null,
      params.clientId ?? null,
    ] as const,
  root: ["calendar"] as const,
};

export const creationKeys = {
  all: (companyId: string) => ["creation", companyId] as const,
  pipeline: (
    companyId: string,
    clientId: string,
    from?: string,
    to?: string,
  ) =>
    [
      "creation",
      companyId,
      "pipeline",
      clientId,
      from ?? null,
      to ?? null,
    ] as const,
  root: ["creation"] as const,
};

export const internalApprovalKeys = {
  all: (companyId: string) => ["internal-approvals", companyId] as const,
  root: ["internal-approvals"] as const,
};

export const suggestionKeys = {
  mine: (companyId: string) => ["suggestions", companyId, "mine"] as const,
  all: (companyId: string) => ["suggestions", companyId, "all"] as const,
  root: ["suggestions"] as const,
};

export const appUpdateKeys = {
  access: (companyId: string) => ["app-updates", companyId, "access"] as const,
  list: (companyId: string) => ["app-updates", companyId, "list"] as const,
  root: ["app-updates"] as const,
};

export const dashboardKeys = {
  overview: (companyId: string) =>
    ["dashboard", companyId, "overview"] as const,
  pendingRequests: (companyId: string) =>
    ["dashboard", companyId, "pending-requests"] as const,
  root: ["dashboard"] as const,
};

export const clientKeys = {
  list: (companyId: string, groupId = "") =>
    ["clients", companyId, "list", groupId] as const,
  detail360: (companyId: string, clientId: string, section: string) =>
    ["clients", companyId, "360", clientId, section] as const,
  detail: (companyId: string, clientId: string) =>
    ["clients", companyId, "360", clientId] as const,
  root: ["clients"] as const,
};

export const companySettingsKeys = {
  all: (companyId: string) => ["company-settings", companyId] as const,
  root: ["company-settings"] as const,
};

export const financeKeys = {
  overview: (companyId: string, year: number, month: number | null) =>
    ["finance", companyId, "overview", year, month] as const,
  management: (
    companyId: string,
    from: string,
    to: string,
    chartYear: number,
  ) =>
    ["finance", companyId, "management", from, to, chartYear] as const,
  chartOfAccounts: (companyId: string) =>
    ["finance", companyId, "chart-of-accounts"] as const,
  root: ["finance"] as const,
};

export const proposalKeys = {
  list: (companyId: string) => ["proposals", companyId] as const,
  root: ["proposals"] as const,
};

export const contractKeys = {
  list: (companyId: string) => ["contracts", companyId] as const,
  root: ["contracts"] as const,
};

export const assetKeys = {
  grouped: (companyId: string) => ["assets", companyId, "grouped"] as const,
  root: ["assets"] as const,
};

export const whatsappKeys = {
  conversations: (companyId: string) =>
    ["whatsapp", companyId, "conversations"] as const,
  messages: (companyId: string, phone: string) =>
    ["whatsapp", companyId, "messages", phone] as const,
  root: ["whatsapp"] as const,
};
