"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  PROSPECTING_LEADS_KEY,
  useProspectingLeads,
} from "@/hooks/use-company-search";
import { useSimulatedSearchProgress } from "@/hooks/use-simulated-search-progress";
import {
  readPersistedMapsProspectingState,
  writePersistedMapsProspectingState,
} from "@/lib/lead-prospecting-persistence";
import { AddToKanbanOrganizationDialog } from "@/components/leads/add-to-kanban-organization-dialog";
import { ProspectingLeadsList } from "@/components/leads/prospecting-leads-list";
import {
  MapsSearchForm,
  type MapsSearchFormValues,
} from "@/components/leads/maps-search-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useCrmUsers } from "@/hooks/use-crm-users";
import { useSdrAssignedOrganizations } from "@/hooks/use-sdr-assigned-organizations";
import {
  buildAddToKanbanInput,
  isExternalLeadId,
  leadMinerLeadToPreviewLead,
  type ExternalLeadSearchContext,
} from "@/lib/lead-external-utils";
import {
  leadsForMapsSearch,
  useMapsSearchHistory,
  type MapsSearchRecord,
} from "@/lib/maps-search-history";
import { isMasterOrAdmin, normalizeAppRole } from "@/lib/permissions";
import { toast } from "@/lib/toast";
import { ApiError } from "@/services/api";
import { leadsService } from "@/services";
import type { Lead } from "@/services/types";
import {
  MAPS_FETCH_TIMEOUT_MS,
  MAX_LEADMINER_SEARCH_RESULTS,
} from "@/lib/lead-search-limits";
import { fetchMapsLeads } from "@/services/leads.service";
import {
  importLeadMinerLeads,
  pollLeadMinerJob,
  startLeadMinerSearch,
  type LeadMinerLead,
} from "@/services/leadminer.service";

const DEFAULT_FORM_VALUES: MapsSearchFormValues = {
  category: "",
  uf: "SP",
  city: "",
  neighborhood: "",
};

const MAPS_PROSPECT_SOURCES = new Set([
  "leadminer",
  "serpapi",
  "apify",
  "outscraper",
]);

function normalizeFilterText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesNameQuery(lead: Lead, query: string) {
  const normalized = normalizeFilterText(query);
  if (!normalized) return true;
  return normalizeFilterText(lead.name ?? "").includes(normalized);
}

function isMapsLead(lead: Lead) {
  const source = lead.source?.trim().toLowerCase();
  return Boolean(source && MAPS_PROSPECT_SOURCES.has(source));
}

function isCrmRole(role: string | null | undefined) {
  return normalizeAppRole(role) === "crm";
}

/** True when the niche field is only digits (CNAE-like), not a text niche. */
export function isNumericOnlyNiche(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length > 0 && digits === trimmed.replace(/[\s./-]/g, "");
}

interface LeadsSearchPanelProps {
  modeTabs?: ReactNode;
}

export function LeadsSearchPanel({ modeTabs }: LeadsSearchPanelProps) {
  const { user } = useAuth();
  const canAssignOwner = isMasterOrAdmin(user?.role);
  const { users: crmUsers } = useCrmUsers(canAssignOwner);
  const { organizations } = useSdrAssignedOrganizations(Boolean(user));
  const persistedMapsState = readPersistedMapsProspectingState();
  const queryClient = useQueryClient();
  const prospectingLeadsQuery = useProspectingLeads();

  const [formValues, setFormValues] = useState<MapsSearchFormValues>(
    () => persistedMapsState?.formValues ?? DEFAULT_FORM_VALUES,
  );
  const [nameFilter, setNameFilter] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchProgress = useSimulatedSearchProgress(loading);
  const [addingKanbanId, setAddingKanbanId] = useState<string | null>(null);
  const [externalPreviewLeads, setExternalPreviewLeads] = useState<Lead[]>(
    () => persistedMapsState?.externalPreviewLeads ?? [],
  );
  const [searchContext, setSearchContext] =
    useState<ExternalLeadSearchContext | null>(
      () => persistedMapsState?.searchContext ?? null,
    );
  const [hasSearched, setHasSearched] = useState(
    () => persistedMapsState?.hasSearched ?? false,
  );
  const [selectedSearchId, setSelectedSearchId] = useState<string | null>(
    () => persistedMapsState?.selectedSearchId ?? null,
  );
  const [activeSearchEmpty, setActiveSearchEmpty] = useState(false);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [kanbanModalOpen, setKanbanModalOpen] = useState(false);
  const [pendingKanbanLeads, setPendingKanbanLeads] = useState<Lead[]>([]);
  const [confirmingKanban, setConfirmingKanban] = useState(false);

  const savedLeads = prospectingLeadsQuery.data ?? [];
  const savedMapsLeads = useMemo(
    () => savedLeads.filter(isMapsLead),
    [savedLeads],
  );
  const { records, rememberSearch } = useMapsSearchHistory(savedMapsLeads);
  const orderedRecords = useMemo(
    () =>
      [...records].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      ),
    [records],
  );
  const selectedRecord =
    orderedRecords.find((record) => record.id === selectedSearchId) ??
    (!loading &&
    externalPreviewLeads.length === 0 &&
    !activeSearchEmpty
      ? orderedRecords[0]
      : undefined);
  const historyLeads = useMemo(
    () => leadsForMapsSearch(selectedRecord, savedMapsLeads),
    [selectedRecord, savedMapsLeads],
  );
  const leads = loading
    ? []
    : externalPreviewLeads.length > 0 || activeSearchEmpty
      ? externalPreviewLeads
      : historyLeads;

  const initialLoading =
    prospectingLeadsQuery.isLoading && !prospectingLeadsQuery.data;

  useEffect(() => {
    if (
      loading ||
      activeSearchEmpty ||
      externalPreviewLeads.length > 0 ||
      orderedRecords.length === 0
    ) {
      return;
    }
    if (
      selectedSearchId &&
      orderedRecords.some((record) => record.id === selectedSearchId)
    ) {
      return;
    }
    const next = orderedRecords[0];
    setSelectedSearchId(next.id);
    setHasSearched(true);
    setSearchContext({
      city: next.city,
      neighborhood: next.neighborhood || next.city,
      category: next.category,
    });
    setFormValues((current) => ({
      ...current,
      category: next.category,
      city: next.city,
      neighborhood:
        next.neighborhood && next.neighborhood !== next.city
          ? next.neighborhood
          : "",
      uf: next.uf || current.uf,
    }));
  }, [
    loading,
    activeSearchEmpty,
    externalPreviewLeads.length,
    orderedRecords,
    selectedSearchId,
  ]);

  useEffect(() => {
    writePersistedMapsProspectingState({
      formValues,
      hasSearched,
      searchContext,
      externalPreviewLeads,
      selectedSearchId,
    });
  }, [
    externalPreviewLeads,
    formValues,
    hasSearched,
    searchContext,
    selectedSearchId,
  ]);

  useEffect(() => {
    if (isNumericOnlyNiche(formValues.category)) {
      setCategoryError(
        "A pesquisa do Google Maps espera somente termos/nichos, não números.",
      );
    } else {
      setCategoryError(null);
    }
  }, [formValues.category]);

  async function refreshSavedLeads() {
    await queryClient.invalidateQueries({ queryKey: PROSPECTING_LEADS_KEY });
    await queryClient.refetchQueries({ queryKey: PROSPECTING_LEADS_KEY });
  }

  const results = useMemo(
    () => leads.filter((lead) => matchesNameQuery(lead, nameFilter)),
    [leads, nameFilter],
  );

  const loadingResults = loading || initialLoading;

  async function rememberMapsSearch(
    saved: Lead[],
    context: ExternalLeadSearchContext,
    uf: string,
  ) {
    if (saved.length === 0) return;
    const record: MapsSearchRecord = {
      id: crypto.randomUUID(),
      category: context.category,
      city: context.city,
      neighborhood: context.neighborhood || context.city,
      uf,
      createdAt: new Date().toISOString(),
      leadIds: saved.map((lead) => lead.id),
    };
    rememberSearch(record);
    setSelectedSearchId(record.id);
    setActiveSearchEmpty(false);
    await refreshSavedLeads();
    setExternalPreviewLeads([]);
  }

  async function runLeadMinerSearchFlow(
    context: ExternalLeadSearchContext,
    city: string,
    neighborhood: string,
    category: string,
    uf: string,
  ) {
    const { job_id } = await startLeadMinerSearch({
      city,
      neighborhood,
      category,
      max_results: MAX_LEADMINER_SEARCH_RESULTS,
    });

    const job = await pollLeadMinerJob(job_id, (status) => {
      setJobStatus(status);
    });

    if (job.status === "failed") {
      toast.error(job.error ?? "Falha ao buscar leads.");
      await refreshSavedLeads();
      return;
    }

    const previewLeads =
      job.data?.map((item, index) =>
        leadMinerLeadToPreviewLead(item, context, index),
      ) ?? [];
    setExternalPreviewLeads(previewLeads);
    setActiveSearchEmpty(previewLeads.length === 0);

    if (previewLeads.length > 0) {
      toast.success(
        `${previewLeads.length} lead(s) encontrados para ${category}.`,
      );
    } else {
      toast.info(`Nenhum lead encontrado para ${category}.`);
    }

    if (job.data && job.data.length > 0) {
      void saveSearchLeads(job.data, context, uf);
    }
  }

  async function handleSearch() {
    const city = formValues.city.trim();
    const neighborhood = formValues.neighborhood.trim();
    const category = formValues.category.trim();
    const uf = formValues.uf.trim();

    if (!city || !category) {
      toast.error("Preencha nicho e cidade para buscar leads.");
      return;
    }

    if (isNumericOnlyNiche(category)) {
      const message =
        "A pesquisa do Google Maps espera somente termos/nichos, não números.";
      setCategoryError(message);
      toast.error(message);
      return;
    }

    const context: ExternalLeadSearchContext = {
      city,
      neighborhood: neighborhood || city,
      category,
    };

    setHasSearched(true);
    setActiveSearchEmpty(false);
    setSelectedSearchId(null);
    setLoading(true);
    setJobStatus("processing");
    setSearchContext(context);
    setExternalPreviewLeads([]);
    setNameFilter("");

    try {
      const saved = await fetchMapsLeads(
        {
          city,
          category,
          neighborhood: neighborhood || city,
        },
        { timeoutMs: MAPS_FETCH_TIMEOUT_MS },
      );

      setJobStatus(null);
      setExternalPreviewLeads(saved);
      setActiveSearchEmpty(saved.length === 0);

      if (saved.length > 0) {
        const withSocial = saved.filter(
          (lead) => lead.website?.trim() || lead.instagram?.trim(),
        ).length;
        toast.success(
          `${saved.length} lead(s) encontrados (${withSocial} com site ou Instagram).`,
        );
        await rememberMapsSearch(saved, context, uf);
      } else {
        toast.info(`Nenhum lead encontrado para ${category}.`);
      }
    } catch (error) {
      const useLeadMinerFallback =
        error instanceof ApiError &&
        (error.status === 400 || error.status === 408 || error.status === 502);

      if (useLeadMinerFallback) {
        setJobStatus("pending");
        try {
          await runLeadMinerSearchFlow(
            context,
            city,
            neighborhood,
            category,
            uf,
          );
        } catch (fallbackError) {
          if (!(fallbackError instanceof ApiError)) {
            toast.error(
              fallbackError instanceof Error
                ? fallbackError.message
                : "Falha ao buscar leads no Google Maps.",
            );
          }
          try {
            await refreshSavedLeads();
          } catch {
            /* toast handled by api */
          }
        }
        return;
      }

      if (!(error instanceof ApiError)) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Falha ao buscar leads no Google Maps.",
        );
      }
      try {
        await refreshSavedLeads();
      } catch {
        /* toast handled by api */
      }
    } finally {
      setLoading(false);
      setJobStatus(null);
    }
  }

  function shouldOpenOrganizationModal() {
    if (isCrmRole(user?.role) || canAssignOwner) return true;
    return organizations.length !== 1;
  }

  function getDefaultOrganizationId() {
    if (organizations.length === 1) return organizations[0]?.id ?? "";
    return "";
  }

  async function addLeadsToKanban(
    leadsToAdd: Lead[],
    organizationId: string,
    ownerUserId?: string,
  ) {
    if (leadsToAdd.length === 1) {
      setAddingKanbanId(leadsToAdd[0].id);
    }

    let added = 0;

    try {
      for (const lead of leadsToAdd) {
        try {
          const payload = {
            ...buildAddToKanbanInput(
              lead,
              searchContext ?? undefined,
              organizationId,
            ),
            ...(ownerUserId ? { ownerUserId } : {}),
          };
          const updated = await leadsService.addToKanban(payload, {
            skipToast: true,
          });
          added += 1;
          queryClient.setQueryData<Lead[]>(PROSPECTING_LEADS_KEY, (current) => {
            const list = current ?? [];
            const withoutExternal = list.filter((item) => item.id !== lead.id);
            const exists = withoutExternal.some(
              (item) => item.id === updated.id,
            );
            if (exists) {
              return withoutExternal.map((item) =>
                item.id === updated.id ? updated : item,
              );
            }
            return [updated, ...withoutExternal];
          });
          if (isExternalLeadId(lead.id)) {
            setExternalPreviewLeads((current) =>
              current.filter((item) => item.id !== lead.id),
            );
          }
        } catch {
          /* continue with next lead */
        }
      }

      if (added > 0) {
        toast.success(
          added === 1
            ? `${leadsToAdd[0]?.name ?? "Lead"} adicionado ao kanban.`
            : `${added} lead(s) adicionados ao kanban.`,
        );
      } else {
        toast.error("Não foi possível adicionar os leads ao kanban.");
      }
    } finally {
      setAddingKanbanId(null);
    }
  }

  function requestAddToKanban(leadsToAdd: Lead[]) {
    if (leadsToAdd.length === 0) return;

    if (shouldOpenOrganizationModal()) {
      setPendingKanbanLeads(leadsToAdd);
      setKanbanModalOpen(true);
      return;
    }

    const organizationId = getDefaultOrganizationId();
    if (!organizationId) {
      setPendingKanbanLeads(leadsToAdd);
      setKanbanModalOpen(true);
      return;
    }

    void addLeadsToKanban(leadsToAdd, organizationId);
  }

  async function handleConfirmKanbanOrganization(
    organizationId: string,
    ownerUserId?: string,
  ) {
    if (pendingKanbanLeads.length === 0) return;

    setConfirmingKanban(true);
    try {
      await addLeadsToKanban(pendingKanbanLeads, organizationId, ownerUserId);
      setKanbanModalOpen(false);
      setPendingKanbanLeads([]);
    } finally {
      setConfirmingKanban(false);
    }
  }

  async function saveSearchLeads(
    items: LeadMinerLead[],
    context: ExternalLeadSearchContext,
    uf: string,
  ) {
    try {
      const saved = await importLeadMinerLeads({
        city: context.city,
        neighborhood: context.neighborhood || context.city,
        category: context.category,
        leads: items,
      });
      const record: MapsSearchRecord = {
        id: crypto.randomUUID(),
        category: context.category,
        city: context.city,
        neighborhood: context.neighborhood || context.city,
        uf,
        createdAt: new Date().toISOString(),
        leadIds: saved.map((lead) => lead.id),
      };
      rememberSearch(record);
      setSelectedSearchId(record.id);
      setActiveSearchEmpty(false);
      await refreshSavedLeads();
      setExternalPreviewLeads([]);
    } catch {
      /* the list stays available from the search preview */
    }
  }

  const emptyMessage =
    hasSearched || orderedRecords.length > 0
      ? "Nenhuma empresa encontrada para esta busca ou filtro."
      : "Faça uma busca no formulário para ver as empresas aqui.";

  return (
    <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
      <AddToKanbanOrganizationDialog
        open={kanbanModalOpen}
        onOpenChange={(open) => {
          setKanbanModalOpen(open);
          if (!open) setPendingKanbanLeads([]);
        }}
        organizations={organizations}
        defaultOrganizationId={getDefaultOrganizationId()}
        leadCount={pendingKanbanLeads.length}
        loading={confirmingKanban}
        owners={crmUsers}
        requireOwner={canAssignOwner}
        onConfirm={handleConfirmKanbanOrganization}
      />

      <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
        {modeTabs}

        <MapsSearchForm
          values={formValues}
          loading={loading}
          searchProgress={loading ? searchProgress : null}
          jobStatus={jobStatus}
          categoryError={categoryError}
          onChange={setFormValues}
          onSubmit={() => void handleSearch()}
        />

        <Card className="rounded-2xl border border-[var(--atria-primary)]/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="maps-name-filter">Por nome</FieldLabel>
              <Input
                id="maps-name-filter"
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                placeholder="Filtrar por nome..."
              />
            </Field>
          </CardContent>
        </Card>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white/50">
        <ProspectingLeadsList
          leads={results}
          loading={loadingResults}
          searchProgress={loading ? searchProgress : null}
          emptyMessage={emptyMessage}
          addingKanbanId={addingKanbanId}
          onAddToKanban={(lead) => {
            if (lead.kanbanTracked) return;
            requestAddToKanban([lead]);
          }}
        />
      </section>
    </div>
  );
}
