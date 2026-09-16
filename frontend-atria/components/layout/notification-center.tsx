"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Wallet } from "lucide-react";
import { NotificationItem } from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/contexts/notifications-context";
import { useMarkNotificationAsRead } from "@/hooks/use-mark-notification-as-read";
import { formatCurrency } from "@/lib/financial-utils";
import { getNotificationHref } from "@/lib/notification-utils";
import { financeService } from "@/services";
import type { AppNotification, FinanceDueTodayAlerts } from "@/services/types";
import { cn } from "@/lib/utils";

const FINANCE_POLL_MS = 30_000;

interface NotificationCenterProps {
  tone?: "light" | "dark";
}

export function NotificationCenter({ tone = "light" }: NotificationCenterProps) {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } =
    useNotifications();
  const markNotificationAsRead = useMarkNotificationAsRead();
  const [financeAlerts, setFinanceAlerts] =
    useState<FinanceDueTodayAlerts | null>(null);
  const [open, setOpen] = useState(false);

  const loadFinance = useCallback(async () => {
    try {
      setFinanceAlerts(await financeService.getDueTodayAlerts());
    } catch {
      setFinanceAlerts(null);
    }
  }, []);

  useEffect(() => {
    void loadFinance();
    const interval = window.setInterval(() => void loadFinance(), FINANCE_POLL_MS);
    return () => window.clearInterval(interval);
  }, [loadFinance]);

  const financeDueCount =
    (financeAlerts?.totals.dueTodayCount ?? 0) +
    (financeAlerts?.totals.overdueCount ?? 0);
  const badgeCount = unreadCount + financeDueCount;
  const latest = notifications.slice(0, 5);

  async function handleOpen(notification: AppNotification) {
    setOpen(false);
    if (!notification.isRead) {
      await markNotificationAsRead(notification);
    }
    router.push(getNotificationHref(notification));
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          void refresh();
          void loadFinance();
        }
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              "relative",
              tone === "dark"
                ? "text-white/80 hover:bg-white/10 hover:text-white"
                : "text-[var(--atria-primary)] hover:bg-[var(--atria-primary)]/5",
            )}
            aria-label="Notificações"
          />
        }
      >
        <Bell className="size-5" />
        {badgeCount > 0 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--atria-accent)] px-1 text-[10px] font-bold text-[var(--atria-primary)] ring-2",
              tone === "dark" ? "ring-[var(--atria-sidebar)]" : "ring-[var(--atria-base)]",
            )}
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 text-[var(--atria-primary)]">
            Notificações
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-[var(--atria-primary)]/60"
              onClick={() => void markAllAsRead()}
            >
              <CheckCheck className="mr-1 size-3" />
              Marcar todas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {financeDueCount > 0 && financeAlerts ? (
          <>
            <div className="px-3 py-2">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--atria-primary)]/50">
                <Wallet className="size-3.5" />
                Financeiro
              </div>
              <p className="mb-2 text-sm font-medium text-[var(--atria-primary)]">
                {financeAlerts.totals.dueTodayCount > 0
                  ? `${financeAlerts.totals.dueTodayCount} conta(s) vencem hoje`
                  : null}
                {financeAlerts.totals.dueTodayCount > 0 &&
                financeAlerts.totals.overdueCount > 0
                  ? " · "
                  : null}
                {financeAlerts.totals.overdueCount > 0
                  ? `${financeAlerts.totals.overdueCount} em atraso`
                  : null}
              </p>
              <div className="max-h-28 space-y-2 overflow-y-auto">
                {financeAlerts.alerts.slice(0, 3).map((item) => (
                  <p
                    key={item.id}
                    className="truncate rounded-lg border border-[var(--atria-primary)]/10 bg-[var(--atria-accent)]/10 px-2 py-1.5 text-xs text-[var(--atria-primary)]"
                  >
                    {item.title ?? item.description} · {formatCurrency(item.amount)}
                  </p>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                render={<Link href="/financial" />}
                onClick={() => setOpen(false)}
              >
                Abrir financeiro
              </Button>
            </div>
            <DropdownMenuSeparator />
          </>
        ) : null}

        {latest.length === 0 && financeDueCount === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Nenhuma notificação
          </p>
        ) : latest.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            Sem notificações recentes
          </p>
        ) : (
          <div className="flex flex-col gap-1 px-1.5 py-1.5">
            {latest.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                compact
                onOpen={(item) => void handleOpen(item)}
                onMarkAsRead={(item) => void markNotificationAsRead(item)}
              />
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <div className="p-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-center text-[var(--atria-primary)]"
            render={<Link href="/dashboard?tab=notifications" />}
            onClick={() => setOpen(false)}
          >
            Ver todas as notificações
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
