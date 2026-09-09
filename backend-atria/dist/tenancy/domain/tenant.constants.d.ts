export declare const DEV_SCHEMA = "dev";
export declare const DEFAULT_TENANT_ID = "00000000-0000-4000-8000-000000000010";
export declare const DEFAULT_TENANT_SLUG = "cwbranding";
export declare const DEFAULT_TENANT_NAME = "CW Branding";
export declare const TENANT_SCOPED_MODELS: readonly ["Company", "User", "InvitationToken", "Message", "FinancialCategory", "FinancialTransaction", "KanbanColumn", "KanbanTask", "CalendarEvent", "Client", "UserGroup", "ClientGroup", "ClientReport", "ClientBrief", "ContentPost", "Contract", "Proposal", "Asset", "Notification", "AgencySettings", "ArtTypePricing", "CalendarEntry", "AgendaEvent", "ClientRequest", "ClientFinancialAttachment", "Task", "ClientReportFile", "LeadStage", "CrmReminderTask", "Lead", "DeletionHistory", "Deliverable", "SystemSuggestion", "AppUpdate"];
export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];
export declare const TENANT_SCOPED_MODEL_SET: Set<string>;
export declare const DEV_TENANT_TABLES: readonly ["Company", "User", "invitation_tokens", "Message", "FinancialCategory", "FinancialTransaction", "KanbanColumn", "KanbanTask", "CalendarEvent", "Client", "UserGroup", "ClientGroup", "ClientReport", "ClientBrief", "ContentPost", "Contract", "Proposal", "Asset", "notifications", "AgencySettings", "art_type_pricing", "calendar_entries", "agenda_events", "client_requests", "client_financial_attachments", "tasks", "client_reports", "lead_stages", "crm_reminder_tasks", "leads", "deletion_history", "deliverables", "system_suggestions", "app_updates"];
