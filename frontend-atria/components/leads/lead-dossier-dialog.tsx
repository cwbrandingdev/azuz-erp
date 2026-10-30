"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cnpjMatchMethodLabel,
  readFacade,
  readInstagramQualification,
  readRegistryLookup,
  readRegistrySnapshot,
  type InstagramQualificationSnapshot,
} from "@/lib/lead-qualification-utils";
import { InstagramProfileCard } from "@/components/leads/instagram-profile-card";
import type { Lead } from "@/services/types";

function instagramProfileIsReady(
  instagram: InstagramQualificationSnapshot | null,
) {
  if (!instagram || (instagram.statsVersion ?? 0) < 2) return false;
  const posts = instagram.recentPosts ?? [];
  const hasPostDate =
    Boolean(instagram.lastPostAt) ||
    posts.some((post) => Boolean(post.timestamp));
  if (posts.length > 0 && !hasPostDate && instagram.statsVersion !== 3) {
    return false;
  }
  return true;
}

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return value;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

function formatCapital(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-64 flex-col gap-3 rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02] p-3">
      <h3 className="text-sm font-medium text-[var(--atria-primary)]">{title}</h3>
      {children}
    </section>
  );
}

function PanelStatus({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-[var(--atria-primary)]/55">{children}</p>
  );
}

function LoadingStatus({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center gap-2 text-sm text-[var(--atria-primary)]/60">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

function Photo({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <PanelStatus>Foto da fachada não encontrada.</PanelStatus>;
  }
  return (
    <img
      src={src}
      alt={alt}
      className="aspect-[4/3] w-full rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  );
}

type LeadDossierDialogProps = {
  lead: Lead | null;
  open: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LeadDossierDialog({
  lead,
  open,
  loading,
  onOpenChange,
}: LeadDossierDialogProps) {
  if (!lead) return null;

  const facade = readFacade(lead.rawData);
  const registry = readRegistrySnapshot(lead.rawData);
  const lookup = readRegistryLookup(lead.rawData);
  const instagram = readInstagramQualification(lead.rawData);
  const matchLabel =
    cnpjMatchMethodLabel(registry?.matchMethod) ??
    (registry?.cnpj ? "CNPJ já conhecido" : null);

  const facadeLoading = Boolean(loading) && !facade;
  const capitalLoading = Boolean(loading) && !registry && !lookup;
  const instagramReady = instagramProfileIsReady(instagram);
  const instagramLoading = Boolean(loading) && !instagramReady;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden sm:max-w-6xl">
        <DialogHeader className="border-b border-[var(--atria-primary)]/10 pb-4">
          <DialogTitle className="text-[var(--atria-primary)]">
            {lead.name}
          </DialogTitle>
          <p className="text-sm text-[var(--atria-primary)]/55">
            Fachada, capital social e Instagram
          </p>
        </DialogHeader>

        <div className="grid flex-1 gap-3 overflow-y-auto py-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="grid content-start gap-3">
          <Panel title="Fachada">
            {facadeLoading ? (
              <LoadingStatus label="Buscando foto da fachada..." />
            ) : facade?.imageUrl ? (
              <Photo src={facade.imageUrl} alt={`Fachada de ${lead.name}`} />
            ) : (
              <PanelStatus>Foto da fachada não encontrada.</PanelStatus>
            )}
          </Panel>

          <Panel title="Capital social">
            {capitalLoading ? (
              <LoadingStatus label="Consultando a Receita..." />
            ) : registry ? (
              <div className="space-y-2">
                <p className="text-2xl font-semibold text-[var(--atria-primary)]">
                  {registry.capitalSocial != null
                    ? formatCapital(registry.capitalSocial)
                    : "Não informado"}
                </p>
                {registry.companySize &&
                registry.companySize !== "Não informado" ? (
                  <p className="text-sm text-[var(--atria-primary)]/75">
                    <span className="font-medium">Porte:</span>{" "}
                    {registry.companySize}
                  </p>
                ) : null}
                {registry.legalName ? (
                  <p className="text-sm text-[var(--atria-primary)]/75">
                    <span className="font-medium">Razão social:</span>{" "}
                    {registry.legalName}
                  </p>
                ) : null}
                {registry.cnpj ? (
                  <p className="text-sm text-[var(--atria-primary)]/75">
                    <span className="font-medium">CNPJ:</span>{" "}
                    {formatCnpj(registry.cnpj)}
                  </p>
                ) : null}
                {matchLabel ? (
                  <p className="text-xs text-[var(--atria-primary)]/55">
                    {matchLabel}
                  </p>
                ) : null}
              </div>
            ) : lookup?.status === "unavailable" ? (
              <PanelStatus>
                Não foi possível consultar o capital social agora.
              </PanelStatus>
            ) : (
              <PanelStatus>Capital social não encontrado.</PanelStatus>
            )}
          </Panel>
          </div>

          <div className="min-h-64">
            {instagramLoading ? (
              <Panel title="Instagram">
                <LoadingStatus label="Buscando o perfil..." />
              </Panel>
            ) : instagram && (!loading || instagramReady) ? (
              <InstagramProfileCard profile={instagram} />
            ) : lead.instagram?.trim() ? (
              <Panel title="Instagram">
                <PanelStatus>Perfil do Instagram não encontrado.</PanelStatus>
              </Panel>
            ) : (
              <Panel title="Instagram">
                <PanelStatus>Este lead não tem Instagram.</PanelStatus>
              </Panel>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
