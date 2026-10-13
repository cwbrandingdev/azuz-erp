"use client";

import {
  AlertTriangle,
  Check,
  ClipboardList,
  FileSignature,
  Inbox,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatNotificationTime,
  getNotificationCategory,
  NOTIFICATION_TYPE_LABELS,
} from "@/lib/notification-utils";
import type { AppNotification } from "@/services/types";

interface NotificationItemProps {
  notification: AppNotification;
  compact?: boolean;
  onOpen: (notification: AppNotification) => void;
  onMarkAsRead?: (notification: AppNotification) => void;
}

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  const category = getNotificationCategory(type);
  if (category === "due_date") return <AlertTriangle className="size-4" />;
  if (category === "new_request") return <Inbox className="size-4" />;
  if (type === "contract_signed") return <FileSignature className="size-4" />;
  if (type === "task_assigned") return <ClipboardList className="size-4" />;
  if (type === "app_update") return <Megaphone className="size-4" />;
  if (type === "whatsapp_mention" || type === "whatsapp_transfer") {
    return <MessageCircle className="size-4" />;
  }
  return <Megaphone className="size-4" />;
}

export function NotificationItem({
  notification,
  compact = false,
  onOpen,
  onMarkAsRead,
}: NotificationItemProps) {
  const category = getNotificationCategory(notification.type);

  return (
    <div
      className={cn(
        "flex w-full items-start gap-2 rounded-xl border text-left transition-colors",
        compact ? "px-2.5 py-2" : "px-3 py-3",
        notification.isRead
          ? "border-transparent bg-transparent"
          : "border-[var(--atria-accent)]/35 bg-[var(--atria-accent)]/12",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="flex min-w-0 flex-1 items-start gap-3 text-left hover:opacity-90"
      >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          category === "due_date" && "bg-amber-500/15 text-amber-700",
          category === "new_request" && "bg-sky-500/15 text-sky-700",
          category === "status_update" &&
            "bg-[var(--atria-primary)]/10 text-[var(--atria-primary)]",
        )}
      >
        <NotificationIcon type={notification.type} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "line-clamp-1 text-sm text-[var(--atria-primary)]",
              notification.isRead ? "font-medium" : "font-semibold",
            )}
          >
            {notification.title}
          </span>
          <span className="shrink-0 rounded-full bg-[var(--atria-primary)]/8 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[var(--atria-primary)]/55 uppercase">
            {NOTIFICATION_TYPE_LABELS[notification.type] ?? notification.type}
          </span>
        </span>
        <span
          className={cn(
            "mt-0.5 block text-xs text-[var(--atria-primary)]/60",
            compact ? "line-clamp-2" : "line-clamp-3",
          )}
        >
          {notification.message}
        </span>
        <span className="mt-1 block text-[10px] text-[var(--atria-primary)]/40">
          {formatNotificationTime(notification.createdAt)}
        </span>
      </span>

      {!notification.isRead ? (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--atria-accent)] ring-2 ring-[var(--atria-base)]" />
      ) : null}
      </button>

      {!notification.isRead && onMarkAsRead ? (
        <button
          type="button"
          title="Marcar como lida"
          aria-label="Marcar como lida"
          onClick={() => onMarkAsRead(notification)}
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--atria-primary)]/50 transition-colors hover:bg-[var(--atria-primary)]/8 hover:text-[var(--atria-primary)]"
        >
          <Check className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
