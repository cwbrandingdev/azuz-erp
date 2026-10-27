"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { ClientName } from "@/components/ui/client-name";
import { PORTAL_REQUEST_CONTENT_TYPE_LABELS } from "@/lib/portal-request-content-types";
import { cn } from "@/lib/utils";
import type { ClientRequest } from "@/services/types";

interface PendingRequestsHighlightProps {
  requests: ClientRequest[];
}

function formatArrival(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function PendingRequestsHighlight({
  requests,
}: PendingRequestsHighlightProps) {
  const items = requests.slice(0, 6);

  return (
    <section
      className={cn(
        "rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-50 via-white to-[var(--atria-accent)]/15 p-5 shadow-md shadow-amber-500/10",
        "dark:from-amber-500/10 dark:via-card dark:to-card",
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
            <Lightbulb className="size-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--atria-primary)]">
                Solicitações Pendentes
              </h2>
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-extrabold text-white">
                {requests.length}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-[var(--atria-primary)]/55">
              Ideias recém-chegadas do portal do cliente
            </p>
          </div>
        </div>
        <Link
          href="/clients"
          prefetch={false}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--atria-primary)]/70 transition-colors hover:text-[var(--atria-primary)]"
        >
          Ver clientes
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl bg-white/70 px-4 py-6 text-center text-sm text-[var(--atria-primary)]/50 dark:bg-background/40">
          Nenhuma solicitação pendente no momento.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {items.map((request) => (
            <li key={request.id}>
              <Link
                href={`/clients/${request.clientId}`}
                className="block rounded-xl border border-amber-400/20 bg-white/80 px-3 py-3 transition hover:border-amber-500/40 hover:shadow-sm dark:bg-background/50"
              >
                {request.client?.companyName ? (
                  <ClientName className="mb-1 block text-[11px] text-[var(--atria-primary)]">
                    {request.client.companyName}
                  </ClientName>
                ) : null}
                <p className="truncate text-sm font-medium text-[var(--atria-primary)]">
                  {request.title}
                </p>
                <p className="mt-1 text-[11px] text-[var(--atria-primary)]/45">
                  {request.contentType
                    ? (PORTAL_REQUEST_CONTENT_TYPE_LABELS[
                        request.contentType
                      ] ?? request.contentType)
                    : "Solicitação"}
                  {request.createdAt
                    ? ` · ${formatArrival(request.createdAt)}`
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
