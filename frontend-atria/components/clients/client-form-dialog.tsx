"use client";

import { useEffect, useState } from "react";
import { Copy, Plus, Loader2 } from "lucide-react";
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
import { clientsService, clientGroupsService, ApiError } from "@/services";
import { toast } from "@/lib/toast";
import { usePermissions } from "@/hooks/use-permissions";
import type { Client, ClientGroup, CreateClientAccessResult } from "@/services/types";
import {
  formatDocument,
  formatZipCode,
  lookupAddressByCnpj,
  lookupAddressByZipCode,
  onlyDigits,
  isValidCnpj,
} from "@/lib/address-lookup";

interface ClientFormDialogProps {
  client?: Client | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess: () => void;
  trigger?: boolean;
}

export function ClientFormDialog({
  client,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  trigger = true,
}: ClientFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [instagramUserId, setInstagramUserId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [website, setWebsite] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [notes, setNotes] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [clientGroupId, setClientGroupId] = useState("");
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [accessLoginEmail, setAccessLoginEmail] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [accessDisplayName, setAccessDisplayName] = useState("");
  const [createdAccess, setCreatedAccess] = useState<CreateClientAccessResult | null>(
    null,
  );
  const [copiedAccess, setCopiedAccess] = useState(false);

  const { canManageUsers } = usePermissions();
  const canCreateLogin = canManageUsers();

  const isEditing = Boolean(client);

  useEffect(() => {
    if (!open) return;
    void clientGroupsService.getClientGroups().then(setGroups).catch(() => setGroups([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (client) {
      setCompanyName(client.companyName);
      setContactName(client.contactName ?? "");
      setDocument(client.document ? formatDocument(client.document) : "");
      setEmail(client.email ?? "");
      setPhone(client.phone ?? "");
      setInstagram(client.instagram ?? "");
      setInstagramUserId(client.instagramUserId ?? "");
      setMetaAccessToken("");
      setWebsite(client.website ?? "");
      setStreet(client.street ?? "");
      setNumber(client.number ?? "");
      setNeighborhood(client.neighborhood ?? "");
      setCity(client.city ?? "");
      setState(client.state ?? "");
      setZipCode(client.zipCode ? formatZipCode(client.zipCode) : "");
      setNotes(client.notes ?? "");
      setAvatarUrl(client.avatarUrl ?? "");
      setClientGroupId(client.clientGroup?.id ?? "");
    } else {
      resetForm();
    }
  }, [client, open]);

  function resetForm() {
    setCompanyName("");
    setContactName("");
    setDocument("");
    setEmail("");
    setPhone("");
    setInstagram("");
    setInstagramUserId("");
    setMetaAccessToken("");
    setWebsite("");
    setStreet("");
    setNumber("");
    setNeighborhood("");
    setCity("");
    setState("");
    setZipCode("");
    setNotes("");
    setAvatarUrl("");
    setClientGroupId("");
    setAccessLoginEmail("");
    setAccessPassword("");
    setAccessDisplayName("");
    setCreatedAccess(null);
    setCopiedAccess(false);
    setError(null);
  }

  async function handleDocumentLookup() {
    const digits = onlyDigits(document);
    if (!isValidCnpj(digits)) {
      toast.info("Para CPF, use o CEP para buscar o endereço automaticamente.");
      return;
    }

    setLookupLoading(true);
    try {
      const result = await lookupAddressByCnpj(document);
      if (!result) {
        toast.error("Não foi possível consultar o CNPJ.");
        return;
      }
      if (result.companyName) setCompanyName(result.companyName);
      setStreet(result.street);
      setNeighborhood(result.neighborhood);
      setCity(result.city);
      setState(result.state);
      if (result.zipCode) setZipCode(result.zipCode);
      toast.success("Dados preenchidos pelo CNPJ");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleZipLookup() {
    const digits = onlyDigits(zipCode);
    if (digits.length !== 8) return;

    setLookupLoading(true);
    try {
      const result = await lookupAddressByZipCode(zipCode);
      if (!result) {
        toast.error("CEP não encontrado.");
        return;
      }
      setStreet(result.street);
      setNeighborhood(result.neighborhood);
      setCity(result.city);
      setState(result.state);
      setZipCode(result.zipCode);
      toast.success("Endereço preenchido pelo CEP");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isEditing && canCreateLogin) {
      if (!accessLoginEmail.trim()) {
        setError("Informe o e-mail de login do cliente.");
        setLoading(false);
        return;
      }
      if (accessPassword.length < 6) {
        setError("A senha de acesso deve ter pelo menos 6 caracteres.");
        setLoading(false);
        return;
      }
    }

    const payload = {
      companyName,
      contactName: isEditing ? contactName || undefined : undefined,
      document: onlyDigits(document) || undefined,
      email: email || undefined,
      phone: phone || undefined,
      instagram: instagram || undefined,
      instagramUserId: instagramUserId || undefined,
      metaAccessToken: metaAccessToken || undefined,
      website: website || undefined,
      street: street || undefined,
      number: number || undefined,
      neighborhood: neighborhood || undefined,
      city: city || undefined,
      state: state || undefined,
      zipCode: onlyDigits(zipCode) || undefined,
      notes: notes || undefined,
      avatarUrl: avatarUrl || undefined,
      clientGroupId: clientGroupId || undefined,
      ...(!isEditing && canCreateLogin
        ? {
            initialAccess: {
              email: accessLoginEmail.trim().toLowerCase(),
              password: accessPassword,
              name:
                accessDisplayName.trim() ||
                companyName.trim(),
            },
          }
        : {}),
    };

    try {
      if (isEditing && client) {
        const { initialAccess: _ignored, ...updatePayload } = payload;
        await clientsService.updateClient(client.id, updatePayload);
        resetForm();
        setOpen(false);
        onSuccess();
        toast.success("Cliente atualizado!");
      } else {
        const created = await clientsService.createClient(payload);
        onSuccess();
        if (created.access) {
          setCreatedAccess(created.access);
          toast.success("Cliente e login criados!");
        } else {
          resetForm();
          setOpen(false);
          toast.success("Cliente cadastrado!");
        }
      }
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError("Não foi possível salvar o cliente.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyAccessCredentials() {
    if (!createdAccess) return;
    const loginUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${createdAccess.loginUrl}`
        : createdAccess.loginUrl;
    await navigator.clipboard.writeText(
      `Portal: ${loginUrl}\nE-mail: ${createdAccess.email}\nSenha: ${createdAccess.password}`,
    );
    setCopiedAccess(true);
    setTimeout(() => setCopiedAccess(false), 2000);
  }

  function finishAfterAccessCreated() {
    resetForm();
    setOpen(false);
  }

  const dialogContent = (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      {createdAccess ? (
        <>
          <DialogHeader>
            <DialogTitle className="text-[var(--atria-primary)]">
              Cliente criado com login
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-[var(--atria-primary)]/70">
              Compartilhe as credenciais abaixo. O cliente entra em{" "}
              <strong>/login</strong> com a senha definida por você.
            </p>
            <div className="rounded-xl border border-[var(--atria-accent)]/50 bg-[var(--atria-accent)]/10 p-4 text-sm">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--atria-primary)]/50">
                    E-mail
                  </p>
                  <p className="font-mono text-[var(--atria-primary)]">
                    {createdAccess.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--atria-primary)]/50">
                    Senha
                  </p>
                  <p className="font-mono text-[var(--atria-primary)]">
                    {createdAccess.password}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={copyAccessCredentials}>
              <Copy className="size-4" />
              {copiedAccess ? "Copiado!" : "Copiar credenciais"}
            </Button>
            <Button
              type="button"
              className="bg-[var(--atria-primary)] text-white"
              onClick={finishAfterAccessCreated}
            >
              Concluir
            </Button>
          </DialogFooter>
        </>
      ) : (
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle className="text-[var(--atria-primary)]">
            {isEditing ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
        </DialogHeader>

        <FieldGroup className="py-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <Field>
            <FieldLabel htmlFor="client-company">Empresa *</FieldLabel>
            <Input
              id="client-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="client-document">CPF / CNPJ</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="client-document"
                value={document}
                onChange={(e) => setDocument(formatDocument(e.target.value))}
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
              />
              <Button
                type="button"
                variant="outline"
                disabled={lookupLoading}
                onClick={() => void handleDocumentLookup()}
              >
                {lookupLoading ? <Loader2 className="size-4 animate-spin" /> : "Buscar"}
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-[var(--atria-primary)]/45">
              CNPJ preenche empresa e endereço. CPF: use o CEP abaixo.
            </p>
          </Field>

          {isEditing ? (
            <Field>
              <FieldLabel htmlFor="client-contact">Contato</FieldLabel>
              <Input
                id="client-contact"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </Field>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="client-email">E-mail comercial</FieldLabel>
              <Input
                id="client-email"
                type="email"
                value={email}
                onChange={(e) => {
                  const next = e.target.value;
                  setEmail(next);
                  if (!isEditing && canCreateLogin && !accessLoginEmail.trim()) {
                    setAccessLoginEmail(next);
                  }
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="client-phone">Telefone</FieldLabel>
              <Input
                id="client-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
          </div>

          {!isEditing && canCreateLogin ? (
            <div className="space-y-3 rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.03] p-4">
              <div>
                <p className="text-sm font-semibold text-[var(--atria-primary)]">
                  Login na plataforma
                </p>
                <p className="mt-1 text-xs text-[var(--atria-primary)]/55">
                  Cria o login para acessar o portal do cliente e aprovar os
                  conteúdos. A senha abaixo já fica ativa no primeiro acesso.
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="client-access-name">
                  Nome do representante
                </FieldLabel>
                <Input
                  id="client-access-name"
                  value={accessDisplayName}
                  onChange={(e) => setAccessDisplayName(e.target.value)}
                  placeholder={companyName || "Nome da empresa"}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="client-access-email">
                  E-mail de login *
                </FieldLabel>
                <Input
                  id="client-access-email"
                  type="email"
                  value={accessLoginEmail}
                  onChange={(e) => setAccessLoginEmail(e.target.value)}
                  required
                  placeholder="contato@empresa.com"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="client-access-password">Senha *</FieldLabel>
                <Input
                  id="client-access-password"
                  type="password"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                />
              </Field>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="client-instagram">Instagram</FieldLabel>
              <Input
                id="client-instagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@empresa"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="client-website">Website</FieldLabel>
              <Input
                id="client-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="client-ig-user">Instagram User ID</FieldLabel>
              <Input
                id="client-ig-user"
                value={instagramUserId}
                onChange={(e) => setInstagramUserId(e.target.value)}
                placeholder="17841..."
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="client-meta-token">Token Meta</FieldLabel>
              <Input
                id="client-meta-token"
                type="password"
                value={metaAccessToken}
                onChange={(e) => setMetaAccessToken(e.target.value)}
                placeholder={
                  client?.hasMetaAccessToken ? "••••••••" : "Access token"
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field className="col-span-2">
              <FieldLabel htmlFor="client-street">Rua</FieldLabel>
              <Input
                id="client-street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="client-number">Nº</FieldLabel>
              <Input
                id="client-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Manual"
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="client-neighborhood">Bairro</FieldLabel>
            <Input
              id="client-neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field>
              <FieldLabel htmlFor="client-city">Cidade</FieldLabel>
              <Input
                id="client-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="client-state">Estado</FieldLabel>
              <Input
                id="client-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="client-zip">CEP</FieldLabel>
              <Input
                id="client-zip"
                value={zipCode}
                onChange={(e) => setZipCode(formatZipCode(e.target.value))}
                onBlur={() => void handleZipLookup()}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="client-group">Grupo</FieldLabel>
            <select
              id="client-group"
              value={clientGroupId}
              onChange={(e) => setClientGroupId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Sem grupo</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="client-avatar">URL do Avatar</FieldLabel>
            <Input
              id="client-avatar"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="client-notes">Observações</FieldLabel>
            <textarea
              id="client-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[var(--atria-primary)] text-white"
          >
            {loading ? "Salvando..." : isEditing ? "Atualizar" : "Criar Cliente"}
          </Button>
        </DialogFooter>
      </form>
      )}
    </DialogContent>
  );

  if (!trigger) {
    return (
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) resetForm();
        }}
      >
        {dialogContent}
      </Dialog>
    );
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
        <Plus className="size-4" />
        Novo Cliente
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
