"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";
import {
  ApiError,
  clientsService,
  organizationsService,
  usersService,
} from "@/services";
import type { Client, ManagedUser } from "@/services/types";

export function ClientSdrSettingsPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [members, setMembers] = useState<ManagedUser[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [hasCrmEnabled, setHasCrmEnabled] = useState(false);
  const [sdrUserIds, setSdrUserIds] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingOrganization, setLoadingOrganization] = useState(false);
  const [saving, setSaving] = useState(false);

  const sdrOptions = useMemo(
    () =>
      members
        .filter((member) => member.role.toLowerCase() === "crm")
        .map((member) => ({
          value: member.id,
          label: member.name,
        })),
    [members],
  );

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [nextClients, nextMembers] = await Promise.all([
        clientsService.getClients({ activeOnly: true }),
        usersService.getMembers(),
      ]);
      setClients(nextClients);
      setMembers(nextMembers);
      setOrganizationId((current) => current || nextClients[0]?.id || "");
    } catch {
      setClients([]);
      setMembers([]);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const loadOrganization = useCallback(async (id: string) => {
    if (!id) {
      setHasCrmEnabled(false);
      setSdrUserIds([]);
      return;
    }

    setLoadingOrganization(true);
    try {
      const organization = await organizationsService.getOrganization(id);
      setHasCrmEnabled(organization.hasCrmEnabled);
      setSdrUserIds(
        organization.sdrAssignments.map((assignment) => assignment.userId),
      );
    } catch (err) {
      setHasCrmEnabled(false);
      setSdrUserIds([]);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as configurações SDR.",
      );
    } finally {
      setLoadingOrganization(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (!organizationId) return;
    void loadOrganization(organizationId);
  }, [loadOrganization, organizationId]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!organizationId) return;

    setSaving(true);
    try {
      await organizationsService.updateCrmStatus(organizationId, hasCrmEnabled);
      const updated = await organizationsService.replaceSdrAssignments(
        organizationId,
        hasCrmEnabled ? sdrUserIds : [],
      );
      setHasCrmEnabled(updated.hasCrmEnabled);
      setSdrUserIds(
        updated.sdrAssignments.map((assignment) => assignment.userId),
      );
      toast.success("Configurações SDR salvas com sucesso");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar as configurações SDR.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingOptions) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-[var(--atria-primary)]/10 bg-white">
        <Loader2 className="size-6 animate-spin text-[var(--atria-primary)]" />
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSave(event)}
      className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="sdr-organization">Empresa cliente</FieldLabel>
          <SearchableSelect
            id="sdr-organization"
            value={organizationId}
            onValueChange={setOrganizationId}
            placeholder="Selecione a empresa..."
            searchPlaceholder="Buscar empresa..."
            emptyLabel="Nenhuma empresa encontrada"
            options={clients.map((client) => ({
              value: client.id,
              label: client.companyName,
            }))}
          />
        </Field>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02] p-4">
          <div>
            <p className="font-medium text-[var(--atria-primary)]">Ativar CRM</p>
            <p className="text-sm text-[var(--atria-primary)]/50">
              Habilita o módulo de prospecção e o acesso CRM no portal do cliente.
            </p>
          </div>
          <Switch
            id="sdr-enabled"
            checked={hasCrmEnabled}
            onCheckedChange={setHasCrmEnabled}
            disabled={!organizationId || loadingOrganization || saving}
          />
        </div>

        {hasCrmEnabled && (
          <Field>
            <FieldLabel htmlFor="sdr-assignments">SDRs Responsáveis</FieldLabel>
            <SearchableMultiSelect
              id="sdr-assignments"
              values={sdrUserIds}
              onValuesChange={setSdrUserIds}
              options={sdrOptions}
              placeholder="Selecione os SDRs..."
              searchPlaceholder="Buscar membro CRM..."
              emptyLabel="Nenhum usuário CRM encontrado"
              loading={loadingOrganization}
              disabled={!organizationId || saving}
            />
            <p className="mt-1.5 text-[11px] text-[var(--atria-primary)]/45">
              Apenas membros com papel CRM podem ser atribuídos como SDR.
            </p>
          </Field>
        )}
      </FieldGroup>

      <div className="mt-5 flex justify-end">
        <Button
          type="submit"
          disabled={!organizationId || saving || loadingOrganization}
          className="gap-2 bg-[var(--atria-primary)] text-white"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </form>
  );
}
