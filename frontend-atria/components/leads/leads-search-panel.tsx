"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  PROSPECTING_LEADS_KEY,
  useProspectingLeads,
} from "@/hooks/use-company-search";
import {
  readPersistedMapsProspectingState,
  writePersistedMapsProspectingState,
} from "@/lib/lead-prospecting-persistence";
import { Kanban, Loader2, MapPin } from "lucide-react";
import { AddToKanbanOrganizationDialog } from "@/components/leads/add-to-kanban-organization-dialog";
import { LeadDossierDialog } from "@/components/leads/lead-dossier-dialog";
import { LeadsMapView } from "@/components/leads/leads-map-view";
import { LeadsTable } from "@/components/leads/leads-table";
import { SearchSessionFilter } from "@/components/leads/search-session-filter";
import {
  MapsSearchForm,
  type MapsSearchFormValues,
} from "@/components/leads/maps-search-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
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
import { normalizeAppRole } from "@/lib/permissions";
import { isLeadDossierReady } from "@/lib/lead-qualification-utils";
import { toast } from "@/lib/toast";
import { ApiError } from "@/services/api";
import { leadsService } from "@/services";
import type { LeadSearchSessionSummary } from "@/services/company-search.service";
import type { Lead } from "@/services/types";
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

const ALL_CATEGORIES = "Todas as categorias";
const ALL_NEIGHBORHOODS = "Todos os bairros";
const ORDER_SEARCH = "ordem-da-busca";
const ORDER_MOST_REVIEWS = "mais-avaliacoes";

function normalizeFilterText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesLeadField(
  lead: Lead,
  query: string,
  field: "category" | "neighborhood",
) {
  const normalized = normalizeFilterText(query);
  if (!normalized) return true;
  const value = normalizeFilterText(lead[field] ?? "");
  return value.includes(normalized);
}

function collectDistinctValues(
  leads: Lead[],
  field: "category" | "neighborhood",
) {
  const values = new Set<string>();
  for (const lead of leads) {
    const value = lead[field]?.trim();
    if (value) values.add(value);
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function isMapsLead(lead: Lead) {
  return lead.source === "leadminer";
}

function matchesQuery(lead: Lead, query: string) {
  const normalized = normalizeFilterText(query);
  if (!normalized) return true;
  const haystack = normalizeFilterText(
    [
      lead.name,
      lead.city,
      lead.neighborhood,
      lead.category,
      lead.phone,
      lead.email,
      lead.address,
      lead.website,
      lead.instagram,
    ]
      .filter(Boolean)
      .join(" "),
  );
  return haystack.includes(normalized);
}

function isCrmRole(role: string | null | undefined) {
  return normalizeAppRole(role) === "crm";
}

export function LeadsSearchPanel() {
  const { user } = useAuth();
  const { organizations } = useSdrAssignedOrganizations(Boolean(user));
  const persistedMapsState = readPersistedMapsProspectingState();
  const queryClient = useQueryClient();
  const prospectingLeadsQuery = useProspectingLeads();

  const [formValues, setFormValues] = useState<MapsSearchFormValues>(
    () => persistedMapsState?.formValues ?? DEFAULT_FORM_VALUES,
  );
  const [filterQuery, setFilterQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState(ALL_CATEGORIES);
  const [filterNeighborhood, setFilterNeighborhood] =
    useState(ALL_NEIGHBORHOODS);
  const [resultOrder, setResultOrder] = useState(ORDER_SEARCH);
  const [loading, setLoading] = useState(false);
  const [bulkAddingKanban, setBulkAddingKanban] = useState(false);
  const [qualifyingId, setQualifyingId] = useState<string | null>(null);
  const [dossierLead, setDossierLead] = useState<Lead | null>(null);
  const [addingKanbanId, setAddingKanbanId] = useState<string | null>(null);
  const savedLeads = prospectingLeadsQuery.data ?? [];
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

  const sessionOptions = useMemo<LeadSearchSessionSummary[]>(
    () =>
      orderedRecords.map((record) => ({
        id: record.id,
        tenantId: "",
        queryType: "MAPS",
        queryValue: record.category,
        city: record.city,
        uf: record.uf,
        address:
          record.neighborhood && record.neighborhood !== record.city
            ? record.neighborhood
            : null,
        createdAt: record.createdAt,
        leadsCount: record.leadIds.length,
      })),
    [orderedRecords],
  );

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

  async function refreshSavedLeads() {
    await queryClient.invalidateQueries({ queryKey: PROSPECTING_LEADS_KEY });
  }

  const categoryOptions = useMemo(
    () => collectDistinctValues(leads, "category"),
    [leads],
  );
  const neighborhoodOptions = useMemo(
    () => collectDistinctValues(leads, "neighborhood"),
    [leads],
  );

  const results = useMemo(() => {
    const filtered = leads.filter((lead) => {
      if (
        filterCategory !== ALL_CATEGORIES &&
        !matchesLeadField(lead, filterCategory, "category")
      ) {
        return false;
      }
      if (
        filterNeighborhood !== ALL_NEIGHBORHOODS &&
        !matchesLeadField(lead, filterNeighborhood, "neighborhood")
      ) {
        return false;
      }
      return matchesQuery(lead, filterQuery);
    });

    if (resultOrder !== ORDER_MOST_REVIEWS) {
      return filtered;
    }

    return [...filtered].sort((left, right) => {
      const byReviews = (right.reviewsCount ?? -1) - (left.reviewsCount ?? -1);
      if (byReviews !== 0) return byReviews;
      return (right.rating ?? -1) - (left.rating ?? -1);
    });
  }, [leads, filterQuery, filterCategory, filterNeighborhood, resultOrder]);

  const pendingKanbanCount = useMemo(
    () => results.filter((lead) => !lead.kanbanTracked).length,
    [results],
  );

  const canShowMap = Boolean(formValues.city.trim() && formValues.uf.trim());
  const loadingResults = loading || initialLoading;

  async function handleSearch() {
    const city = formValues.city.trim();
    const neighborhood = formValues.neighborhood.trim();
    const category = formValues.category.trim();

    if (!city || !category) {
      toast.error("Preencha categoria e cidade para buscar leads.");
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
    setJobStatus("pending");
    setSearchContext(context);
    setExternalPreviewLeads([]);
    setFilterCategory(ALL_CATEGORIES);
    setFilterNeighborhood(ALL_NEIGHBORHOODS);
    setFilterQuery("");

    try {
      const { job_id } = await startLeadMinerSearch({
        city,
        neighborhood,
        category,
        max_results: 50,
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
      setLoading(false);
      setJobStatus(null);

      if (previewLeads.length > 0) {
        toast.success(
          `${previewLeads.length} lead(s) encontrados para ${category}.`,
        );
      } else {
        toast.info(`Nenhum lead encontrado para ${category}.`);
      }

      if (job.data && job.data.length > 0) {
        void saveSearchLeads(job.data, context, formValues.uf.trim());
      }
    } catch (error) {
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
    if (isCrmRole(user?.role)) return true;
    return organizations.length !== 1;
  }

  function getDefaultOrganizationId() {
    if (organizations.length === 1) return organizations[0]?.id ?? "";
    return "";
  }

  async function addLeadsToKanban(leadsToAdd: Lead[], organizationId: string) {
    if (leadsToAdd.length === 1) {
      setAddingKanbanId(leadsToAdd[0].id);
    } else {
      setBulkAddingKanban(true);
    }

    let added = 0;

    try {
      for (const lead of leadsToAdd) {
        try {
          const payload = buildAddToKanbanInput(
            lead,
            searchContext ?? undefined,
            organizationId,
          );
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
      setBulkAddingKanban(false);
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

  async function handleConfirmKanbanOrganization(organizationId: string) {
    if (pendingKanbanLeads.length === 0) return;

    setConfirmingKanban(true);
    try {
      await addLeadsToKanban(pendingKanbanLeads, organizationId);
      setKanbanModalOpen(false);
      setPendingKanbanLeads([]);
    } finally {
      setConfirmingKanban(false);
    }
  }

  function rememberSavedLead(lead: Lead) {
    queryClient.setQueryData<Lead[]>(PROSPECTING_LEADS_KEY, (current) => {
      const list = current ?? [];
      const exists = list.some((item) => item.id === lead.id);
      if (exists) {
        return list.map((item) => (item.id === lead.id ? lead : item));
      }
      return [lead, ...list];
    });
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

  function selectMapsSearch(sessionId: string | null) {
    const nextId = sessionId ?? orderedRecords[0]?.id ?? null;
    const record = orderedRecords.find((item) => item.id === nextId);
    setActiveSearchEmpty(false);
    setExternalPreviewLeads([]);
    setSelectedSearchId(nextId);
    setFilterQuery("");
    setFilterCategory(ALL_CATEGORIES);
    setFilterNeighborhood(ALL_NEIGHBORHOODS);
    if (!record) return;
    setHasSearched(true);
    setSearchContext({
      city: record.city,
      neighborhood: record.neighborhood || record.city,
      category: record.category,
    });
    setFormValues((current) => ({
      ...current,
      category: record.category,
      city: record.city,
      neighborhood:
        record.neighborhood && record.neighborhood !== record.city
          ? record.neighborhood
          : "",
      uf: record.uf || current.uf,
    }));
  }

  async function savePreviewLead(
    lead: Lead,
    context: ExternalLeadSearchContext,
  ): Promise<Lead> {
    const raw =
      lead.rawData &&
      typeof lead.rawData === "object" &&
      !Array.isArray(lead.rawData)
        ? (lead.rawData as LeadMinerLead)
        : null;
    const phone = raw?.phone?.trim() || lead.phone?.trim() || "";
    if (!phone) {
      throw new Error("Este lead não tem telefone para ser salvo.");
    }

    const [saved] = await importLeadMinerLeads({
      city: lead.city ?? context.city,
      neighborhood: lead.neighborhood ?? context.neighborhood,
      category: lead.category ?? context.category,
      leads: [
        {
          title: raw?.title ?? lead.name,
          phone,
          address: raw?.address ?? lead.address ?? undefined,
          website: raw?.website ?? lead.website,
          instagram: raw?.instagram ?? lead.instagram,
          rating: raw?.rating ?? lead.rating ?? undefined,
          reviews: raw?.reviews ?? lead.reviewsCount ?? undefined,
          category: raw?.category ?? lead.category ?? undefined,
        },
      ],
    });

    if (!saved) {
      throw new Error("Não foi possível salvar o lead.");
    }
    return saved;
  }

  async function handleQualify(lead: Lead) {
    const context = searchContext ?? {
      city: lead.city ?? formValues.city,
      neighborhood:
        lead.neighborhood ??
        (formValues.neighborhood || lead.city || formValues.city),
      category: lead.category ?? formValues.category,
    };

    setDossierLead(lead);
    if (!isExternalLeadId(lead.id) && isLeadDossierReady(lead)) return;

    setQualifyingId(lead.id);
    try {
      let current = lead;
      if (isExternalLeadId(lead.id)) {
        current = await savePreviewLead(lead, context);
        setExternalPreviewLeads((items) =>
          items.map((item) => (item.id === lead.id ? current : item)),
        );
        rememberSavedLead(current);
        setDossierLead(current);
        setQualifyingId(current.id);
      }

      if (isLeadDossierReady(current)) return;

      const updated = await leadsService.loadLeadDossier(current.id);
      rememberSavedLead(updated);
      setDossierLead(updated);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível qualificar o lead.",
        );
      }
    } finally {
      setQualifyingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <LeadDossierDialog
        lead={dossierLead}
        open={dossierLead != null}
        loading={dossierLead != null && qualifyingId === dossierLead.id}
        onOpenChange={(open) => {
          if (!open) setDossierLead(null);
        }}
      />

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
        onConfirm={handleConfirmKanbanOrganization}
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
        <MapsSearchForm
          values={formValues}
          loading={loading}
          jobStatus={jobStatus}
          onChange={setFormValues}
          onSubmit={() => void handleSearch()}
        />

        <Card className="flex flex-col rounded-2xl border border-[var(--atria-primary)]/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4 text-[var(--atria-primary)]" />
              Mapa das empresas
            </CardTitle>
            <p className="text-sm text-[var(--atria-primary)]/50">
              {canShowMap
                ? "O mapa mostra a região da busca e os pinos das empresas encontradas."
                : "Informe a cidade e o estado para visualizar o mapa."}
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            {canShowMap ? (
              <LeadsMapView
                leads={results}
                searchLocation={{
                  city: formValues.city,
                  uf: formValues.uf,
                  address: formValues.neighborhood,
                }}
                addingKanbanId={addingKanbanId}
                onAddToLeads={(lead) => {
                  if (lead.kanbanTracked) return;
                  requestAddToKanban([lead]);
                }}
              />
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-[var(--atria-primary)]/15 bg-[var(--atria-primary)]/[0.02] px-6 py-16 text-center text-sm text-[var(--atria-primary)]/50">
                Preencha a cidade e o estado no formulário ao lado para ver o
                mapa.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border border-[var(--atria-primary)]/10">
        <CardHeader className="space-y-3 pb-2">
          <CardTitle className="text-base">Filtrar resultados</CardTitle>
          <p className="text-sm text-[var(--atria-primary)]/50">
            A lista e o mapa mostram só a busca selecionada. Escolha uma pesquisa
            anterior para reabri-la.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <SearchSessionFilter
                sessions={sessionOptions}
                selectedSessionId={
                  externalPreviewLeads.length > 0
                    ? null
                    : (selectedRecord?.id ?? null)
                }
                loading={initialLoading}
                inputId="maps-search-session-filter"
                description="Escolha qual busca do Google Maps deseja ver."
                onChange={selectMapsSearch}
              />
            </div>
            <Field className="lg:col-span-2">
              <FieldLabel htmlFor="maps-lead-filter">Texto livre</FieldLabel>
              <p className="mb-2 text-xs text-[var(--atria-primary)]/50">
                Nome, telefone, endereço, site ou Instagram.
              </p>
              <Input
                id="maps-lead-filter"
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                placeholder="Nome, telefone, endereço..."
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="maps-order-filter">Ordenar</FieldLabel>
              <p className="mb-2 text-xs text-[var(--atria-primary)]/50">
                Mais avaliações coloca no topo quem tem mais avaliações no Google.
              </p>
              <Select
                value={resultOrder}
                onValueChange={(value) => {
                  if (value) setResultOrder(value);
                }}
              >
                <SelectTrigger id="maps-order-filter">
                  <SelectValue placeholder="Ordem da busca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ORDER_SEARCH}>Ordem da busca</SelectItem>
                  <SelectItem value={ORDER_MOST_REVIEWS}>
                    Mais avaliações
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {categoryOptions.length > 0 && (
              <Field>
                <FieldLabel htmlFor="maps-category-filter">
                  Categoria
                </FieldLabel>
                <Select
                  value={filterCategory}
                  onValueChange={(value) => {
                    if (value) setFilterCategory(value);
                  }}
                >
                  <SelectTrigger id="maps-category-filter">
                    <SelectValue placeholder={ALL_CATEGORIES} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CATEGORIES}>
                      {ALL_CATEGORIES}
                    </SelectItem>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            {neighborhoodOptions.length > 0 && (
              <Field>
                <FieldLabel htmlFor="maps-neighborhood-filter">
                  Bairro
                </FieldLabel>
                <Select
                  value={filterNeighborhood}
                  onValueChange={(value) => {
                    if (value) setFilterNeighborhood(value);
                  }}
                >
                  <SelectTrigger id="maps-neighborhood-filter">
                    <SelectValue placeholder={ALL_NEIGHBORHOODS} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_NEIGHBORHOODS}>
                      {ALL_NEIGHBORHOODS}
                    </SelectItem>
                    {neighborhoodOptions.map((neighborhood) => (
                      <SelectItem key={neighborhood} value={neighborhood}>
                        {neighborhood}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-[var(--atria-primary)]">
            Empresas encontradas
            {results.length > 0 ? ` (${results.length})` : ""}
          </h2>
          {results.length > 0 && pendingKanbanCount > 0 && (
            <Button
              type="button"
              variant="outline"
              disabled={bulkAddingKanban || loadingResults}
              onClick={() =>
                requestAddToKanban(
                  results.filter((lead) => !lead.kanbanTracked),
                )
              }
              className="gap-2"
            >
              {bulkAddingKanban ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Kanban className="size-4" />
              )}
              Adicionar todas aos leads
            </Button>
          )}
        </div>

        {loadingResults && (
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-[var(--atria-primary)]/10 bg-white/50">
            <div className="flex items-center gap-3 text-sm text-[var(--atria-primary)]/60">
              <Loader2 className="size-5 animate-spin" />
              {loading ? "Buscando empresas..." : "Carregando empresas..."}
            </div>
          </div>
        )}

        {!loadingResults && results.length > 0 && (
          <LeadsTable
            leads={results}
            qualifyingId={qualifyingId}
            addingKanbanId={addingKanbanId}
            dossierReview
            onQualify={(lead) => void handleQualify(lead)}
            onAddToKanban={(lead) => {
              if (lead.kanbanTracked) return;
              requestAddToKanban([lead]);
            }}
            organizationLabel="a empresa atual"
          />
        )}

        {!loadingResults &&
          hasSearched &&
          (activeSearchEmpty || externalPreviewLeads.length > 0) &&
          results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 px-6 py-12 text-center text-sm text-[var(--atria-primary)]/50">
            Nenhuma empresa encontrada para esta busca. Tente outra categoria ou
            cidade.
          </div>
        )}

        {!loadingResults && !hasSearched && orderedRecords.length === 0 && results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 px-6 py-12 text-center text-sm text-[var(--atria-primary)]/50">
            Faça uma busca no formulário acima para ver as empresas aqui.
          </div>
        )}
      </div>
    </div>
  );
}
