"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { MonthSwitcher } from "@/components/financial/month-switcher";
import { AudienceMetricCards } from "./audience-metric-cards";
import { ClientMetricsSelector } from "./client-metrics-selector";
import { ContentPerformanceGrid } from "./content-performance-grid";
import { ContentTypeFilter } from "./content-type-filter";
import {
  isMetaTokenExpiredError,
  useInstagramClientMetrics,
  useInstagramClientSelection,
  useInstagramContentTypeFilter,
  useInstagramConversations,
} from "@/hooks/use-instagram-insights";
import { ConversationsRanking } from "./conversations-ranking";

export function ClientMetricsDashboard() {
  const {
    clients,
    selectedClientId,
    setSelectedClientId,
    period,
    setPeriod,
    isLoadingClients,
  } = useInstagramClientSelection();
  const { contentType, setContentType } = useInstagramContentTypeFilter();

  const metricsQuery = useInstagramClientMetrics(
    selectedClientId || null,
    contentType === "all" ? undefined : contentType,
    period,
  );
  const conversationsQuery = useInstagramConversations(period);

  const expired = isMetaTokenExpiredError(metricsQuery.error);
  const periodLabel = metricsQuery.data?.period.label;

  if (!isLoadingClients && clients.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 bg-white px-6 py-12 text-center">
        <p className="text-sm text-[var(--atria-primary)]/70">
          Nenhum cliente com Instagram conectado neste tenant.
        </p>
        <p className="mt-2 text-sm text-[var(--atria-primary)]/50">
          Informe o Instagram User ID e o token Meta no cadastro do cliente.
        </p>
        <Link
          href="/clients"
          className="mt-4 inline-flex text-sm font-medium text-[var(--atria-primary)] underline-offset-4 hover:underline"
        >
          Ir para clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <MonthSwitcher period={period} onChange={setPeriod} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ClientMetricsSelector
          clients={clients}
          value={selectedClientId}
          onValueChange={setSelectedClientId}
          loading={isLoadingClients}
        />
        <ContentTypeFilter value={contentType} onChange={setContentType} />
      </div>

      {expired ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Token de acesso Meta expirado. Atualize as credenciais deste
            cliente para continuar vendo as métricas.
          </p>
        </div>
      ) : null}

      {isLoadingClients || metricsQuery.isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-[var(--atria-primary)]/5" />
      ) : metricsQuery.data ? (
        <>
          {metricsQuery.data.period.accountMetricsAvailable === false ? (
            <p className="text-xs text-[var(--atria-primary)]/50">
              O Instagram não entrega métricas de conta para meses com mais de
              30 dias. As publicações desse mês continuam listadas abaixo.
            </p>
          ) : metricsQuery.data.period.partial ? (
            <p className="text-xs text-[var(--atria-primary)]/50">
              O Instagram libera métricas de conta dos últimos 30 dias. Os
              números deste mês podem estar parciais. As publicações seguem o
              mês inteiro.
            </p>
          ) : null}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--atria-primary)]/55">
              Crescimento de audiência
              {periodLabel ? ` · ${periodLabel}` : ""}
            </h2>
            <AudienceMetricCards data={metricsQuery.data.audience} />
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--atria-primary)]/55">
              Conversas iniciadas
              {periodLabel ? ` · ${periodLabel}` : ""}
            </h2>
            {conversationsQuery.isLoading ? (
              <div className="h-40 animate-pulse rounded-2xl bg-[var(--atria-primary)]/5" />
            ) : (
              <ConversationsRanking
                clients={conversationsQuery.data?.clients ?? []}
                selectedClientId={selectedClientId}
                onSelect={setSelectedClientId}
              />
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--atria-primary)]/55">
              Performance de conteúdo
              {periodLabel ? ` · ${periodLabel}` : ""}
            </h2>
            <ContentPerformanceGrid items={metricsQuery.data.media} />
          </section>
        </>
      ) : !expired && selectedClientId ? (
        <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 bg-white px-6 py-12 text-center text-sm text-[var(--atria-primary)]/55">
          Não foi possível carregar as métricas deste cliente.
        </div>
      ) : null}
    </div>
  );
}
