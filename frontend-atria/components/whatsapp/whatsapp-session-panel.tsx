"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useWhatsappSession } from "@/hooks/use-whatsapp";
import { whatsappKeys } from "@/lib/query-keys";
import { toast } from "@/lib/toast";
import {
  getWhatsAppSessionQr,
  logoutWhatsAppSession,
  restartWhatsAppSession,
} from "@/services/whatsapp.service";

const STATUS_LABEL: Record<string, string> = {
  WORKING: "Conectado",
  SCAN_QR_CODE: "Aguardando leitura do QR",
  STARTING: "Iniciando…",
  STOPPED: "Parado",
  FAILED: "Falhou",
};

export function WhatsappSessionPanel({ active }: { active: boolean }) {
  const queryClient = useQueryClient();
  const session = useWhatsappSession(active);
  const scanning = session.data?.status === "SCAN_QR_CODE";
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!scanning) {
      setQrUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      return;
    }

    let cancelled = false;
    const load = () => {
      getWhatsAppSessionQr()
        .then((url) => {
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          setQrUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return url;
          });
        })
        .catch(() => {
          if (!cancelled) setQrUrl(null);
        });
    };

    load();
    const timer = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [scanning]);

  useEffect(() => {
    return () => {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    };
  }, [qrUrl]);

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: whatsappKeys.root });
  }

  const restart = useMutation({
    mutationFn: restartWhatsAppSession,
    onSuccess: () => {
      toast.success("Sessão do WhatsApp reiniciada.");
      return refresh();
    },
    onError: () => toast.error("Não foi possível reiniciar a sessão."),
  });

  const autoStarted = useRef(false);
  useEffect(() => {
    if (!active || autoStarted.current) return;
    const status = session.data?.status;
    if (status !== "STOPPED" && status !== "FAILED") return;
    autoStarted.current = true;
    restartWhatsAppSession()
      .then(() => queryClient.invalidateQueries({ queryKey: whatsappKeys.root }))
      .catch(() => toast.error("Não foi possível iniciar a sessão."));
  }, [active, queryClient, session.data?.status]);

  const logout = useMutation({
    mutationFn: logoutWhatsAppSession,
    onSuccess: () => {
      toast.success("Número desconectado. Leia o QR para parear de novo.");
      return refresh();
    },
    onError: () => toast.error("Não foi possível sair da sessão."),
  });

  const status = session.data?.status ?? null;
  const label = status ? (STATUS_LABEL[status] ?? status) : "Sem status";

  return (
    <section className="rounded-lg border border-slate-200 dark:border-border p-3">
      <p className="text-xs font-medium text-slate-500 dark:text-muted-foreground">Número do WhatsApp</p>
      {session.isLoading ? (
        <p className="mt-2 text-xs text-slate-400 dark:text-white/40">Consultando a sessão…</p>
      ) : session.isError ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          Não foi possível falar com o WAHA. Confira se o serviço está no ar.
        </p>
      ) : session.data && !session.data.configured ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-muted-foreground">
          Defina WAHA_BASE_URL e WAHA_API_KEY no backend.
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-sm text-slate-800 dark:text-foreground">
            {label}
            {session.data?.phone ? ` · ${session.data.phone}` : ""}
            {session.data?.pushName ? ` · ${session.data.pushName}` : ""}
          </p>
          {scanning ? (
            <div className="flex flex-col items-start gap-2">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="QR Code para parear o WhatsApp"
                  className="size-52 rounded-md border border-slate-200 dark:border-border bg-white"
                />
              ) : (
                <p className="text-xs text-slate-400 dark:text-white/40">Carregando QR…</p>
              )}
              <p className="text-[11px] text-slate-400 dark:text-white/40">
                No celular: WhatsApp, Aparelhos conectados, Conectar aparelho.
              </p>
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={restart.isPending}
              onClick={() => restart.mutate()}
            >
              Reiniciar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={logout.isPending || !session.data?.configured}
              onClick={() => logout.mutate()}
            >
              Sair da sessão
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
