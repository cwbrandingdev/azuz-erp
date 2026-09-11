"use client";

import { useEffect, useState } from "react";
import { Building2, Copy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { GroupBadge } from "@/components/ui/group-badge";
import { UserAvatarPicker } from "@/components/users/user-avatar-picker";
import { ApiError, clientsService, userGroupsService, usersService } from "@/services";
import type {
  Client,
  ProvisionUserResult,
  UserGroup,
} from "@/services/types";

type ProvisionMode = "member" | "client";

interface ProvisionUserDialogProps {
  mode?: ProvisionMode;
  onSuccess: () => void;
}

const MEMBER_ROLE_OPTIONS = [
  { value: "DESIGNER_JUNIOR", label: "Designer Júnior" },
  { value: "DESIGNER_MASTER", label: "Designer Sênior" },
  { value: "CRM", label: "CRM" },
  { value: "ADMIN", label: "Administrador" },
  { value: "MASTER", label: "Master" },
] as const;

type MemberRole = (typeof MEMBER_ROLE_OPTIONS)[number]["value"];

export function ProvisionUserDialog({
  mode = "member",
  onSuccess,
}: ProvisionUserDialogProps) {
  const isClientMode = mode === "client";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [result, setResult] = useState<ProvisionUserResult | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("DESIGNER_JUNIOR");
  const [password, setPassword] = useState("");
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [userGroupId, setUserGroupId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [copied, setCopied] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [crmIncludeInternal, setCrmIncludeInternal] = useState(false);
  const [crmScopeClientIds, setCrmScopeClientIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setOptionsLoading(true);
    const load = isClientMode
      ? clientsService.getClients().then((nextClients) => {
          if (!cancelled) setClients(nextClients);
        })
      : Promise.all([
          userGroupsService.getUserGroups(),
          clientsService.getClients(),
        ])
          .then(([nextGroups, nextClients]) => {
            if (cancelled) return;
            setGroups(nextGroups);
            setClients(nextClients);
          });

    void load
      .catch(() => {
        if (cancelled) return;
        if (isClientMode) setClients([]);
        else setGroups([]);
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isClientMode]);

  function resetForm() {
    setName("");
    setRole("DESIGNER_JUNIOR");
    setUserGroupId("");
    setClientId("");
    setClientEmail("");
    setMemberEmail("");
    setMonthlySalary("");
    setEmailDomain("");
    setPassword("");
    setUseCustomPassword(false);
    setAvatarPreview(null);
    setAvatarFile(null);
    setCrmIncludeInternal(false);
    setCrmScopeClientIds([]);
    setError(null);
    setResult(null);
    setCopied(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isClientMode && !clientId) {
        setError("Selecione a empresa do cliente.");
        setLoading(false);
        return;
      }
      if (isClientMode && !clientEmail.trim()) {
        setError("Informe o e-mail de acesso do cliente.");
        setLoading(false);
        return;
      }

      const response = await usersService.provisionUser(
        isClientMode
          ? {
              name: name.trim(),
              role: "CLIENT",
              clientId,
              email: clientEmail.trim().toLowerCase(),
              password: useCustomPassword ? password : undefined,
            }
          : {
              name: name.trim(),
              role,
              userGroupId: userGroupId || undefined,
              password: useCustomPassword ? password : undefined,
              monthlySalary: monthlySalary ? Number(monthlySalary) : undefined,
              email: memberEmail.trim()
                ? memberEmail.trim().toLowerCase()
                : undefined,
              emailDomain: emailDomain.trim() || undefined,
              ...(role === "CRM"
                ? {
                    crmIncludeInternal,
                    crmScopeClientIds,
                  }
                : {}),
            },
      );

      let finalResult = response;
      if (avatarFile) {
        try {
          const withAvatar = await usersService.uploadUserAvatar(
            response.user.id,
            avatarFile,
          );
          finalResult = {
            ...response,
            user: withAvatar,
          };
        } catch (avatarError) {
          setError(
            avatarError instanceof ApiError
              ? `Usuário criado, mas a foto falhou: ${avatarError.message}`
              : "Usuário criado, mas o upload da foto falhou.",
          );
        }
      }

      setResult(finalResult);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível provisionar o usuário.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyCredentials() {
    if (!result) return;
    const text = `E-mail: ${result.credentials.email}\nSenha temporária: ${result.credentials.temporaryPassword}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetForm();
      }}
    >
      <DialogTrigger
        render={
          <Button className="bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90" />
        }
      >
        {isClientMode ? (
          <>
            <Building2 className="size-4" />
            Adicionar Cliente
          </>
        ) : (
          <>
            <UserPlus className="size-4" />
            Adicionar Membro
          </>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-[var(--atria-primary)]">
                {isClientMode
                  ? "Acesso ao portal criado"
                  : "Membro criado com sucesso"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <p className="text-sm text-[var(--atria-primary)]/70">
                Compartilhe as credenciais abaixo com{" "}
                <strong>{result.user.name}</strong>. A senha deverá ser
                alterada no primeiro acesso.
              </p>

              <div className="rounded-xl border border-[var(--atria-accent)]/50 bg-[var(--atria-accent)]/10 p-4">
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--atria-primary)]/50">
                      E-mail
                    </p>
                    <p className="font-mono text-[var(--atria-primary)]">
                      {result.credentials.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--atria-primary)]/50">
                      Senha temporária
                    </p>
                    <p className="font-mono text-[var(--atria-primary)]">
                      {result.credentials.temporaryPassword}
                    </p>
                  </div>
                </div>
              </div>

              {result.user.client?.companyName && (
                <p className="text-sm text-[var(--atria-primary)]/65">
                  Empresa:{" "}
                  <span className="font-medium text-[var(--atria-primary)]">
                    {result.user.client.companyName}
                  </span>
                </p>
              )}

              {result.user.userGroup && (
                <GroupBadge
                  name={result.user.userGroup.name}
                  color={result.user.userGroup.color}
                />
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => void copyCredentials()}
                className="bg-[var(--atria-primary)] text-white"
              >
                <Copy className="size-4" />
                {copied ? "Copiado!" : "Copiar Credenciais"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                Fechar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-[var(--atria-primary)]">
                {isClientMode
                  ? "Provisionar usuário cliente"
                  : "Provisionar membro da equipe"}
              </DialogTitle>
            </DialogHeader>

            <FieldGroup className="py-4">
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <UserAvatarPicker
                name={name || (isClientMode ? "Novo cliente" : "Novo membro")}
                value={avatarPreview}
                onChange={(next, file) => {
                  setAvatarPreview(next);
                  setAvatarFile(file ?? null);
                }}
              />

              <Field>
                <FieldLabel htmlFor="pu-name">Nome completo *</FieldLabel>
                <Input
                  id="pu-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isClientMode ? "Contato da empresa" : "João Silva"}
                  required
                />
              </Field>

              {isClientMode ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="pu-client">Empresa *</FieldLabel>
                    <SearchableSelect
                      id="pu-client"
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
                      O portal filtrará conteúdo e entregas desta empresa.
                    </p>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="pu-email">E-mail de acesso *</FieldLabel>
                    <Input
                      id="pu-email"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="contato@empresa.com"
                      required
                    />
                  </Field>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="pu-role">Função *</FieldLabel>
                      <SearchableSelect
                        id="pu-role"
                        value={role}
                        onValueChange={(value) => {
                          setRole(value as MemberRole);
                          if (value !== "CRM") {
                            setCrmIncludeInternal(false);
                            setCrmScopeClientIds([]);
                          }
                        }}
                        options={MEMBER_ROLE_OPTIONS.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="pu-salary">Salário mensal (R$)</FieldLabel>
                      <Input
                        id="pu-salary"
                        type="number"
                        min="0"
                        step="0.01"
                        value={monthlySalary}
                        onChange={(e) => setMonthlySalary(e.target.value)}
                        placeholder="0,00"
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="pu-group">Grupo de equipe</FieldLabel>
                    <SearchableSelect
                      id="pu-group"
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

                  <Field>
                    <FieldLabel htmlFor="pu-member-email">E-mail (opcional)</FieldLabel>
                    <Input
                      id="pu-member-email"
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="nome@gmail.com"
                    />
                    <p className="mt-1.5 text-[11px] text-[var(--atria-primary)]/45">
                      E-mail de login e notificações. Se vazio, será gerado com o domínio abaixo.
                    </p>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="pu-domain">Domínio do e-mail</FieldLabel>
                    <Input
                      id="pu-domain"
                      value={emailDomain}
                      onChange={(e) => setEmailDomain(e.target.value)}
                      placeholder="atria.com (padrão)"
                    />
                  </Field>
                </>
              )}

              <Field>
                <label className="flex items-center gap-2 text-sm text-[var(--atria-primary)]/80">
                  <input
                    type="checkbox"
                    checked={useCustomPassword}
                    onChange={(event) =>
                      setUseCustomPassword(event.target.checked)
                    }
                  />
                  Definir senha personalizada
                </label>
              </Field>

              {useCustomPassword && (
                <Field>
                  <FieldLabel htmlFor="pu-password">Senha *</FieldLabel>
                  <Input
                    id="pu-password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </Field>
              )}
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  (isClientMode && (!clientId || !clientEmail.trim()))
                }
                className="bg-[var(--atria-primary)] text-white"
              >
                {loading
                  ? "Criando..."
                  : isClientMode
                    ? "Criar Cliente"
                    : "Criar Membro"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
