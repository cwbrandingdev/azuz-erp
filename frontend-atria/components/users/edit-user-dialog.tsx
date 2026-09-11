"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { GroupBadge } from "@/components/ui/group-badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { UserAvatarPicker } from "@/components/users/user-avatar-picker";
import { useAuth } from "@/contexts/auth-context";
import { ApiError, clientsService, userGroupsService, usersService } from "@/services";
import type { Client, ManagedUser, UserGroup } from "@/services/types";

const ROLE_OPTIONS = [
  { value: "DESIGNER_JUNIOR", label: "Designer Júnior" },
  { value: "DESIGNER_MASTER", label: "Designer Sênior" },
  { value: "CRM", label: "CRM" },
  { value: "ADMIN", label: "Administrador" },
  { value: "MASTER", label: "Master" },
  { value: "EXTERNAL_CLIENT_CRM", label: "CRM Externo" },
  { value: "CLIENT", label: "Cliente" },
] as const;

interface EditUserDialogProps {
  user: ManagedUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: EditUserDialogProps) {
  const { user: authUser, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [userGroupId, setUserGroupId] = useState("");
  const [clientId, setClientId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("DESIGNER_JUNIOR");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [crmIncludeInternal, setCrmIncludeInternal] = useState(false);
  const [crmScopeClientIds, setCrmScopeClientIds] = useState<string[]>([]);

  const isClientRole =
    role === "CLIENT" || role === "EXTERNAL_CLIENT_CRM";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setOptionsLoading(true);
    Promise.all([
      userGroupsService.getUserGroups().catch(() => [] as UserGroup[]),
      clientsService.getClients().catch(() => [] as Client[]),
    ])
      .then(([nextGroups, nextClients]) => {
        if (cancelled) return;
        setGroups(nextGroups);
        setClients(nextClients);
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!user) return;
    setUserGroupId(user.userGroup?.id ?? "");
    setClientId(user.clientId ?? user.client?.id ?? "");
    setEmail(user.email);
    setRole(user.role.toUpperCase());
    setMonthlySalary(
      user.monthlySalary !== null ? String(user.monthlySalary) : "",
    );
    setAvatarUrl(user.avatarUrl);
    setCrmIncludeInternal(user.crmIncludeInternal ?? false);
    setCrmScopeClientIds(user.crmScopeClientIds ?? []);
    setError(null);
  }, [user, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (isClientRole && !clientId) {
      setError("Selecione a empresa vinculada ao usuário CLIENT.");
      return;
    }

    if (!email.trim()) {
      setError("Informe o e-mail do usuário.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await usersService.updateUser(user.id, {
        email: email.trim().toLowerCase(),
        userGroupId: isClientRole ? null : userGroupId || null,
        role: role as
          | "MASTER"
          | "ADMIN"
          | "DESIGNER_MASTER"
          | "DESIGNER_JUNIOR"
          | "CRM"
          | "EXTERNAL_CLIENT_CRM"
          | "CLIENT",
        monthlySalary: isClientRole
          ? null
          : monthlySalary
            ? Number(monthlySalary)
            : null,
        clientId: isClientRole ? clientId : null,
        avatarUrl,
        ...(role === "CRM"
          ? {
              crmIncludeInternal,
              crmScopeClientIds,
            }
          : {}),
      });
      if (authUser?.id === updated.id) {
        updateUser({
          avatarUrl: updated.avatarUrl ?? undefined,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          clientId: updated.clientId ?? null,
        });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível atualizar o usuário.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-[var(--atria-primary)]">
              {user.category === "client" || user.role === "client"
                ? "Editar cliente"
                : "Editar membro"}
            </DialogTitle>
          </DialogHeader>

          <FieldGroup className="py-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <UserAvatarPicker
              name={user.name}
              value={avatarUrl}
              onChange={(next) => setAvatarUrl(next)}
              onUpload={async (file) => {
                const updated = await usersService.uploadUserAvatar(
                  user.id,
                  file,
                );
                if (authUser?.id === updated.id) {
                  updateUser({ avatarUrl: updated.avatarUrl ?? undefined });
                }
                return updated.avatarUrl ?? "";
              }}
              onRemove={async () => {
                const updated = await usersService.updateUser(user.id, {
                  avatarUrl: null,
                });
                if (authUser?.id === updated.id) {
                  updateUser({ avatarUrl: undefined });
                }
                setAvatarUrl(null);
              }}
            />

            <div className="rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/3 p-3">
              <p className="font-medium text-[var(--atria-primary)]">{user.name}</p>
              {user.userGroup && (
                <div className="mt-2">
                  <GroupBadge
                    name={user.userGroup.name}
                    color={user.userGroup.color}
                  />
                </div>
              )}
              {user.client && (
                <p className="mt-2 text-xs text-[var(--atria-primary)]/55">
                  Empresa: {user.client.companyName}
                </p>
              )}
            </div>

            <Field>
              <FieldLabel htmlFor="edit-email">E-mail</FieldLabel>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@gmail.com"
                required
              />
              <p className="mt-1.5 text-[11px] text-[var(--atria-primary)]/45">
                Usado para login e notificações. Coloque o e-mail que a pessoa realmente acessa.
              </p>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-role">Função</FieldLabel>
              <SearchableSelect
                id="edit-role"
                value={role}
                onValueChange={(value) => {
                  setRole(value);
                  if (value !== "CLIENT" && value !== "EXTERNAL_CLIENT_CRM") {
                    setClientId("");
                  }
                  if (value !== "CRM") {
                    setCrmIncludeInternal(false);
                    setCrmScopeClientIds([]);
                  }
                }}
                options={ROLE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
              />
            </Field>

            {isClientRole ? (
              <Field>
                <FieldLabel htmlFor="edit-client">Empresa *</FieldLabel>
                <SearchableSelect
                  id="edit-client"
                  value={clientId}
                  onValueChange={setClientId}
                  loading={optionsLoading}
                  placeholder="Selecione o cliente..."
                  searchPlaceholder="Buscar empresa..."
                  emptyLabel="Nenhuma empresa encontrada"
                  options={clients.map((client) => ({
                    value: client.id,
                    label: client.companyName,
                  }))}
                />
                <p className="mt-1.5 text-[11px] text-[var(--atria-primary)]/45">
                  Obrigatório para acesso ao Portal do Cliente. Os dados
                  exibidos serão filtrados por esta empresa.
                </p>
              </Field>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="edit-group">Grupo de equipe</FieldLabel>
                  <SearchableSelect
                    id="edit-group"
                    value={userGroupId}
                    onValueChange={setUserGroupId}
                    loading={optionsLoading}
                    allowEmpty
                    emptyOptionLabel="Sem grupo"
                    options={groups.map((group) => ({
                      value: group.id,
                      label: group.name,
                    }))}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-salary">Salário mensal (R$)</FieldLabel>
                  <input
                    id="edit-salary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                    placeholder="Opcional"
                  />
                </Field>

                {role === "CRM" && (
                  <div className="space-y-3 rounded-xl border border-[var(--atria-primary)]/10 p-3">
                    <p className="text-sm font-medium text-[var(--atria-primary)]">
                      Escopo CRM
                    </p>
                    <label className="flex items-center gap-2 text-sm text-[var(--atria-primary)]">
                      <input
                        type="checkbox"
                        checked={crmIncludeInternal}
                        onChange={(e) => setCrmIncludeInternal(e.target.checked)}
                      />
                      Leads internos (Atria)
                    </label>
                    <div className="space-y-2">
                      <p className="text-xs text-[var(--atria-primary)]/55">
                        Clientes atribuídos
                      </p>
                      {clients.map((client) => (
                        <label
                          key={client.id}
                          className="flex items-center gap-2 text-sm text-[var(--atria-primary)]"
                        >
                          <input
                            type="checkbox"
                            checked={crmScopeClientIds.includes(client.id)}
                            onChange={(e) => {
                              setCrmScopeClientIds((current) =>
                                e.target.checked
                                  ? [...current, client.id]
                                  : current.filter((id) => id !== client.id),
                              );
                            }}
                          />
                          {client.companyName}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || (isClientRole && !clientId)}
              className="bg-[var(--atria-primary)] text-white"
            >
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditUserButtonProps {
  user: ManagedUser;
  onSuccess: () => void;
}

export function EditUserButton({ user, onSuccess }: EditUserButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        title="Editar membro"
      >
        <Pencil className="size-4 text-[var(--atria-primary)]/60" />
      </Button>
      <EditUserDialog
        user={user}
        open={open}
        onOpenChange={setOpen}
        onSuccess={onSuccess}
      />
    </>
  );
}
