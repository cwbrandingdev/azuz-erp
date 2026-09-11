import type { AppNotification, NotificationType } from "@/services/types";

export type NotificationCategory =
  | "due_date"
  | "new_request"
  | "status_update";

export const NOTIFICATION_CATEGORY_ORDER: NotificationCategory[] = [
  "due_date",
  "new_request",
  "status_update",
];

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> =
  {
    due_date: "Alertas de Prazo",
    new_request: "Novas Solicitações",
    status_update: "Atualizações de Status",
  };

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  due_date_warning: "Prazo",
  new_request: "Solicitação",
  task_assigned: "Tarefa",
  contract_signed: "Contrato",
  post_pending: "Conteúdo",
  post_rejected: "Conteúdo",
  system: "Sistema",
  app_update: "Atualização",
};

const DUE_DATE_TYPES = new Set<string>(["due_date_warning"]);
const NEW_REQUEST_TYPES = new Set<string>(["new_request"]);

export function getNotificationCategory(
  type: NotificationType | string,
): NotificationCategory {
  if (DUE_DATE_TYPES.has(type)) return "due_date";
  if (NEW_REQUEST_TYPES.has(type)) return "new_request";
  return "status_update";
}

export function getNotificationHref(notification: AppNotification): string {
  const taskId = notification.taskId?.trim();

  switch (notification.type) {
    case "due_date_warning":
    case "task_assigned":
      return taskId ? `/kanban?taskId=${encodeURIComponent(taskId)}` : "/kanban";
    case "new_request":
      return "/clients";
    case "contract_signed":
      return "/contracts";
    case "post_pending":
    case "post_rejected":
      return "/content/management";
    case "app_update":
      return "/app-updates";
    case "system":
      if (notification.title.toLowerCase().includes("aprovação interna")) {
        return "/internal-approvals";
      }
      return taskId
        ? `/kanban?taskId=${encodeURIComponent(taskId)}`
        : "/dashboard?tab=notifications";
    default:
      return "/dashboard?tab=notifications";
  }
}

export function groupNotificationsByCategory(notifications: AppNotification[]) {
  const groups: Record<NotificationCategory, AppNotification[]> = {
    due_date: [],
    new_request: [],
    status_update: [],
  };

  for (const notification of notifications) {
    groups[getNotificationCategory(notification.type)].push(notification);
  }

  return NOTIFICATION_CATEGORY_ORDER.filter(
    (category) => groups[category].length > 0,
  ).map((category) => ({
    category,
    label: NOTIFICATION_CATEGORY_LABELS[category],
    items: groups[category],
  }));
}

export function formatNotificationTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
