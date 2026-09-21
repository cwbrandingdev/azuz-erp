"use client";

import { useEffect, useState } from "react";
import {
  CircleHelp,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  SkipForward,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DialerNativeSetupDialog } from "@/components/leads/dialer-native-setup-dialog";
import { useDialer } from "@/contexts/dialer-context";
import { toTelHref, toWhatsAppUrl } from "@/lib/lead-phone";
import {
  detectNativeDialerPlatform,
  hasSeenNativeDialerSetup,
} from "@/lib/native-dialer";
import type { LeadCallOutcome } from "@/services/types";

const STATUS_LABEL: Record<string, string> = {
  idle: "Fila pausada",
  connecting: "Discando...",
  ringing: "Chamando...",
  "in-call": "Em ligação",
  "wrap-up": "Como foi a ligação?",
};

const OUTCOMES: Array<{
  value: LeadCallOutcome;
  label: string;
  whatsapp?: boolean;
}> = [
  { value: "NO_ANSWER", label: "Não atendeu" },
  { value: "NO_INTEREST", label: "Sem interesse" },
  { value: "INTERESTED", label: "Interessado" },
  { value: "WHATSAPP", label: "Mandar WhatsApp", whatsapp: true },
  { value: "MEETING", label: "Reunião" },
  { value: "SKIPPED", label: "Pular" },
];

const NATIVE_HINT: Record<string, string> = {
  windows:
    "O Windows abre o Phone Link e liga com o Android. Se perguntar, escolha Phone Link.",
  linux:
    "O número abre no discador do celular. Se o Ubuntu perguntar, escolha GSConnect.",
  android: "O discador deste celular deve abrir.",
  macos: "O número abre no app de telefone padrão do Mac.",
  other: "O número abre no discador do celular.",
};

export function DialerPanel() {
  const {
    mode,
    status,
    queue,
    currentLead,
    currentIndex,
    remaining,
    muted,
    error,
    hangup,
    toggleMute,
    skip,
    setOutcome,
    closeQueue,
  } = useDialer();
  const [setupOpen, setSetupOpen] = useState(false);
  const platform = detectNativeDialerPlatform();

  useEffect(() => {
    if (mode !== "native") return;
    if (queue.length === 0) return;
    if (hasSeenNativeDialerSetup()) return;
    setSetupOpen(true);
  }, [mode, queue.length]);

  if (queue.length === 0 && status === "idle") {
    return null;
  }

  const live = status === "connecting" || status === "ringing" || status === "in-call";
  const lead = currentLead ?? queue[queue.length - 1];
  const done = status === "idle" && currentIndex >= queue.length && queue.length > 0;
  const telHref = toTelHref(lead?.phone);

  function handleOutcome(outcome: LeadCallOutcome, openWhatsApp?: boolean) {
    if (openWhatsApp && lead?.phone) {
      window.open(toWhatsAppUrl(lead.phone), "_blank", "noopener,noreferrer");
    }
    void setOutcome(outcome);
  }

  return (
    <>
    <Card className="fixed right-4 bottom-4 z-50 w-[min(100%-2rem,22rem)] border-[var(--atria-primary)]/15 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--atria-primary)]/45">
            Discador{mode === "native" ? " · celular" : ""}
          </p>
          <p className="truncate text-sm font-semibold text-[var(--atria-primary)]">
            {done ? "Fila concluída" : (lead?.name ?? "Ligação")}
          </p>
          <p className="text-xs text-[var(--atria-primary)]/55">
            {done
              ? `${queue.length} lead${queue.length === 1 ? "" : "s"} discados`
              : `${STATUS_LABEL[status]} · ${currentIndex + 1}/${queue.length} · ${remaining} na fila`}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {mode === "native" && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setSetupOpen(true)}
              title="Como ligar pelo celular"
            >
              <CircleHelp className="size-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={closeQueue}
            title="Fechar fila"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {lead && !done && (
        <p className="mb-3 truncate text-sm text-[var(--atria-primary)]/70">
          {lead.phone}
        </p>
      )}

      {error && (
        <p className="mb-3 text-xs text-red-600">{error}</p>
      )}

      {live && (
        <div className="mb-3 flex flex-col gap-2">
          {mode === "native" && (
            <p className="text-xs text-[var(--atria-primary)]/55">
              {NATIVE_HINT[platform] ?? NATIVE_HINT.other} Se não abrir, use o
              botão abaixo.
            </p>
          )}
          <div className="flex gap-2">
            {mode === "native" && telHref && (
              <Button
                type="button"
                className="flex-1"
                render={<a href={telHref} />}
              >
                <Phone className="size-4" />
                {platform === "windows" ? "Abrir Phone Link" : "Abrir no celular"}
              </Button>
            )}
            {mode === "twilio" && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={toggleMute}
              >
                {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                {muted ? "Ativar mic" : "Mudo"}
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={hangup}
            >
              <PhoneOff className="size-4" />
              {mode === "native" ? "Já liguei" : "Desligar"}
            </Button>
          </div>
        </div>
      )}

      {status === "wrap-up" && lead && (
        <div className="grid grid-cols-2 gap-2">
          {OUTCOMES.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto whitespace-normal py-2 text-xs"
              onClick={() => handleOutcome(item.value, item.whatsapp)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}

      {(status === "connecting" ||
        status === "ringing" ||
        (mode === "native" && status === "in-call")) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={skip}
        >
          <SkipForward className="size-3.5" />
          Pular para o próximo
        </Button>
      )}

      {done && (
        <p className="flex items-center gap-2 text-xs text-[var(--atria-primary)]/55">
          <Phone className="size-3.5" />
          Feche o painel ou selecione novos leads para discar.
        </p>
      )}

      {queue.length > 1 && !done && (
        <ol className="mt-3 max-h-28 space-y-1 overflow-y-auto text-xs text-[var(--atria-primary)]/50">
          {queue.slice(currentIndex, currentIndex + 6).map((item, offset) => (
            <li
              key={item.id}
              className={offset === 0 ? "font-medium text-[var(--atria-primary)]" : ""}
            >
              {offset === 0 ? "Agora · " : `${currentIndex + offset + 1}. `}
              {item.name}
            </li>
          ))}
          {remaining > 5 && (
            <li>e mais {remaining - 5} na fila</li>
          )}
        </ol>
      )}
    </Card>
    {mode === "native" && (
      <DialerNativeSetupDialog open={setupOpen} onOpenChange={setSetupOpen} />
    )}
    </>
  );
}
