"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AddToKanbanOrganizationDialog } from "@/components/leads/add-to-kanban-organization-dialog";
import {
  CompanySearchForm,
  type CompanySearchFormValues,
} from "@/components/leads/company-search-form";
import { ProspectingLeadsList } from "@/components/leads/prospecting-leads-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import {
  PROSPECTING_LEADS_KEY,
  useCompaniesByOpenedAt,
  useCompanySearchMutation,
  useLeadSearchSessionLeads,
  useLeadSearchSessions,
} from "@/hooks/use-company-search";
import { useSimulatedSearchProgress } from "@/hooks/use-simulated-search-progress";
import {
  readPersistedB2bProspectingState,
  writePersistedB2bProspectingState,
} from "@/lib/lead-prospecting-persistence";
import {
  CATALOG_PAGE_SIZE,
  type B2bLeadSearchResponse,
  type OpenedAtCompaniesResponse,
} from "@/services/company-search.service";
import { useCrmUsers } from "@/hooks/use-crm-users";
import { useSdrAssignedOrganizations } from "@/hooks/use-sdr-assigned-organizations";
import { buildAddToKanbanInput } from "@/lib/lead-external-utils";
import { isMasterOrAdmin, normalizeAppRole } from "@/lib/permissions";
import { toast } from "@/lib/toast";
import { leadsService } from "@/services";
import type { Lead } from "@/services/types";
import { useQueryClient } from "@tanstack/react-query";

const DEFAULT_FORM_VALUES: CompanySearchFormValues = {
  queryType: "CNAE",
  queryValue: "",
  cnaeLabel: "",
  city: "",
  uf: "SP",
  address: "",
};

function isCrmRole(role: string | null | undefined) {
  return normalizeAppRole(role) === "crm";
}

type OpeningDateFilterScope = "lastSearch" | "city" | "all";

const OPENING_DATE_SCOPE_OPTIONS: {
  id: OpeningDateFilterScope;
  label: string;
}[] = [
  { id: "lastSearch", label: "Última busca CNAE" },
  { id: "city", label: "Cidade preenchida no formulário" },
  { id: "all", label: "Todo o catálogo" },
];

interface CompanySearchPanelProps {
  modeTabs?: ReactNode;
}

export function CompanySearchPanel({ modeTabs }: CompanySearchPanelProps) {
  const { user } = useAuth();
  const canAssignOwner = isMasterOrAdmin(user?.role);
  const { users: crmUsers } = useCrmUsers(canAssignOwner);
  const { organizations } = useSdrAssignedOrganizations(Boolean(user));

  const persistedB2bState = readPersistedB2bProspectingState();
  const initialSessionId = persistedB2bState?.selectedSessionId ?? null;

  const [formValues, setFormValues] = useState<CompanySearchFormValues>(
    () => persistedB2bState?.formValues ?? DEFAULT_FORM_VALUES,
  );
  const [nameFilter, setNameFilter] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [openedFrom, setOpenedFrom] = useState("");
  const [openedTo, setOpenedTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    () => initialSessionId,
  );
  const [hasAutoSelectedSession, setHasAutoSelectedSession] = useState(() =>
    Boolean(initialSessionId),
  );
  const [totalCount, setTotalCount] = useState(0);
  const queryClient = useQueryClient();
  const [activeLeads, setActiveLeads] = useState<Lead[]>([]);
  const [addingKanbanId, setAddingKanbanId] = useState<string | null>(null);
  const [kanbanModalOpen, setKanbanModalOpen] = useState(false);
  const [pendingKanbanLeads, setPendingKanbanLeads] = useState<Lead[]>([]);
  const [confirmingKanban, setConfirmingKanban] = useState(false);
  const [openingDateScope, setOpeningDateScope] =
    useState<OpeningDateFilterScope>("lastSearch");

  const dateFilterActive = Boolean(openedFrom || openedTo);
  const formCityFilled = Boolean(
    formValues.city.trim() && formValues.uf.trim(),
  );
  const useSessionScopedDateFilter =
    dateFilterActive &&
    openingDateScope === "lastSearch" &&
    Boolean(selectedSessionId);
  const useOpenedAtCatalogFilter =
    dateFilterActive &&
    (openingDateScope === "all" ||
      (openingDateScope === "city" && formCityFilled));
  const sessionLeadsQueryEnabled =
    Boolean(selectedSessionId) &&
    (!dateFilterActive || useSessionScopedDateFilter);
  const openedAtCatalogQuery = useMemo(
    () => ({
      page,
      pageSize: CATALOG_PAGE_SIZE,
      name: debouncedName || undefined,
      openedFrom: openedFrom || undefined,
      openedTo: openedTo || undefined,
      ...(openingDateScope === "city" && formCityFilled
        ? {
            city: formValues.city.trim(),
            uf: formValues.uf.trim().toUpperCase(),
          }
        : {}),
    }),
    [
      page,
      debouncedName,
      openedFrom,
      openedTo,
      openingDateScope,
      formCityFilled,
      formValues.city,
      formValues.uf,
    ],
  );

  const sessionsQuery = useLeadSearchSessions();
  const sessionLeadsQuery = useLeadSearchSessionLeads(
    selectedSessionId,
    {
      page,
      pageSize: CATALOG_PAGE_SIZE,
      name: debouncedName || undefined,
      ...(useSessionScopedDateFilter
        ? {
            openedFrom: openedFrom || undefined,
            openedTo: openedTo || undefined,
          }
        : {}),
    },
    sessionLeadsQueryEnabled,
  );
  const openedAtQuery = useCompaniesByOpenedAt(
    openedAtCatalogQuery,
    useOpenedAtCatalogFilter,
  );
  const searchMutation = useCompanySearchMutation();

  const sessions = sessionsQuery.data ?? [];
  const loadingSessions = sessionsQuery.isLoading && !sessionsQuery.data;
  const loadingSessionLeads =
    Boolean(selectedSessionId) &&
    (sessionLeadsQuery.isLoading || sessionLeadsQuery.isFetching) &&
    !sessionLeadsQuery.data;
  const searching = searchMutation.isPending;
  const searchProgress = useSimulatedSearchProgress(searching);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedName(nameFilter.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [nameFilter]);

  useEffect(() => {
    writePersistedB2bProspectingState({
      selectedSessionId,
      formValues,
    });
  }, [formValues, selectedSessionId]);

  const hasSearchContext = Boolean(
    selectedSessionId ||
      searchMutation.data ||
      activeLeads.length > 0 ||
      totalCount > 0 ||
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
    setPage(1);
    setHasAutoSelectedSession(true);
  }, [hasAutoSelectedSession, loadingSessions, selectedSessionId, sessions]);

  useEffect(() => {
    if (!useOpenedAtCatalogFilter || !openedAtQuery.isError) return;
    setActiveLeads([]);
    setTotalCount(0);
    toast.error("Não foi possível buscar empresas por data de abertura.");
  }, [
    useOpenedAtCatalogFilter,
    openedAtQuery.isError,
    openedAtQuery.errorUpdatedAt,
  ]);

  useEffect(() => {
    if (useSessionScopedDateFilter) {
      if (sessionLeadsQuery.isError) return;
      if (sessionLeadsQuery.data) {
        setActiveLeads(sessionLeadsQuery.data.leads);
        setTotalCount(sessionLeadsQuery.data.totalCount);
      }
      return;
    }

    if (useOpenedAtCatalogFilter) {
      if (openedAtQuery.isError) return;
      if (openedAtQuery.data) {
        setActiveLeads(openedAtQuery.data.leads);
        setTotalCount(openedAtQuery.data.totalCount);
      }
      return;
    }

    if (
      dateFilterActive &&
      openingDateScope === "lastSearch" &&
      !selectedSessionId
    ) {
      setActiveLeads([]);
      setTotalCount(0);
      return;
    }

    if (dateFilterActive && openingDateScope === "city" && !formCityFilled) {
      setActiveLeads([]);
      setTotalCount(0);
      return;
    }

    if (selectedSessionId && sessionLeadsQuery.data) {
      setActiveLeads(sessionLeadsQuery.data.leads);
      setTotalCount(sessionLeadsQuery.data.totalCount);
      return;
    }

    if (!selectedSessionId && !searchMutation.data) {
      setActiveLeads([]);
      setTotalCount(0);
    }
  }, [
    dateFilterActive,
    formCityFilled,
    openingDateScope,
    useSessionScopedDateFilter,
    useOpenedAtCatalogFilter,
    openedAtQuery.data,
    openedAtQuery.isError,
    sessionLeadsQuery.data,
    sessionLeadsQuery.isError,
    selectedSessionId,
    searchMutation.data,
  ]);

  useEffect(() => {
    if (dateFilterActive) return;
    if (!selectedSessionId && searchMutation.data) {
      setActiveLeads(searchMutation.data.leads);
      setTotalCount(searchMutation.data.totalCount);
    }
  }, [dateFilterActive, searchMutation.data, selectedSessionId]);

  const loadingResults =
    searching ||
    (useOpenedAtCatalogFilter
      ? openedAtQuery.isLoading || openedAtQuery.isFetching
      : useSessionScopedDateFilter
        ? sessionLeadsQuery.isLoading || sessionLeadsQuery.isFetching
        : loadingSessionLeads ||
          (Boolean(selectedSessionId) && sessionLeadsQuery.isFetching));

  const handleSearch = useCallback(() => {
    const queryValue = formValues.queryValue.trim();
    const city = formValues.city.trim();
    const uf = formValues.uf.trim().toUpperCase();
    const address = formValues.address.trim();

    if (!city || !uf) {
      toast.error("Informe a cidade e o estado.");
      return;
    }

    if (!queryValue) {
      toast.error("Selecione um CNAE e informe a cidade e o estado.");
      return;
    }

    setNameFilter("");
    setDebouncedName("");
    setOpenedFrom("");
    setOpenedTo("");
    setPage(1);
    setSelectedSessionId(null);

    void searchMutation
      .mutateAsync({
        queryType: "CNAE",
        queryValue,
        city,
        uf,
        address: address || undefined,
        page: 1,
        pageSize: CATALOG_PAGE_SIZE,
      })
      .then((data) => {
        setActiveLeads(data.leads);
        setTotalCount(data.totalCount);
        setSelectedSessionId(data.session.id);
        setOpeningDateScope("lastSearch");
        setHasAutoSelectedSession(true);
        void queryClient.invalidateQueries({ queryKey: PROSPECTING_LEADS_KEY });

        if (data.totalCount > 0) {
          toast.success(
            `Encontramos ${data.totalCount} empresa(s) em ${city} para este CNAE.`,
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
  }, [formValues, queryClient, searchMutation]);

  function shouldOpenOrganizationModal() {
    return isCrmRole(user?.role) || canAssignOwner || organizations.length > 1;
  }

  function getDefaultOrganizationId() {
    if (organizations.length === 1) return organizations[0]?.id ?? "";
    return "";
  }

  function replaceLeadInLists(updated: Lead, previous?: Lead) {
    const matches = (item: Lead) =>
      item.id === updated.id ||
      (previous != null && item.id === previous.id) ||
      (updated.placeId != null &&
        item.placeId != null &&
        item.placeId === updated.placeId);

    setActiveLeads((current) =>
      current.map((item) => (matches(item) ? updated : item)),
    );

    if (useOpenedAtCatalogFilter) {
      const catalogCity =
        openingDateScope === "city" ? formValues.city.trim() : "";
      const catalogUf =
        openingDateScope === "city"
          ? formValues.uf.trim().toUpperCase()
          : "";
      queryClient.setQueryData<OpenedAtCompaniesResponse>(
        [
          "companies-by-opened-at",
          page,
          CATALOG_PAGE_SIZE,
          debouncedName,
          openedFrom,
          openedTo,
          catalogCity,
          catalogUf,
        ],
        (current) => {
          if (!current) return current;
          return {
            ...current,
            leads: current.leads.map((item) =>
              matches(item) ? updated : item,
            ),
          };
        },
      );
    } else if (selectedSessionId) {
      queryClient.setQueryData<B2bLeadSearchResponse>(
        [
          "lead-search-session",
          selectedSessionId,
          page,
          CATALOG_PAGE_SIZE,
          debouncedName,
          useSessionScopedDateFilter ? openedFrom : "",
          useSessionScopedDateFilter ? openedTo : "",
        ],
        (current) => {
          if (!current) return current;
          return {
            ...current,
            leads: current.leads.map((item) =>
              matches(item) ? updated : item,
            ),
          };
        },
      );
    }

    queryClient.setQueryData<Lead[]>(PROSPECTING_LEADS_KEY, (current) => {
      if (!current?.some(matches)) return current;
      return current.map((item) => (matches(item) ? updated : item));
    });
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
          const updated = await leadsService.addToKanban(
            {
              ...buildAddToKanbanInput(lead, undefined, organizationId),
              ...(ownerUserId ? { ownerUserId } : {}),
            },
            { skipToast: true },
          );
          added += 1;
          replaceLeadInLists(updated, lead);
        } catch {
          /* continue */
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

  const emptyMessage = useSessionScopedDateFilter
    ? "Nenhuma empresa nesta busca com essa data de abertura."
    : useOpenedAtCatalogFilter
      ? openingDateScope === "city"
        ? "Nenhuma empresa nessa cidade com essa data de abertura."
        : "Nenhuma empresa encontrada com essa data de abertura."
      : dateFilterActive && openingDateScope === "lastSearch" && !selectedSessionId
        ? "Nenhuma busca CNAE anterior. Faça uma busca ou escolha outro escopo."
        : dateFilterActive && openingDateScope === "city" && !formCityFilled
          ? "Preencha cidade e estado no formulário para filtrar por cidade."
          : !hasSearchContext
            ? "Faça uma busca no formulário para ver as empresas aqui."
            : "Nenhuma empresa encontrada para esta busca ou filtros.";

  const pageSize = useMemo(
    () =>
      (useOpenedAtCatalogFilter
        ? openedAtQuery.data?.pageSize
        : sessionLeadsQuery.data?.pageSize) ?? CATALOG_PAGE_SIZE,
    [
      useOpenedAtCatalogFilter,
      openedAtQuery.data?.pageSize,
      sessionLeadsQuery.data?.pageSize,
    ],
  );

  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
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

        <CompanySearchForm
          values={formValues}
          loading={searching}
          searchProgress={searching ? searchProgress : null}
          onChange={setFormValues}
          onSubmit={handleSearch}
        />

        <Card className="shrink-0 rounded-2xl border border-[var(--atria-primary)]/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="company-name-filter">Por nome</FieldLabel>
              <Input
                id="company-name-filter"
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                placeholder="Filtrar por nome..."
              />
            </Field>

            <div className="grid gap-3">
              <Field>
                <FieldLabel htmlFor="company-opened-from">
                  Data de abertura (de)
                </FieldLabel>
                <Input
                  id="company-opened-from"
                  type="date"
                  value={openedFrom}
                  onChange={(event) => {
                    setOpenedFrom(event.target.value);
                    setPage(1);
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="company-opened-to">
                  Data de abertura (até)
                </FieldLabel>
                <Input
                  id="company-opened-to"
                  type="date"
                  value={openedTo}
                  min={openedFrom || undefined}
                  onChange={(event) => {
                    setOpenedTo(event.target.value);
                    setPage(1);
                  }}
                />
              </Field>

              <FieldSet>
                <FieldLegend variant="label">
                  Escopo da data de abertura
                </FieldLegend>
                <div data-slot="radio-group" className="flex flex-col gap-2.5">
                  {OPENING_DATE_SCOPE_OPTIONS.map((option) => {
                    const inputId = `opening-date-scope-${option.id}`;
                    return (
                      <label
                        key={option.id}
                        htmlFor={inputId}
                        className="flex cursor-pointer items-center gap-2.5 text-sm"
                      >
                        <input
                          id={inputId}
                          name="opening-date-scope"
                          type="radio"
                          checked={openingDateScope === option.id}
                          onChange={() => {
                            setOpeningDateScope(option.id);
                            setPage(1);
                          }}
                          className="size-4 accent-[var(--atria-primary)]"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-[var(--atria-primary)]/50">
                  Padrão: última busca CNAE. O escopo vale ao preencher a data.
                  Só &quot;de&quot; na data vai até hoje.
                </p>
              </FieldSet>
            </div>
          </CardContent>
        </Card>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white/50">
        <ProspectingLeadsList
          leads={activeLeads}
          loading={loadingResults}
          searchProgress={searching ? searchProgress : null}
          emptyMessage={emptyMessage}
          addingKanbanId={addingKanbanId}
          showOpenedAt
          paginationMode="server"
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
          onAddToKanban={(lead) => {
            if (lead.kanbanTracked) return;
            requestAddToKanban([lead]);
          }}
        />
      </section>
    </div>
  );
}
