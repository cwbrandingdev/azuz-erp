"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEventDateTime } from "@/lib/calendar-utils";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ApiError, googleCalendarService } from "@/services";
import type { GoogleCalendarStatus } from "@/services/google-calendar.service";

const STATUS_VIEW: Record<
  GoogleCalendarStatus["status"],
  { label: string; className: string }
> = {
  connected: {
    label: "Conectado",
    className: "bg-green-500/15 text-green-700 dark:text-green-400",
  },
  revoked: {
    label: "Desconectado",
    className: "bg-red-500/15 text-red-700 dark:text-red-400",
  },
  unavailable: {
    label: "Google não respondeu",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  not_configured: {
    label: "Não configurado",
    className: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  },
};

function describeSource(data: GoogleCalendarStatus) {
  if (data.source === "server") {
    return "Usando a autorização configurada no servidor.";
  }
  if (data.source === "none") return "Nenhuma conta foi conectada ainda.";

  const account = data.accountEmail ?? "conta não identificada";
  const when = data.connectedAt
    ? `, desde ${formatEventDateTime(data.connectedAt)}`
    : "";
  return `Conta conectada: ${account}${when}.`;
}

// O Google devolve o navegador para esta tela com ?google=connected ou ?google=error.
function showReturnMessage() {
  const url = new URL(window.location.href);
  const result = url.searchParams.get("google");
  if (!result) return;

  if (result === "connected") {
    toast.success("Google Agenda conectado.");
  } else {
    toast.error("Não foi possível conectar o Google Agenda.", {
      description:
        "Tente de novo e marque todas as permissões na tela do Google.",
    });
  }

  url.searchParams.delete("google");
  window.history.replaceState(null, "", url);
}

export function GoogleCalendarCard() {
  const [data, setData] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let active = true;
    showReturnMessage();

    googleCalendarService
      .getGoogleCalendarStatus()
      .then((status) => {
        if (active) setData(status);
      })
      .catch((error) => {
        // 403: usuário de outra empresa não gerencia essa conexão.
        if (active && error instanceof ApiError && error.status === 403) {
          setHidden(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleConnect() {
    setRedirecting(true);
    try {
      const { url } = await googleCalendarService.getGoogleAuthorizationUrl();
      window.location.assign(url);
    } catch {
      // apiRequest já mostra o aviso de erro.
      setRedirecting(false);
    }
  }

  if (hidden) return null;

  const view = data ? STATUS_VIEW[data.status] : null;

  return (
    <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--atria-primary)]/8 text-[var(--atria-primary)]">
            <CalendarCheck className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-[var(--atria-primary)]">
                Google Agenda
              </h2>
              {view ? (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    view.className,
                  )}
                >
                  {view.label}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-[var(--atria-primary)]/50">
              {loading
                ? "Verificando a conexão…"
                : data
                  ? describeSource(data)
                  : "Não foi possível verificar a conexão."}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => void handleConnect()}
          disabled={loading || redirecting}
        >
          {redirecting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {data?.source === "system" ? "Reconectar Google" : "Conectar Google"}
        </Button>
      </div>
    </Card>
  );
}
