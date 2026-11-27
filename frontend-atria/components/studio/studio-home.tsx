"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Lightbulb, ListTodo } from "lucide-react";
import { NotificationItem } from "@/components/notifications/notification-item";
import { ClientName } from "@/components/ui/client-name";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notifications-context";
import { useMarkNotificationAsRead } from "@/hooks/use-mark-notification-as-read";
import { getNotificationHref } from "@/lib/notification-utils";
import { cn } from "@/lib/utils";
import { studioService } from "@/services";
import type { StudioHomePayload } from "@/services/studio.service";
import type { AppNotification } from "@/services/types";

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function formatDueTime(iso: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function StudioCard({
  title,
  subtitle,
  icon,
  accentClass,
  count,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentClass: string;
  count?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-h-[22rem] flex-col rounded-3xl border border-[var(--atria-primary)]/10",
        "bg-white/55 p-5 shadow-sm shadow-[var(--atria-primary)]/5 backdrop-blur-xl",
        "dark:bg-card/45",
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-11 items-center justify-center rounded-2xl",
              accentClass,
            )}
          >
            {icon}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--atria-primary)]">
                {title}
              </h2>
              {typeof count === "number" ? (
                <span className="rounded-full bg-[var(--atria-primary)]/10 px-2 py-0.5 text-[11px] font-bold text-[var(--atria-primary)]">
                  {count}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-[var(--atria-primary)]/55">
              {subtitle}
            </p>
          </div>
        </div>
        {footer}
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--atria-primary)]/12 bg-[var(--atria-base)]/50 px-4 py-10 text-center text-sm text-[var(--atria-primary)]/50">
      {message}
    </p>
  );
}

export function StudioHome() {
  const { user } = useAuth();
  const router = useRouter();
  const { notifications, loading: notificationsLoading } = useNotifications();
  const markNotificationAsRead = useMarkNotificationAsRead();
  const [payload, setPayload] = useState<StudioHomePayload | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    studioService
      .getStudioHome()
      .then((data) => {
        if (cancelled) return;
        setPayload(data);
        setLoadState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recentNotifications = useMemo(
    () => notifications.slice(0, 12),
    [notifications],
  );

  async function handleOpenNotification(notification: AppNotification) {
    await markNotificationAsRead(notification);
    router.push(getNotificationHref(notification));
  }

  const userName = user?.name?.split(" ")[0] ?? "designer";

  return (
    <div className="relative flex flex-col gap-8 sm:gap-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-80 rounded-[2.5rem] bg-gradient-to-b from-[var(--atria-accent)]/18 via-transparent to-transparent"
      />

      <header className="space-y-2">
        <p className="text-sm font-medium text-[var(--atria-primary)]/55">
          Área do designer
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--atria-primary)] sm:text-4xl">
          Bom dia, {userName}
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 xl:gap-6">
        <StudioCard
          title="Solicitações pendentes"
          subtitle="Ideias aguardando triagem no portal do cliente"
          icon={<Lightbulb className="size-5 text-[var(--atria-primary)]" />}
          accentClass="bg-[var(--atria-accent)]/25"
          count={payload?.pendingRequests.length}
          footer={
            <Link
              href="/kanban"
              prefetch={false}
              className="text-xs font-semibold text-[var(--atria-primary)]/55 hover:text-[var(--atria-primary)]"
            >
              Abrir kanban
            </Link>
          }
        >
          {loadState === "loading" ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-1 items-center justify-center"
            >
              <span className="sr-only">Carregando</span>
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
            </div>
          ) : loadState === "error" ? (
            <EmptyState message="Não foi possível carregar as solicitações." />
          ) : (payload?.pendingRequests.length ?? 0) === 0 ? (
            <EmptyState message="Nenhuma solicitação pendente dos clientes." />
          ) : (
            <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
              {payload?.pendingRequests.map((request) => (
                <li key={request.id}>
                  <Link
                    href={`/clients/${request.clientId}`}
                    prefetch={false}
                    className="block rounded-2xl border border-[var(--atria-primary)]/8 bg-white/70 px-3.5 py-3 transition hover:border-[var(--atria-accent)]/40 hover:bg-white dark:bg-background/40"
                  >
                    {request.clientName ? (
                      <ClientName className="mb-1 block text-[11px] text-[var(--atria-primary)]/70">
                        {request.clientName}
                      </ClientName>
                    ) : null}
                    <p className="truncate text-sm font-medium text-[var(--atria-primary)]">
                      {request.title}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--atria-primary)]/45">
                      {formatDateTime(request.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </StudioCard>

        <StudioCard
          title="Tarefas de hoje"
          subtitle="Com prazo para hoje, fora da coluna final"
          icon={<ListTodo className="size-5 text-[var(--atria-primary)]" />}
          accentClass="bg-[var(--atria-primary)]/8"
          count={payload?.tasksDueToday.length}
        >
          {loadState === "loading" ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-1 items-center justify-center"
            >
              <span className="sr-only">Carregando</span>
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
            </div>
          ) : loadState === "error" ? (
            <EmptyState message="Não foi possível carregar suas tarefas." />
          ) : (payload?.tasksDueToday.length ?? 0) === 0 ? (
            <EmptyState message="Nenhuma tarefa com prazo hoje." />
          ) : (
            <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
              {payload?.tasksDueToday.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/kanban?taskId=${encodeURIComponent(task.id)}`}
                    prefetch={false}
                    className="block rounded-2xl border border-[var(--atria-primary)]/8 bg-white/70 px-3.5 py-3 transition hover:border-[var(--atria-accent)]/40 hover:bg-white dark:bg-background/40"
                  >
                    <p className="truncate text-sm font-medium text-[var(--atria-primary)]">
                      {task.title}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--atria-primary)]/45">
                      {task.clientName ? `${task.clientName} · ` : ""}
                      {task.column}
                      {task.dueDate ? ` · ${formatDueTime(task.dueDate)}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </StudioCard>

        <StudioCard
          title="Notificações"
          subtitle="Os avisos mais recentes da sua conta"
          icon={<Bell className="size-5 text-[var(--atria-primary)]" />}
          accentClass="bg-[var(--atria-accent)]/20"
          count={recentNotifications.length}
        >
          {notificationsLoading && recentNotifications.length === 0 ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-1 items-center justify-center"
            >
              <span className="sr-only">Carregando</span>
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
            </div>
          ) : recentNotifications.length === 0 ? (
            <EmptyState message="Nenhuma notificação por enquanto." />
          ) : (
            <ul className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto rounded-2xl border border-[var(--atria-primary)]/8 bg-white/50 p-2 dark:bg-background/30">
              {recentNotifications.map((notification) => (
                <li key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    compact
                    onOpen={(item) => void handleOpenNotification(item)}
                    onMarkAsRead={(item) => void markNotificationAsRead(item)}
                  />
                </li>
              ))}
            </ul>
          )}
        </StudioCard>
      </div>
    </div>
  );
}
