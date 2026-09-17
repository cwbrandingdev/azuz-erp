"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Kanban, Loader2, MapPin } from "lucide-react";
import { AddToKanbanOrganizationDialog } from "@/components/leads/add-to-kanban-organization-dialog";
import {
  CompanySearchForm,
  type CompanySearchFormValues,
} from "@/components/leads/company-search-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadsMapView } from "@/components/leads/leads-map-view";
import { LeadsTable } from "@/components/leads/leads-table";
import { SearchSessionFilter } from "@/components/leads/search-session-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import {
  useCompanySearchMutation,
  useLeadSearchSessionLeads,
  useLeadSearchSessions,
} from "@/hooks/use-company-search";
import { useSdrAssignedOrganizations } from "@/hooks/use-sdr-assigned-organizations";
import { buildAddToKanbanInput } from "@/lib/lead-external-utils";
import { formatSearchSessionLabel } from "@/lib/lead-search-session";
import { normalizeAppRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { leadsService } from "@/services";
import {
  searchCompanies,
  type LeadSearchQueryType,
} from "@/services/company-search.service";
import type { Lead } from "@/services/types";
import { useQueryClient } from "@tanstack/react-query";

const DEFAULT_FORM_VALUES: CompanySearchFormValues = {
  queryType: "NICHO",
  queryValue: "",
  cnaeLabel: "",
  city: "",
  uf: "SP",
  address: "",
};

const ALL_CATEGORIES = "Todas as categorias";
const ALL_NEIGHBORHOODS = "Todos os bairros";

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

function isCrmRole(role: string | null | undefined) {
  return normalizeAppRole(role) === "crm";
}

function filterModeSectionClass(active: boolean) {
  return cn(
    "grid gap-4 rounded-xl border p-4 transition-all lg:grid-cols-2",
    active
      ? "border-[var(--atria-primary)]/40 bg-[var(--atria-primary)]/[0.05] shadow-sm ring-2 ring-[var(--atria-primary)]/10"
      : "border-[var(--atria-primary)]/10 bg-white/50",
  );
}

function matchesQuery(lead: Lead, query: string) {
  if (!query) return true;
  const haystack = [
    lead.name,
    lead.city,
    lead.neighborhood,
    lead.category,
    lead.phone,
    lead.email,
    lead.address,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function CompanySearchPanel() {
  const { user } = useAuth();
  const { organizations } = useSdrAssignedOrganizations(Boolean(user));

  const [formValues, setFormValues] =
    useState<CompanySearchFormValues>(DEFAULT_FORM_VALUES);
  const [sessionFilterQuery, setSessionFilterQuery] = useState("");
  const [sessionFilterCategory, setSessionFilterCategory] =
    useState(ALL_CATEGORIES);
  const [sessionFilterNeighborhood, setSessionFilterNeighborhood] =
    useState(ALL_NEIGHBORHOODS);
  const [globalCategoryFilter, setGlobalCategoryFilter] = useState("");
  const [globalNeighborhoodFilter, setGlobalNeighborhoodFilter] = useState("");
  const [allProspectedLeads, setAllProspectedLeads] = useState<Lead[]>([]);
  const [loadingAllLeads, setLoadingAllLeads] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [hasAutoSelectedSession, setHasAutoSelectedSession] = useState(false);
  const queryClient = useQueryClient();
  const [activeLeads, setActiveLeads] = useState<Lead[]>([]);
  const [qualifyingId, setQualifyingId] = useState<string | null>(null);
  const [addingKanbanId, setAddingKanbanId] = useState<string | null>(null);
  const [bulkAddingKanban, setBulkAddingKanban] = useState(false);
  const [kanbanModalOpen, setKanbanModalOpen] = useState(false);
  const [pendingKanbanLeads, setPendingKanbanLeads] = useState<Lead[]>([]);
  const [confirmingKanban, setConfirmingKanban] = useState(false);

  const sessionsQuery = useLeadSearchSessions();
  const sessionLeadsQuery = useLeadSearchSessionLeads(selectedSessionId);
  const searchMutation = useCompanySearchMutation();

  const sessions = sessionsQuery.data ?? [];
  const loadingSessions = sessionsQuery.isLoading;
  const loadingSessionLeads = sessionLeadsQuery.isFetching;
  const searching = searchMutation.isPending;

  const loadAllProspectedLeads = useCallback(async () => {
    setLoadingAllLeads(true);
    try {
      const data = await leadsService.listProspectingLeads();
      setAllProspectedLeads(data);
    } catch {
      setAllProspectedLeads([]);
    } finally {
      setLoadingAllLeads(false);
    }
  }, []);

  useEffect(() => {
    void loadAllProspectedLeads();
  }, [loadAllProspectedLeads]);

  const canShowMap = Boolean(formValues.city.trim() && formValues.uf.trim());

  const hasSearchContext = Boolean(
    selectedSessionId ||
    searchMutation.data ||
    activeLeads.length > 0 ||
    sessions.length > 0,
  );

  useEffect(() => {
    if (
      hasAutoSelectedSession ||
      loadingSessions ||
      sessions.length === 0 ||
      selectedSessionId
    ) {
      return;
    }

    setSelectedSessionId(sessions[0].id);
    setHasAutoSelectedSession(true);
  }, [hasAutoSelectedSession, loadingSessions, selectedSessionId, sessions]);

  useEffect(() => {
    if (selectedSessionId && sessionLeadsQuery.data) {
      setActiveLeads(sessionLeadsQuery.data.leads);
      return;
    }

    if (!selectedSessionId && !searchMutation.data) {
      setActiveLeads([]);
    }
  }, [selectedSessionId, sessionLeadsQuery.data, searchMutation.data]);

  useEffect(() => {
    if (!selectedSessionId && searchMutation.data) {
      setActiveLeads(searchMutation.data.leads);
    }
  }, [searchMutation.data, selectedSessionId]);

  const categoryOptions = useMemo(
    () => collectDistinctValues(activeLeads, "category"),
    [activeLeads],
  );

  const neighborhoodOptions = useMemo(
    () => collectDistinctValues(activeLeads, "neighborhood"),
    [activeLeads],
  );

  const sessionFilteredLeads = useMemo(() => {
    let filtered = activeLeads;

    if (sessionFilterCategory !== ALL_CATEGORIES) {
      filtered = filtered.filter(
        (lead) =>
          lead.category?.trim().toLowerCase() ===
          sessionFilterCategory.trim().toLowerCase(),
      );
    }

    if (sessionFilterNeighborhood !== ALL_NEIGHBORHOODS) {
      filtered = filtered.filter(
        (lead) =>
          lead.neighborhood?.trim().toLowerCase() ===
          sessionFilterNeighborhood.trim().toLowerCase(),
      );
    }

    const normalized = sessionFilterQuery.trim().toLowerCase();
    if (!normalized) {
      return filtered;
    }
    return filtered.filter((lead) => matchesQuery(lead, normalized));
  }, [
    activeLeads,
    sessionFilterCategory,
    sessionFilterNeighborhood,
    sessionFilterQuery,
  ]);

  const isGlobalFilterActive = Boolean(
    globalCategoryFilter.trim() || globalNeighborhoodFilter.trim(),
  );

  const globalFilteredLeads = useMemo(() => {
    if (!isGlobalFilterActive) return [];

    return allProspectedLeads.filter(
      (lead) =>
        matchesLeadField(lead, globalCategoryFilter, "category") &&
        matchesLeadField(lead, globalNeighborhoodFilter, "neighborhood"),
    );
  }, [
    allProspectedLeads,
    globalCategoryFilter,
    globalNeighborhoodFilter,
    isGlobalFilterActive,
  ]);

  const displayLeads = isGlobalFilterActive
    ? globalFilteredLeads
    : sessionFilteredLeads;

  useEffect(() => {
    setSessionFilterCategory(ALL_CATEGORIES);
    setSessionFilterNeighborhood(ALL_NEIGHBORHOODS);
  }, [selectedSessionId]);

  const pendingKanbanCount = useMemo(
    () => displayLeads.filter((lead) => !lead.kanbanTracked).length,
    [displayLeads],
  );

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  const handleSearch = useCallback(() => {
    const queryValue = formValues.queryValue.trim();
    const city = formValues.city.trim();
    const uf = formValues.uf.trim().toUpperCase();
    const address = formValues.address.trim();

    if (!city || !uf) {
      toast.error("Informe a cidade e o estado.");
      return;
    }

    if (formValues.queryType === "CNAE") {
      if (!queryValue) {
        toast.error("Selecione um CNAE e informe a cidade e o estado.");
        return;
      }
    } else if (!queryValue && !address) {
      toast.error("Informe o nicho ou o bairro para buscar.");
      return;
    }

    setGlobalCategoryFilter("");
    setGlobalNeighborhoodFilter("");
    setSessionFilterQuery("");
    setSessionFilterCategory(ALL_CATEGORIES);
    setSessionFilterNeighborhood(ALL_NEIGHBORHOODS);

    setSelectedSessionId(null);

    const effectiveCategory =
      queryValue ||
      (formValues.queryType === "NICHO" ? "comércio" : queryValue);

    void searchCompanies({
      queryType: formValues.queryType,
      queryValue: effectiveCategory,
      city,
      uf,
      address: address || undefined,
      maxResults: 20,
    })
      .then((data) => {
        setActiveLeads(data.leads);
        setSelectedSessionId(data.session.id);
        setHasAutoSelectedSession(true);
        queryClient.setQueryData(
          ["lead-search-session", data.session.id],
          data,
        );
        void queryClient.invalidateQueries({
          queryKey: ["lead-search-sessions"],
        });
        void loadAllProspectedLeads();

        if (data.leads.length > 0) {
          toast.success(
            `Encontramos ${data.leads.length} empresa(s) em ${city}.`,
          );
        } else {
          toast.info(
            "Nenhuma empresa encontrada. Tente outro termo ou cidade próxima.",
          );
        }
      })
      .catch(() => {
        toast.error(
          "Não foi possível buscar empresas agora. Tente novamente em instantes.",
        );
      });
  }, [formValues, loadAllProspectedLeads, queryClient]);

  const handleQueryTypeChange = useCallback(
    (queryType: LeadSearchQueryType) => {
      setFormValues({
        ...DEFAULT_FORM_VALUES,
        queryType,
      });
      setSelectedSessionId(null);
      setSessionFilterQuery("");
      setActiveLeads([]);
      searchMutation.reset();
    },
    [searchMutation],
  );

  function shouldOpenOrganizationModal() {
    return isCrmRole(user?.role) || organizations.length > 1;
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
          const updated = await leadsService.addToKanban(
            buildAddToKanbanInput(lead, undefined, organizationId),
            { skipToast: true },
          );
          added += 1;
          setActiveLeads((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
          setAllProspectedLeads((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
        } catch {}
      }

      if (added > 0) {
        toast.success(
          added === 1
            ? `${leadsToAdd[0]?.name ?? "Empresa"} adicionada aos seus leads.`
            : `${added} empresas adicionadas aos seus leads.`,
        );
      } else {
        toast.error("Não foi possível adicionar as empresas aos leads.");
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

  async function handleQualify(lead: Lead) {
    setQualifyingId(lead.id);
    try {
      const updated = await leadsService.preQualifyLead(lead.id);
      setActiveLeads((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setAllProspectedLeads((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success("Qualificação concluída.");
    } catch {
    } finally {
      setQualifyingId(null);
    }
  }

  const loadingResults =
    searching ||
    loadingSessionLeads ||
    (isGlobalFilterActive && loadingAllLeads);

  return (
    <div className="flex flex-col gap-6">
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
        <CompanySearchForm
          values={formValues}
          loading={searching}
          onChange={setFormValues}
          onQueryTypeChange={handleQueryTypeChange}
          onSubmit={handleSearch}
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
                leads={displayLeads}
                searchLocation={{
                  city: formValues.city,
                  uf: formValues.uf,
                  address: formValues.address,
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
            Escolha se quer refinar uma busca específica ou pesquisar em todas
            as empresas que você já encontrou antes.
          </p>
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02] p-2"
            role="status"
            aria-live="polite"
          >
            <span className="px-1 text-xs font-medium text-[var(--atria-primary)]/60">
              Modo ativo:
            </span>
            <Badge
              variant={!isGlobalFilterActive ? "default" : "outline"}
              className="gap-1"
            >
              {!isGlobalFilterActive ? (
                <Check className="size-3" aria-hidden />
              ) : null}
              Busca selecionada
            </Badge>
            <Badge
              variant={isGlobalFilterActive ? "default" : "outline"}
              className="gap-1"
            >
              {isGlobalFilterActive ? (
                <Check className="size-3" aria-hidden />
              ) : null}
              Histórico completo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className={filterModeSectionClass(!isGlobalFilterActive)}>
            <div className="lg:col-span-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--atria-primary)]">
                  Busca selecionada
                </p>
                <p className="mt-1 text-xs text-[var(--atria-primary)]/50">
                  Filtra somente os leads da pesquisa escolhida em
                  &quot;Buscas recentes&quot;.
                </p>
              </div>
              {!isGlobalFilterActive ? (
                <Badge variant="secondary" className="shrink-0">
                  Em uso
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0 opacity-70">
                  Inativo
                </Badge>
              )}
            </div>
            <SearchSessionFilter
              sessions={sessions}
              selectedSessionId={selectedSessionId}
              loading={loadingSessions}
              description="Escolha qual busca recente deseja ver e filtrar."
              onChange={(sessionId) => {
                setGlobalCategoryFilter("");
                setGlobalNeighborhoodFilter("");
                const nextSessionId = sessionId ?? sessions[0]?.id ?? null;
                setSelectedSessionId(nextSessionId);
                setSessionFilterQuery("");
                if (!nextSessionId) {
                  setActiveLeads(searchMutation.data?.leads ?? []);
                  return;
                }
                const session = sessions.find(
                  (item) => item.id === nextSessionId,
                );
                if (session) {
                  setFormValues((current) => ({
                    ...current,
                    queryType: session.queryType,
                    queryValue: session.queryValue,
                    cnaeLabel:
                      session.queryType === "CNAE" ? "" : current.cnaeLabel,
                    city: session.city,
                    uf: session.uf,
                    address: "",
                  }));
                }
              }}
            />
            <Field>
              <FieldLabel htmlFor="company-session-lead-filter">
                Texto livre (busca selecionada)
              </FieldLabel>
              <p className="mb-2 text-xs text-[var(--atria-primary)]/50">
                Nome, telefone ou endereço dentro desta busca apenas.
              </p>
              <Input
                id="company-session-lead-filter"
                value={sessionFilterQuery}
                disabled={isGlobalFilterActive}
                onChange={(event) => setSessionFilterQuery(event.target.value)}
                placeholder="Nome, telefone ou endereço..."
              />
            </Field>
            {categoryOptions.length > 0 && (
              <Field>
                <FieldLabel htmlFor="company-session-category-filter">
                  Categoria na busca selecionada
                </FieldLabel>
                <p className="mb-2 text-xs text-[var(--atria-primary)]/50">
                  Categorias que apareceram nesta pesquisa.
                </p>
                <Select
                  value={sessionFilterCategory}
                  disabled={isGlobalFilterActive}
                  onValueChange={(value) => {
                    if (value) setSessionFilterCategory(value);
                  }}
                >
                  <SelectTrigger id="company-session-category-filter">
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
                <FieldLabel htmlFor="company-session-neighborhood-filter">
                  Bairro na busca selecionada
                </FieldLabel>
                <p className="mb-2 text-xs text-[var(--atria-primary)]/50">
                  Bairros que apareceram nesta pesquisa.
                </p>
                <Select
                  value={sessionFilterNeighborhood}
                  disabled={isGlobalFilterActive}
                  onValueChange={(value) => {
                    if (value) setSessionFilterNeighborhood(value);
                  }}
                >
                  <SelectTrigger id="company-session-neighborhood-filter">
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

          <div className={filterModeSectionClass(isGlobalFilterActive)}>
            <div className="lg:col-span-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--atria-primary)]">
                  Histórico completo
                </p>
                <p className="mt-1 text-xs text-[var(--atria-primary)]/50">
                  Pesquisa em todas as empresas já salvas das buscas
                  anteriores. Limpe os campos abaixo para voltar à busca
                  selecionada.
                </p>
              </div>
              {isGlobalFilterActive ? (
                <Badge variant="secondary" className="shrink-0">
                  Em uso
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0 opacity-70">
                  Inativo
                </Badge>
              )}
            </div>
            <Field>
              <FieldLabel htmlFor="company-global-category-filter">
                Categoria no histórico
              </FieldLabel>
              <p className="mb-2 text-xs text-[var(--atria-primary)]/50">
                Busca parcial em todas as categorias já prospectadas.
              </p>
              <Input
                id="company-global-category-filter"
                value={globalCategoryFilter}
                onChange={(event) => {
                  setGlobalCategoryFilter(event.target.value);
                  setSessionFilterQuery("");
                  setSessionFilterCategory(ALL_CATEGORIES);
                  setSessionFilterNeighborhood(ALL_NEIGHBORHOODS);
                }}
                placeholder="Ex.: restaurante, clínica..."
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="company-global-neighborhood-filter">
                Bairro no histórico
              </FieldLabel>
              <p className="mb-2 text-xs text-[var(--atria-primary)]/50">
                Busca parcial em bairros de todas as buscas anteriores.
              </p>
              <Input
                id="company-global-neighborhood-filter"
                value={globalNeighborhoodFilter}
                onChange={(event) => {
                  setGlobalNeighborhoodFilter(event.target.value);
                  setSessionFilterQuery("");
                  setSessionFilterCategory(ALL_CATEGORIES);
                  setSessionFilterNeighborhood(ALL_NEIGHBORHOODS);
                }}
                placeholder="Ex.: Centro, Pinheiros..."
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {selectedSession && !isGlobalFilterActive && (
        <div className="rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.03] px-4 py-3 text-sm text-[var(--atria-primary)]/80">
          Mostrando resultados de:{" "}
          <span className="font-medium text-[var(--atria-primary)]">
            {formatSearchSessionLabel(selectedSession)}
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-[var(--atria-primary)]">
            Empresas encontradas
            {displayLeads.length > 0 ? ` (${displayLeads.length})` : ""}
          </h2>
          {displayLeads.length > 0 && pendingKanbanCount > 0 && (
            <Button
              type="button"
              variant="outline"
              disabled={bulkAddingKanban || loadingResults}
              onClick={() =>
                requestAddToKanban(
                  displayLeads.filter((lead) => !lead.kanbanTracked),
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
              Buscando empresas...
            </div>
          </div>
        )}

        {!loadingResults && displayLeads.length > 0 && (
          <LeadsTable
            leads={displayLeads}
            qualifyingId={qualifyingId}
            addingKanbanId={addingKanbanId}
            onQualify={(lead) => void handleQualify(lead)}
            onAddToKanban={(lead) => {
              if (lead.kanbanTracked) return;
              requestAddToKanban([lead]);
            }}
            organizationLabel="a empresa atual"
          />
        )}

        {!loadingResults &&
          isGlobalFilterActive &&
          displayLeads.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 px-6 py-12 text-center text-sm text-[var(--atria-primary)]/50">
              Nenhuma empresa no histórico corresponde a essa categoria ou
              bairro. Ajuste os filtros ou limpe os campos para ver a busca
              atual.
            </div>
          )}

        {!loadingResults &&
          !isGlobalFilterActive &&
          hasSearchContext &&
          displayLeads.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 px-6 py-12 text-center text-sm text-[var(--atria-primary)]/50">
              Nenhuma empresa encontrada para esta busca. Tente outro nicho,
              código CNAE ou cidade.
            </div>
          )}

        {!loadingResults &&
          !isGlobalFilterActive &&
          !hasSearchContext &&
          displayLeads.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 px-6 py-12 text-center text-sm text-[var(--atria-primary)]/50">
              Faça uma busca no formulário acima para ver as empresas aqui.
            </div>
          )}
      </div>
    </div>
  );
}
