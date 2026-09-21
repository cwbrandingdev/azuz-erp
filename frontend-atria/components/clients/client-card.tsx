"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AtSign,
  Lightbulb,
  MapPin,
  PenLine,
  Phone,
  Pencil,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GroupBadge } from "@/components/ui/group-badge";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { ClientRequestsDrawer } from "@/components/clients/client-requests-drawer";
import { DeactivateClientButton } from "@/components/clients/deactivate-client-button";
import { ClientName } from "@/components/ui/client-name";
import { usePermissions } from "@/hooks/use-permissions";
import type { Client } from "@/services/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface ClientCardProps {
  client: Client;
  onUpdate: () => void;
  hasCrmModuleEnabled?: boolean;
}

export function ClientCard({
  client,
  onUpdate,
  hasCrmModuleEnabled = false,
}: ClientCardProps) {
  const { canManageClientDirectory } = usePermissions();
  const canManageClients = canManageClientDirectory();
  const [editOpen, setEditOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const pendingCount = client.pendingRequestCount ?? 0;
  const activeCount = client.activeRequestCount ?? client.requestCount ?? 0;

  return (
    <>
      <Card className="flex flex-col rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5">
        {client.isActive === false && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-700">
            Cliente desativado
          </div>
        )}
        <div className="mb-4 flex items-start justify-between gap-3">
          <Link
            href={`/clients/${client.id}`}
            className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-90"
          >
            <Avatar className="size-12 border border-[var(--atria-accent)]/40">
              {client.avatarUrl && (
                <AvatarImage src={client.avatarUrl} alt={client.companyName} />
              )}
              <AvatarFallback className="bg-[var(--atria-accent)] font-semibold text-[var(--atria-primary)]">
                {getInitials(client.companyName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <ClientName
                as="h3"
                className="text-[var(--atria-primary)]"
              >
                {client.companyName}
              </ClientName>
              {client.contactName && (
                <p className="text-xs text-[var(--atria-primary)]/50">
                  {client.contactName}
                </p>
              )}
              {client.clientGroup && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <GroupBadge
                    name={client.clientGroup.name}
                    color={client.clientGroup.color}
                  />
                  {(client.hasCrmModuleEnabled ?? hasCrmModuleEnabled) && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                      CRM
                    </span>
                  )}
                </div>
              )}
              {!client.clientGroup &&
                (client.hasCrmModuleEnabled ?? hasCrmModuleEnabled) && (
                  <div className="mt-1.5">
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                      CRM
                    </span>
                  </div>
                )}
            </div>
          </Link>
          {canManageClients && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" />
            </Button>
          )}
        </div>

        <div className="mb-4 flex flex-col gap-2 text-sm text-[var(--atria-primary)]/70">
          {client.instagram && (
            <div className="flex items-center gap-2">
              <AtSign className="size-4 text-[var(--atria-primary)]/40" />
              <span>{client.instagram}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-[var(--atria-primary)]/40" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.address && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--atria-primary)]/40" />
              <span className="line-clamp-2">{client.address}</span>
            </div>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t border-[var(--atria-primary)]/10 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--atria-accent)]/30 px-2.5 py-0.5 text-xs font-medium text-[var(--atria-primary)]">
              {client.postCount} post{client.postCount === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => setRequestsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--atria-primary)]/8 px-2.5 py-0.5 text-xs font-medium text-[var(--atria-primary)] transition hover:bg-[var(--atria-primary)]/12"
            >
              <Lightbulb className="size-3.5" />
              Solicitações / Ideias
              {activeCount > 0 && (
                <span
                  className={
                    pendingCount > 0
                      ? "rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                      : "rounded-full bg-[var(--atria-primary)]/15 px-1.5 py-0.5 text-[10px] font-semibold"
                  }
                >
                  {pendingCount > 0 ? pendingCount : activeCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <DeactivateClientButton
              client={client}
              variant="prominent"
              onUpdated={onUpdate}
            />
            <Link
              href={`/kanban?clientId=${client.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--atria-primary)] px-2.5 text-sm font-medium text-white hover:bg-[var(--atria-primary)]/90"
            >
              <PenLine className="size-4" />
              Criar Conteúdo
            </Link>
          </div>
        </div>
      </Card>

      <ClientRequestsDrawer
        client={client}
        open={requestsOpen}
        onOpenChange={setRequestsOpen}
        onUpdated={onUpdate}
      />

      <ClientFormDialog
        client={client}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onUpdate}
        trigger={false}
      />
    </>
  );
}
