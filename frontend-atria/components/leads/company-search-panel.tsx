"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Kanban, Loader2, MapPin } from "lucide-react";
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
  batchSearchMode: "none",
  batchTerms: "",
};

const ALL_CATEGORIES = "Todas as categorias";
const ALL_NEIGHBORHOODS = "Todos os bairros";

function parseBatchTerms(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]+/)
        .map((term) => term.trim())
        .filter(Boolean),
    ),
  );
}

function mergeLeadsByIdentity(existing: Lead[], incoming: Lead[]) {
  const merged = new Map<string, Lead>();
  for (const lead of [...existing, ...incoming]) {
    const key =
      lead.placeId?.trim() ||
      lead.phone?.replace(/\D/g, "") ||
      lead.id;
    merged.set(key, lead);
  }
  return Array.from(merged.values());
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
  const [filterQuery, setFilterQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState(ALL_CATEGORIES);
  const [filterNeighborhood, setFilterNeighborhood] = useState(
    ALL_NEIGHBORHOODS,
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [hasAutoSelectedSession, setHasAutoSelectedSession] = useState(false);
  const [batchSearching, setBatchSearching] = useState(false);
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
  const searching = searchMutation.isPending || batchSearching;

  const canShowMap = Boolean(
    formValues.city.trim() && formValues.uf.trim(),
  );

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
  }, [
    hasAutoSelectedSession,
    loadingSessions,
    selectedSessionId,
    sessions,
  ]);

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

  const filteredLeads = useMemo(() => {
    let filtered = activeLeads;

    if (filterCategory !== ALL_CATEGORIES) {
      filtered = filtered.filter(
        (lead) =>
          lead.category?.trim().toLowerCase() ===
          filterCategory.trim().toLowerCase(),
      );
    }

    if (filterNeighborhood !== ALL_NEIGHBORHOODS) {
      filtered = filtered.filter(
        (lead) =>
          lead.neighborhood?.trim().toLowerCase() ===
          filterNeighborhood.trim().toLowerCase(),
      );
    }

    const normalized = filterQuery.trim().toLowerCase();
    if (!normalized) {
      return filtered;
    }
    return filtered.filter((lead) => matchesQuery(lead, normalized));
  }, [activeLeads, filterCategory, filterNeighborhood, filterQuery]);

  useEffect(() => {
    setFilterCategory(ALL_CATEGORIES);
    setFilterNeighborhood(ALL_NEIGHBORHOODS);
  }, [selectedSessionId]);

  const pendingKanbanCount = useMemo(
    () => filteredLeads.filter((lead) => !lead.kanbanTracked).length,
    [filteredLeads],
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
    const batchTerms = parseBatchTerms(formValues.batchTerms);

    if (!city || !uf) {
      toast.error("Informe a cidade e o estado.");
      return;
    }

    if (formValues.queryType === "CNAE") {
      if (!queryValue) {
        toast.error("Selecione um CNAE e informe a cidade e o estado.");
        return;
      }
    } else if (formValues.batchSearchMode === "categoria") {
      if (batchTerms.length === 0) {
        toast.error("Informe ao menos uma categoria na lista.");
        return;
      }
    } else if (formValues.batchSearchMode === "bairro") {
      if (!queryValue) {
        toast.error("Informe a categoria para buscar em vários bairros.");
        return;
      }
      if (batchTerms.length === 0) {
        toast.error("Informe ao menos um bairro na lista.");
        return;
      }
    } else if (!queryValue && !address) {
      toast.error("Informe a categoria ou o bairro para buscar.");
      return;
    }

    setFilterQuery("");
    setFilterCategory(ALL_CATEGORIES);
    setFilterNeighborhood(ALL_NEIGHBORHOODS);

    if (
      formValues.queryType === "NICHO" &&
      formValues.batchSearchMode !== "none" &&
      batchTerms.length > 0
    ) {
      setBatchSearching(true);
      setSelectedSessionId(null);

      void (async () => {
        let mergedLeads: Lead[] = [];
        let lastSessionId: string | null = null;
        let failed = 0;

        try {
          const jobs =
            formValues.batchSearchMode === "categoria"
              ? batchTerms.map((category) => ({
                  queryValue: category,
                  address,
                }))
              : batchTerms.map((neighborhood) => ({
                  queryValue,
                  address: neighborhood,
                }));

          for (const job of jobs) {
            try {
              const data = await searchCompanies({
                queryType: "NICHO",
                queryValue: job.queryValue,
                city,
                uf,
                address: job.address || undefined,
                maxResults: 20,
              });
              mergedLeads = mergeLeadsByIdentity(mergedLeads, data.leads);
              lastSessionId = data.session.id;
              queryClient.setQueryData(
                ["lead-search-session", data.session.id],
                data,
              );
            } catch {
              failed += 1;
            }
          }

          await queryClient.invalidateQueries({
            queryKey: ["lead-search-sessions"],
          });

          setActiveLeads(mergedLeads);
          setSelectedSessionId(lastSessionId);
          setHasAutoSelectedSession(true);

          if (mergedLeads.length > 0) {
            toast.success(
              `${mergedLeads.length} empresa(s) encontradas em ${jobs.length} busca(s).`,
            );
          } else {
            toast.info("Nenhuma empresa encontrada para os termos informados.");
          }

          if (failed > 0) {
            toast.error(
              `${failed} busca(s) falharam. As demais foram concluídas.`,
            );
          }
        } catch {
          toast.error(
            "Não foi possível buscar empresas agora. Tente novamente em instantes.",
          );
        } finally {
          setBatchSearching(false);
        }
      })();

      return;
    }

    setSelectedSessionId(null);

    const effectiveCategory =
      queryValue || (formValues.queryType === "NICHO" ? "comércio" : queryValue);

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
  }, [formValues, queryClient]);

  const handleQueryTypeChange = useCallback((queryType: LeadSearchQueryType) => {
    setFormValues({
      ...DEFAULT_FORM_VALUES,
      queryType,
    });
    setSelectedSessionId(null);
    setFilterQuery("");
    setActiveLeads([]);
    searchMutation.reset();
  }, [searchMutation]);

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
        } catch {
        }
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
      const updated = await leadsService.qualifyLead(lead.id);
      setActiveLeads((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(
        updated.status === "VENDA_FINALIZADA"
          ? `${updated.name} qualificado (score ${updated.aiScore}).`
          : `${updated.name} sem interesse (score ${updated.aiScore}).`,
      );
    } catch {
    } finally {
      setQualifyingId(null);
    }
  }

  const loadingResults = searching || loadingSessionLeads;

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
                leads={filteredLeads}
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
        <CardContent className="grid gap-4 pt-6 lg:grid-cols-2">
          <SearchSessionFilter
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            loading={loadingSessions}
            onChange={(sessionId) => {
              const nextSessionId = sessionId ?? sessions[0]?.id ?? null;
              setSelectedSessionId(nextSessionId);
              setFilterQuery("");
              if (!nextSessionId) {
                setActiveLeads(searchMutation.data?.leads ?? []);
                return;
              }
              const session = sessions.find((item) => item.id === nextSessionId);
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
                  batchSearchMode: "none",
                  batchTerms: "",
                }));
              }
            }}
          />
          <Field>
            <FieldLabel htmlFor="company-lead-filter">
              Filtrar empresas na lista
            </FieldLabel>
            <Input
              id="company-lead-filter"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Nome, telefone ou endereço..."
            />
          </Field>
          {categoryOptions.length > 0 && (
            <Field>
              <FieldLabel htmlFor="company-category-filter">Categoria</FieldLabel>
              <Select
                value={filterCategory}
                onValueChange={(value) => {
                  if (value) setFilterCategory(value);
                }}
              >
                <SelectTrigger id="company-category-filter">
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
              <FieldLabel htmlFor="company-neighborhood-filter">Bairro</FieldLabel>
              <Select
                value={filterNeighborhood}
                onValueChange={(value) => {
                  if (value) setFilterNeighborhood(value);
                }}
              >
                <SelectTrigger id="company-neighborhood-filter">
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
        </CardContent>
      </Card>

      {selectedSession && (
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
            {filteredLeads.length > 0 ? ` (${filteredLeads.length})` : ""}
          </h2>
          {filteredLeads.length > 0 && pendingKanbanCount > 0 && (
            <Button
              type="button"
              variant="outline"
              disabled={bulkAddingKanban || loadingResults}
              onClick={() =>
                requestAddToKanban(
                  filteredLeads.filter((lead) => !lead.kanbanTracked),
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

        {!loadingResults && filteredLeads.length > 0 && (
          <LeadsTable
            leads={filteredLeads}
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

        {!loadingResults && hasSearchContext && filteredLeads.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 px-6 py-12 text-center text-sm text-[var(--atria-primary)]/50">
            Nenhuma empresa encontrada para esta busca. Tente outro nicho,
            código CNAE ou cidade.
          </div>
        )}

        {!loadingResults &&
          !hasSearchContext &&
          filteredLeads.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 px-6 py-12 text-center text-sm text-[var(--atria-primary)]/50">
            Faça uma busca no formulário acima para ver as empresas aqui.
          </div>
        )}
      </div>
    </div>
  );
}
