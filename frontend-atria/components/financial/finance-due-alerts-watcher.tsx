"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { useAuth } from "@/contexts/auth-context";
import { useDueTodayAlerts } from "@/hooks/use-finance";

const SESSION_KEY = "atria_finance_due_toast_date";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function FinanceDueAlertsWatcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const firedRef = useRef(false);
  const onDashboardOrFinance =
    pathname?.startsWith("/dashboard") || pathname?.startsWith("/financial");
  const enabled =
    isAuthenticated &&
    Boolean(user) &&
    user?.role !== "client" &&
    Boolean(onDashboardOrFinance);

  const { data: alerts } = useDueTodayAlerts({ enabled });

  useEffect(() => {
    if (!enabled || !alerts || firedRef.current) return;

    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored === todayKey()) {
      firedRef.current = true;
      return;
    }

    const dueCount = alerts.totals.dueTodayCount;
    const overdueCount = alerts.totals.overdueCount;
    const total = dueCount + overdueCount;

    if (total <= 0) {
      firedRef.current = true;
      sessionStorage.setItem(SESSION_KEY, todayKey());
      return;
    }

    const parts: string[] = [];
    if (dueCount > 0) {
      parts.push(`${dueCount} conta${dueCount > 1 ? "s" : ""} vencem hoje`);
    }
    if (overdueCount > 0) {
      parts.push(
        `${overdueCount} conta${overdueCount > 1 ? "s" : ""} em atraso`,
      );
    }

    toast.warning(`Atenção: ${parts.join(" e ")}!`, {
      description: "Revise o financeiro e marque pagamentos concluídos.",
      action: {
        label: "Abrir financeiro",
        onClick: () => router.push("/financial"),
      },
      duration: 10_000,
    });

    firedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, todayKey());
  }, [alerts, enabled, router]);

  return null;
}
