export enum WhatsAppRoutingMode {
  MANUAL = 'MANUAL',
  ROUND_ROBIN = 'ROUND_ROBIN',
  WORKLOAD = 'WORKLOAD',
  SPECIALTY = 'SPECIALTY',
}

export enum WhatsAppInboxTab {
  OPEN = 'OPEN',
  MINE = 'MINE',
  UNASSIGNED = 'UNASSIGNED',
  WAITING = 'WAITING',
  CLOSED = 'CLOSED',
}

export type WhatsAppInboxSettingsRecord = {
  id: string;
  companyId: string;
  routingMode: WhatsAppRoutingMode;
  slaFirstResponseMinutes: number;
  autoReassignEnabled: boolean;
  autoReassignMinutes: number;
  agentUserIds: string[];
  botEnabled: boolean;
  aiAutoReply: boolean;
};

export type WhatsAppRoutingRuleRecord = {
  id: string;
  companyId: string;
  matchLabel: string | null;
  matchStageId: string | null;
  matchSource: string | null;
  targetUserGroupId: string | null;
  targetUserId: string | null;
  priority: number;
};

export type WhatsAppInboxCounts = {
  open: number;
  mine: number;
  unassigned: number;
  waiting: number;
  closed: number;
  slaBreached: number;
};
