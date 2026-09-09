"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardNotifications } from "@/components/dashboard/dashboard-notifications";
import { DashboardPulse } from "@/components/dashboard/dashboard-pulse";
import { DashboardFocus } from "@/components/dashboard/dashboard-focus";
import { PendingRequestsHighlight } from "@/components/dashboard/pending-requests-highlight";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notifications-context";
import { cn } from "@/lib/utils";
import { clientRequestsService, dashboardService } from "@/services";
import type { ClientRequest, DashboardOverview } from "@/services/types";

type DashboardTab = "overview" | "notifications";

function DashboardLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { unreadCount } = useNotifications();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const tab: DashboardTab =
    searchParams.get("tab") === "notifications" ? "notifications" : "overview";

  const setTab = useCallback(
    (next: DashboardTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "notifications") params.set("tab", "notifications");
      else params.delete("tab");
      const query = params.toString();
      router.replace(query ? `/dashboard?${query}` : "/dashboard", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, pending] = await Promise.all([
        dashboardService.getDashboardOverview(),
        clientRequestsService
          .getClientRequests({ status: "pending" })
          .catch(() => [] as ClientRequest[]),
      ]);
      setData(overview);
      setPendingRequests(pending);
    } catch {
      setData(null);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const fallbackName = user?.name ?? "time";
  const notificationCount = Math.max(
    unreadCount,
    data?.user.notificationCount ?? 0,
  );

  if (tab === "overview" && loading && !data) {
    return <DashboardLoading />;
  }

  return (
    <div className="relative flex flex-col gap-6 sm:gap-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-72 rounded-[2rem] bg-gradient-to-b from-[var(--atria-accent)]/15 via-transparent to-transparent"
      />

      <WelcomeHeader
        userName={data?.user.name ?? fallbackName}
        notificationCount={notificationCount}
        onNotificationsClick={() => setTab("notifications")}
      />

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--atria-primary)]/10 bg-white/60 p-1.5 backdrop-blur-md dark:bg-card/50">
        {(
          [
            { id: "overview", label: "Visão Geral" },
            { id: "notifications", label: "Notificações" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all",
              tab === item.id
                ? "bg-[var(--atria-primary)] text-white shadow-sm"
                : "text-[var(--atria-primary)]/70 hover:bg-white/80 hover:text-[var(--atria-primary)]",
            )}
          >
            {item.label}
            {item.id === "notifications" && unreadCount > 0 ? (
              <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--atria-accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--atria-primary)]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "notifications" ? (
        <DashboardNotifications />
      ) : (
        <>
          <PendingRequestsHighlight requests={pendingRequests} />

          {data ? (
            <>
              <DashboardPulse data={data} />
              <DashboardFocus data={data} />
            </>
          ) : (
            <p className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 bg-white/60 px-4 py-8 text-center text-sm text-[var(--atria-primary)]/50">
              Não foi possível carregar o resumo agora. Tente novamente em
              instantes.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
