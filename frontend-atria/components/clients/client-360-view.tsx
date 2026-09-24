"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Client360TabPills,
  type Client360Tab,
} from "@/components/clients/client-360-tab-pills";
import { ClientCalendarTab } from "@/components/clients/client-calendar-tab";
import { ClientFinancialTab } from "@/components/clients/client-financial-tab";
import { ClientOpenTasks } from "@/components/clients/client-open-tasks";
import { ClientPipelineTab } from "@/components/clients/client-pipeline-tab";
import { ClientRequestsTab } from "@/components/clients/client-requests-tab";
import { ClientSummaryBanner } from "@/components/clients/client-summary-banner";
import { ClientAccessTab } from "@/components/clients/client-access-tab";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { DeactivateClientButton } from "@/components/clients/deactivate-client-button";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { clientsService } from "@/services";
import type {
  Client360Assets,
  Client360Calendar,
  Client360Financial,
  Client360Pipeline,
  Client360Summary,
  Client360Tasks,
} from "@/services/types";

export function Client360View() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const { canManageClientDirectory } = usePermissions();
  const canManageClients = canManageClientDirectory();

  const [activeTab, setActiveTab] = useState<Client360Tab>("pipeline");
  const [summary, setSummary] = useState<Client360Summary | null>(null);
  const [tasks, setTasks] = useState<Client360Tasks | null>(null);
  const [tabData, setTabData] = useState<
    Client360Pipeline | Client360Financial | Client360Calendar | Client360Assets | null
  >(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!clientId) return;
    setLoadingSummary(true);
    try {
      const data = await clientsService.getClient360<Client360Summary>(
        clientId,
        "summary",
      );
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, [clientId]);

  const loadTasks = useCallback(async () => {
    if (!clientId) return;
    setLoadingTasks(true);
    try {
      const data = await clientsService.getClient360<Client360Tasks>(
        clientId,
        "tasks",
      );
      setTasks(data);
    } catch {
      setTasks(null);
    } finally {
      setLoadingTasks(false);
    }
  }, [clientId]);

  const loadTab = useCallback(
    async (tab: Client360Tab) => {
      if (!clientId || tab === "requests" || tab === "access") return;
      setLoadingTab(true);
      try {
        const data = await clientsService.getClient360(clientId, tab);
        setTabData(data as typeof tabData);
      } catch {
        setTabData(null);
      } finally {
        setLoadingTab(false);
      }
    },
    [clientId],
  );

  useEffect(() => {
    void loadSummary();
    void loadTasks();
  }, [loadSummary, loadTasks]);

  useEffect(() => {
    void loadTab(activeTab);
  }, [activeTab, loadTab]);

  function handleRefresh() {
    void loadSummary();
    void loadTasks();
    void loadTab(activeTab);
  }

  if (loadingSummary) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-[var(--atria-primary)]/60">
          Cliente não encontrado.
        </p>
        <Link
          href="/clients"
          className="text-sm font-medium text-[var(--atria-primary)] hover:underline"
        >
          Voltar para clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--atria-primary)]/60 hover:text-[var(--atria-primary)]"
        >
          <ArrowLeft className="size-4" />
          Clientes
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <DeactivateClientButton
            client={summary.client}
            onUpdated={handleRefresh}
          />
          {canManageClients && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              Editar cliente
            </Button>
          )}
        </div>
      </div>

      <ClientSummaryBanner data={summary} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Client360TabPills activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === "requests" ? (
            <ClientRequestsTab
              clientId={clientId}
              clientName={summary.client.companyName}
              onUpdated={handleRefresh}
            />
          ) : activeTab === "access" ? (
            <ClientAccessTab
              clientId={clientId}
              companyName={summary.client.companyName}
            />
          ) : loadingTab ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="size-7 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
            </div>
          ) : (
            <>
              {activeTab === "pipeline" && tabData?.section === "pipeline" && (
                <ClientPipelineTab
                  data={tabData}
                  clientId={clientId}
                />
              )}
              {activeTab === "financial" && tabData?.section === "financial" && (
                <ClientFinancialTab data={tabData} />
              )}
              {activeTab === "calendar" && tabData?.section === "calendar" && (
                <ClientCalendarTab data={tabData} />
              )}
            </>
          )}
        </div>

        <div>
          {loadingTasks ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="size-6 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
            </div>
          ) : tasks ? (
            <ClientOpenTasks data={tasks} />
          ) : null}
        </div>
      </div>

      <ClientFormDialog
        client={summary.client}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={handleRefresh}
        trigger={false}
      />
    </div>
  );
}
