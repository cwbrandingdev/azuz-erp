"use client";

import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useWhatsappVoice } from "@/hooks/use-whatsapp-voice";

type Voice = ReturnType<typeof useWhatsappVoice>;

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    const rest = digits.slice(2);
    return `+55 ${rest.slice(0, 2)} ${rest.slice(2)}`;
  }
  return phone;
}

function statusLabel(status: string, direction: string) {
  if (status === "CONNECTING") return "Conectando...";
  if (status === "RINGING") {
    return direction === "INBOUND" ? "Ligação recebida" : "Chamando...";
  }
  if (status === "IN_PROGRESS") return "Em ligação";
  return status;
}

export function WhatsappCallDock({
  voice,
  nameFor,
}: {
  voice: Voice;
  nameFor: (phone: string) => string;
}) {
  const { incoming, active, muted, busy, audioRef } = voice;
  const call = incoming ?? active;

  return (
    <>
      <audio ref={audioRef} autoPlay />
      {call ? (
      <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-black/10 bg-slate-900 px-3 py-2 text-white shadow-lg">
          <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500">
            <Phone className="size-4" />
          </span>
          <div className="min-w-0 pr-2">
            <p className="truncate text-sm font-medium">
              {nameFor(call.phone) || formatPhone(call.phone)}
            </p>
            <p className="text-[11px] text-white/70">
              {statusLabel(call.status, call.direction)}
            </p>
          </div>
          {incoming ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                className="rounded-full bg-emerald-500 text-white hover:bg-emerald-400"
                onClick={() => void voice.acceptIncoming()}
              >
                Atender
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="rounded-full"
                onClick={() => void voice.rejectIncoming()}
              >
                Recusar
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                className="rounded-full"
                onClick={voice.toggleMute}
                aria-label={muted ? "Ativar microfone" : "Mutar microfone"}
              >
                {muted ? (
                  <MicOff className="size-4" />
                ) : (
                  <Mic className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="destructive"
                className="rounded-full"
                onClick={() => void voice.hangup()}
                aria-label="Encerrar ligação"
              >
                <PhoneOff className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      ) : null}
    </>
  );
}
