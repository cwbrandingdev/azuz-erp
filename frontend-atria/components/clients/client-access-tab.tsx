"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Link2Off,
  Loader2,
  Package,
} from "lucide-react";
import { EditUserButton } from "@/components/users/edit-user-dialog";
import { ProvisionUserDialog } from "@/components/users/provision-user-dialog";
import { UserAvatar } from "@/components/users/user-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePermissions } from "@/hooks/use-permissions";
import { clientsService } from "@/services";
import type { ClientAccessBundle, ManagedUser, PortalAccessStatus } from "@/services/types";
import { ROLE_LABELS } from "@/lib/permissions";

const PORTAL_ACCESS_LABELS: Record<
  PortalAccessStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  active: {
    label: "Acesso ativo",
    className: "bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  pending: {
    label: "Senha pendente",
    className: "bg-amber-50 text-amber-700",
    icon: Clock3,
  },
  unlinked: {
    label: "Sem empresa",
    className: "bg-slate-100 text-slate-600",
    icon: Link2Off,
  },
  inactive: {
    label: "Inativo",
    className: "bg-red-50 text-red-700",
    icon: AlertCircle,
  },
};

interface ClientAccessTabProps {
  clientId: string;
  companyName: string;
}

export function ClientAccessTab({ clientId, companyName }: ClientAccessTabProps) {
  const { canManageUsers } = usePermissions();
  const canProvision = canManageUsers();
  const [data, setData] = useState<ClientAccessBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await clientsService.getClientAccess(clientId));
    } catch {
      setData(null);
      setError("Não foi possível carregar os acessos deste cliente.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-[var(--atria-primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </Card>
    );
  }

  const platformLoginUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${data?.platformLoginUrl ?? "/login"}`
      : (data?.platformLoginUrl ?? "/login");

  const legacyLoginUrl =
    data?.legacyPortal && typeof window !== "undefined"
      ? `${window.location.origin}${data.legacyPortal.loginUrl}`
      : data?.legacyPortal?.loginUrl;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--atria-primary)]">
            Acessos e representantes
          </h2>
          <p className="mt-1 text-sm text-[var(--atria-primary)]/60">
            Logins vinculados a{" "}
            <span className="font-medium text-[var(--atria-primary)]">
              {companyName}
            </span>
            . Credenciais existentes continuam válidas em{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--atria-primary)] underline-offset-2 hover:underline"
            >
              /login
            </Link>
            {data?.legacyPortal ? (
              <>
                {" "}
                ou no{" "}
                <Link
                  href="/portal/login"
                  className="font-medium text-[var(--atria-primary)] underline-offset-2 hover:underline"
                >
                  portal legado
                </Link>
              </>
            ) : null}
            .
          </p>
        </div>
        {canProvision && (
          <ProvisionUserDialog
            mode="client"
            fixedClientId={clientId}
            fixedClientName={companyName}
            onSuccess={() => void load()}
          />
        )}
      </div>

      {data?.legacyPortal ? (
        <Card className="border-[var(--atria-primary)]/10 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--atria-primary)]/50">
            Portal legado (/portal/login)
          </p>
          <p className="mt-2 text-sm text-[var(--atria-primary)]/75">
            E-mail:{" "}
            <span className="font-mono text-[var(--atria-primary)]">
              {data.legacyPortal.email}
            </span>
            {data.legacyPortal.mustChangePassword ? (
              <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                Senha pendente
              </span>
            ) : null}
          </p>
          {legacyLoginUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              render={<a href={legacyLoginUrl} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink className="size-4" />
              Abrir portal legado
            </Button>
          ) : null}
        </Card>
      ) : null}

      {!data?.users.length ? (
        <Card className="border-dashed border-[var(--atria-primary)]/15 p-8 text-center">
          <p className="text-sm text-[var(--atria-primary)]/60">
            Nenhum representante com login na plataforma principal.
          </p>
          {canProvision ? (
            <p className="mt-2 text-sm text-[var(--atria-primary)]/45">
              Use &quot;Adicionar representante&quot; para criar e-mail e senha
              temporária.
            </p>
          ) : null}
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--atria-primary)]/10 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/3 text-xs uppercase tracking-wide text-[var(--atria-primary)]/55">
                <th className="px-4 py-3 font-medium">Representante</th>
                <th className="px-4 py-3 font-medium">Função</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Entregas</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <ClientAccessRow
                  key={user.id}
                  user={user}
                  platformLoginUrl={platformLoginUrl}
                  onRefresh={() => void load()}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ClientAccessRow({
  user,
  platformLoginUrl,
  onRefresh,
}: {
  user: ManagedUser;
  platformLoginUrl: string;
  onRefresh: () => void;
}) {
  const access = user.portalAccess ?? "inactive";
  const meta = PORTAL_ACCESS_LABELS[access];
  const Icon = meta.icon;

  return (
    <tr className="border-b border-[var(--atria-primary)]/5 hover:bg-[var(--atria-primary)]/2">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={user.name}
            avatarUrl={user.avatarUrl}
            size="sm"
          />
          <div>
            <p className="font-medium text-[var(--atria-primary)]">{user.name}</p>
            <p className="text-xs text-[var(--atria-primary)]/55">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-[var(--atria-primary)]/8 px-2.5 py-0.5 text-xs font-medium text-[var(--atria-primary)]">
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
        >
          <Icon className="size-3.5" />
          {meta.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1 text-[var(--atria-primary)]/70">
          <Package className="size-3.5" />
          {user.activeDeliverableCount ?? 0}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--atria-primary)]/70"
            render={<a href={platformLoginUrl} target="_blank" rel="noreferrer" />}
          >
            /login
          </Button>
          <EditUserButton user={user} onSuccess={onRefresh} />
        </div>
      </td>
    </tr>
  );
}
