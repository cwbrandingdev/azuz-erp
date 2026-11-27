"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ChevronDown } from "lucide-react";
import { NotificationItem } from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/contexts/notifications-context";
import { useMarkNotificationAsRead } from "@/hooks/use-mark-notification-as-read";
import { useCollapsedNotificationSections } from "@/hooks/use-collapsed-notification-sections";
import {
  getNotificationHref,
  groupNotificationsByCategory,
} from "@/lib/notification-utils";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/services/types";

type ReadFilter = "all" | "unread";

export function DashboardNotifications() {
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications();
  const markNotificationAsRead = useMarkNotificationAsRead();
  const [filter, setFilter] = useState<ReadFilter>("all");
  const { isCollapsed, toggle } = useCollapsedNotificationSections();

  const visible = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((item) => !item.isRead)
        : notifications,
    [filter, notifications],
  );

  const groups = useMemo(
    () => groupNotificationsByCategory(visible),
    [visible],
  );

  async function handleOpen(notification: AppNotification) {
    if (!notification.isRead) {
      await markNotificationAsRead(notification);
    }
    router.push(getNotificationHref(notification));
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg border border-[var(--atria-primary)]/15 p-0.5">
          {(
            [
              { id: "all", label: "Todas" },
              { id: "unread", label: "Não Lidas" },
            ] as const
          ).map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={filter === item.id ? "default" : "ghost"}
              size="sm"
              className={
                filter === item.id
                  ? "bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90"
                  : "text-[var(--atria-primary)]"
              }
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              {item.id === "unread" && unreadCount > 0 ? (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px] font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={unreadCount === 0}
          onClick={() => void markAllAsRead()}
        >
          <CheckCheck className="size-3.5" />
          Marcar todas como lidas
        </Button>
      </div>

      {loading && notifications.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--atria-primary)]/15 bg-white/60 px-4 py-12 text-center dark:bg-card/40">
          <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-[var(--atria-primary)]/8 text-[var(--atria-primary)]/45">
            <Bell className="size-6" />
          </span>
          <p className="text-sm font-medium text-[var(--atria-primary)]">
            {filter === "unread"
              ? "Nenhuma notificação não lida"
              : "Nenhuma notificação"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-[var(--atria-primary)]/50">
            Alertas de prazo, solicitações e atualizações de status aparecem
            aqui.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => {
            const collapsed = isCollapsed(group.category);
            const unread = group.items.filter((item) => !item.isRead).length;
            const listId = `notification-section-${group.category}`;

            return (
              <div key={group.category} className="flex flex-col gap-2">
                <h2>
                  <button
                    type="button"
                    onClick={() => toggle(group.category)}
                    aria-expanded={!collapsed}
                    aria-controls={listId}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2 text-left transition-colors hover:bg-[var(--atria-primary)]/5"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-[var(--atria-primary)]/45 uppercase">
                      <ChevronDown
                        className={cn(
                          "size-4 transition-transform",
                          collapsed && "-rotate-90",
                        )}
                        aria-hidden
                      />
                      {group.label}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-bold",
                        "bg-[var(--atria-primary)]/8 text-[var(--atria-primary)]/70",
                      )}
                    >
                      {group.items.length}
                      {unread > 0
                        ? ` · ${unread} não ${unread === 1 ? "lida" : "lidas"}`
                        : ""}
                    </span>
                  </button>
                </h2>
                <ul
                  id={listId}
                  hidden={collapsed}
                  className="flex flex-col gap-1.5 rounded-2xl border border-[var(--atria-primary)]/10 bg-white/70 p-2 dark:bg-card/50"
                >
                  {group.items.map((notification) => (
                    <li key={notification.id}>
                      <NotificationItem
                        notification={notification}
                        onOpen={(item) => void handleOpen(item)}
                        onMarkAsRead={(item) =>
                          void markNotificationAsRead(item)
                        }
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
