"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FinanceDueToast } from "@/components/financial/finance-due-toast";
import { toast } from "@/lib/toast";
import { useAuth } from "@/contexts/auth-context";
import { useDueTodayAlerts } from "@/hooks/use-finance";

const SESSION_KEY = "atria_finance_due_toast_date";
const TOAST_ID = "finance-due-alert";

const noSubscription = () => () => {};

// Pré-visualização em desenvolvimento: ?toastFinanceiro=1 na URL ignora o
// "uma vez por dia", usa contagens de exemplo se não houver contas e deixa o
// toast parado na tela para ajustar o visual.
function useToastPreview() {
  return useSyncExternalStore(
    noSubscription,
    () =>
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).has("toastFinanceiro"),
    () => false,
  );
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function FinanceDueAlertsWatcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const firedRef = useRef(false);
  const preview = useToastPreview();
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
    if (!preview && stored === todayKey()) {
      firedRef.current = true;
      return;
    }

    const hasRealAlerts =
      alerts.totals.dueTodayCount + alerts.totals.overdueCount > 0;
    const dueCount =
      preview && !hasRealAlerts ? 2 : alerts.totals.dueTodayCount;
    const overdueCount =
      preview && !hasRealAlerts ? 1 : alerts.totals.overdueCount;

    firedRef.current = true;
    if (!preview) sessionStorage.setItem(SESSION_KEY, todayKey());
    if (dueCount + overdueCount <= 0) return;

    toast.custom(
      () => (
        <FinanceDueToast
          dueCount={dueCount}
          overdueCount={overdueCount}
          onOpen={() => {
            toast.dismiss(TOAST_ID);
            router.push("/financial");
          }}
          onClose={() => toast.dismiss(TOAST_ID)}
        />
      ),
      { id: TOAST_ID, duration: preview ? Infinity : 10_000 },
    );
  }, [alerts, enabled, preview, router]);

  return null;
}
