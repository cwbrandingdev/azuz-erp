"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  Shield,
} from "lucide-react";
import { PortalContentDashboard } from "@/components/portal/portal-content-dashboard";
import { PortalAssetsDropzone } from "@/components/portal/portal-assets-dropzone";
import { PortalCalendarView } from "@/components/portal/portal-calendar-view";
import { PortalContractsCenter } from "@/components/portal/portal-contracts-center";
import { PortalReportsViewer } from "@/components/portal/portal-reports-viewer";
import { PortalFinanceDashboard } from "@/components/portal/portal-finance-dashboard";
import { PortalCrmPanel } from "@/components/portal/portal-crm-panel";
import { PortalRequestsPanel } from "@/components/portal/portal-requests-panel";
import { PortalShell } from "@/components/portal/portal-shell";
import { type PortalTab } from "@/components/portal/portal-sidebar";
import type { PortalActionHandlers } from "@/components/portal/portal-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePortalAuth } from "@/contexts/portal-auth-context";
import { isCrmEnabledForUser } from "@/lib/crm-access";
import { portalService } from "@/services";
import type { PortalData } from "@/services/types";

const SESSION_PORTAL_ACTIONS: PortalActionHandlers = {
  approvePost: portalService.approvePortalPost,
  rejectPost: portalService.rejectPortalPost,
  getContract: portalService.getPortalContract,
  signContract: portalService.signPortalContract,
  getReport: portalService.getPortalReport,
  uploadAsset: portalService.uploadPortalAsset,
  submitBriefing: portalService.submitPortalBriefing,
  listRequests: portalService.listRequests,
  createRequest: portalService.createRequest,
  addRequestComment: portalService.addRequestComment,
  getDeliverableFullView: portalService.getDeliverableFullView,
  listDeliverables: portalService.listDeliverables,
  reviseDeliverableItem: portalService.reviseDeliverableItem,
  resolveAssetUrl: portalService.resolvePortalAssetUrl,
};

const PORTAL_TABS: PortalTab[] = [
  "approval",
  "requests",
  "calendar",
  "contracts",
  "reports",
  "assets",
  "finance",
  "crm",
];

export function ClientPortalApp() {
  const { logout } = usePortalAuth();
  const searchParams = useSearchParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTab>("approval");

  const hasCrmEnabled = isCrmEnabledForUser(data?.client?.hasCrmEnabled);

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await portalService.getPortalData();
      setData(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sessão inválida ou expirada.";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab") as PortalTab | null;
    if (!requestedTab || !PORTAL_TABS.includes(requestedTab)) {
      return;
    }
    if (requestedTab === "crm" && !hasCrmEnabled) {
      setActiveTab("approval");
      return;
    }
    setActiveTab(requestedTab);
  }, [hasCrmEnabled, searchParams]);

  useEffect(() => {
    if (activeTab === "crm" && !hasCrmEnabled) {
      setActiveTab("approval");
    }
  }, [activeTab, hasCrmEnabled]);

  const contentActions = useMemo(
    () => ({
      approvePost: SESSION_PORTAL_ACTIONS.approvePost,
      rejectPost: SESSION_PORTAL_ACTIONS.rejectPost,
      resolveAssetUrl: SESSION_PORTAL_ACTIONS.resolveAssetUrl,
      getDeliverableFullView: SESSION_PORTAL_ACTIONS.getDeliverableFullView,
      listDeliverables: SESSION_PORTAL_ACTIONS.listDeliverables,
      reviseDeliverableItem: SESSION_PORTAL_ACTIONS.reviseDeliverableItem,
    }),
    [],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--atria-base,#F8F8F6)]">
        <Loader2 className="size-8 animate-spin text-[var(--atria-primary)]" />
      </div>
    );
  }

  if (error || !data?.client) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--atria-base,#F8F8F6)] p-6 text-center">
        <Shield className="size-12 text-[var(--atria-primary)]/30" />
        <h1 className="text-xl font-semibold text-[var(--atria-primary)]">
          Acesso não disponível
        </h1>
        <p className="max-w-md text-sm text-[var(--atria-primary)]/60">
          {error}
        </p>
        <Button variant="outline" onClick={() => void logout()}>
          <LogOut className="mr-2 size-4" />
          Voltar ao login
        </Button>
      </div>
    );
  }

  const { accountStatus } = data;

  return (
    <PortalShell
      data={data}
      onLogout={() => void logout()}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      hasCrmEnabled={hasCrmEnabled}
      tabCounts={{
        approval: accountStatus.pendingApprovals,
        contracts: data.contracts.length,
        reports: data.recentReports.length,
      }}
    >
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {[
          {
            label: "Contratos ativos",
            value: accountStatus.activeContracts,
            icon: CheckCircle2,
          },
          {
            label: "Aguardando aprovação",
            value: accountStatus.pendingApprovals,
            icon: Clock,
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="rounded-2xl border-[var(--atria-primary)]/10 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[var(--atria-accent)]/20 p-2 text-[var(--atria-primary)]">
                <item.icon className="size-5" />
              </div>
              <div>
                <p className="text-xs text-[var(--atria-primary)]/50">
                  {item.label}
                </p>
                <p className="text-xl font-bold text-[var(--atria-primary)]">
                  {item.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {activeTab === "approval" && (
        <PortalContentDashboard
          pipeline={data.contentPipeline ?? []}
          onRefresh={loadPortal}
          onOpenRequests={() => setActiveTab("requests")}
          actions={contentActions}
        />
      )}
      {activeTab === "requests" && (
        <PortalRequestsPanel actions={SESSION_PORTAL_ACTIONS} />
      )}
      {activeTab === "calendar" && (
        <PortalCalendarView
          loadCalendar={(from, to) =>
            portalService.getPortalCalendar(from, to)
          }
        />
      )}
      {activeTab === "contracts" && (
        <PortalContractsCenter
          contracts={data.contracts}
          onRefresh={loadPortal}
        />
      )}
      {activeTab === "reports" && (
        <PortalReportsViewer reports={data.recentReports} />
      )}
      {activeTab === "finance" && data.client && (
        <PortalFinanceDashboard
          loadFinances={() => portalService.getFinances()}
          loadFinanceDocuments={() => portalService.listFinanceDocuments()}
          uploadFinanceDocument={(file) =>
            portalService.uploadFinanceDocument(file)
          }
          resolveAssetUrl={portalService.resolvePortalAssetUrl}
        />
      )}
      {activeTab === "crm" && hasCrmEnabled && data.client && (
        <PortalCrmPanel companyName={data.client.companyName} />
      )}
      {activeTab === "assets" && (
        <PortalAssetsDropzone
          recentBriefs={data.recentBriefs ?? []}
          onRefresh={loadPortal}
        />
      )}
    </PortalShell>
  );
}
