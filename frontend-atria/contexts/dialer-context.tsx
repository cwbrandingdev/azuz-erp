"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Call, Device } from "@twilio/voice-sdk";
import { isDialablePhone } from "@/lib/lead-phone";
import { detectNativeDialerPlatform } from "@/lib/native-dialer";
import { toast } from "@/lib/toast";
import { ApiError, voiceService } from "@/services";
import type { DialerLead, DialerMode, LeadCallOutcome } from "@/services/types";

export type DialerStatus =
  | "idle"
  | "connecting"
  | "ringing"
  | "in-call"
  | "wrap-up";

interface DialerContextValue {
  configured: boolean | null;
  mode: DialerMode;
  status: DialerStatus;
  queue: DialerLead[];
  currentIndex: number;
  currentLead: DialerLead | null;
  remaining: number;
  muted: boolean;
  error: string | null;
  enqueue: (leads: DialerLead[]) => void;
  callLead: (lead: DialerLead) => void;
  hangup: () => void;
  toggleMute: () => void;
  skip: () => void;
  setOutcome: (outcome: LeadCallOutcome, notes?: string) => Promise<void>;
  closeQueue: () => void;
}

const DialerContext = createContext<DialerContextValue | null>(null);

function toDialerLeads(leads: DialerLead[]): DialerLead[] {
  const seen = new Set<string>();
  const result: DialerLead[] = [];
  for (const lead of leads) {
    if (seen.has(lead.id) || !isDialablePhone(lead.phone)) continue;
    seen.add(lead.id);
    result.push({ id: lead.id, name: lead.name, phone: lead.phone });
  }
  return result;
}

export function DialerProvider({ children }: { children: ReactNode }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [mode, setMode] = useState<DialerMode>("native");
  const [status, setStatus] = useState<DialerStatus>("idle");
  const [queue, setQueue] = useState<DialerLead[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const callLogIdRef = useRef<string | null>(null);
  const startingRef = useRef(false);
  const skipWrapUpRef = useRef(false);
  const statusRef = useRef<DialerStatus>("idle");
  const queueRef = useRef<DialerLead[]>([]);
  const indexRef = useRef(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    let active = true;
    voiceService
      .getVoiceConfig()
      .then((data) => {
        if (active) {
          setConfigured(data.configured);
          setMode(data.mode === "twilio" ? "twilio" : "native");
        }
      })
      .catch(() => {
        if (active) setConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      callRef.current?.disconnect();
      void deviceRef.current?.destroy();
    };
  }, []);

  const currentLead = queue[currentIndex] ?? null;
  const remaining = Math.max(queue.length - currentIndex - 1, 0);

  const ensureDevice = useCallback(async () => {
    const { Device } = await import("@twilio/voice-sdk");
    const token = await voiceService.createVoiceToken();
    if (deviceRef.current) {
      deviceRef.current.updateToken(token.token);
      return deviceRef.current;
    }
    const device = new Device(token.token, {
      closeProtection: true,
    });
    device.on("error", (deviceError) => {
      setError(deviceError.message);
      toast.error(deviceError.message || "Erro no discador.");
    });
    deviceRef.current = device;
    return device;
  }, []);

  const finishCurrentCall = useCallback(() => {
    callRef.current = null;
    setMuted(false);
    if (skipWrapUpRef.current) {
      skipWrapUpRef.current = false;
      return;
    }
    if (
      statusRef.current === "connecting" ||
      statusRef.current === "ringing" ||
      statusRef.current === "in-call"
    ) {
      setStatus("wrap-up");
    }
  }, []);

  const placeCall = useCallback(
    async (lead: DialerLead) => {
      if (startingRef.current) return;
      startingRef.current = true;
      setError(null);
      setStatus("connecting");
      try {
        if (mode === "native") {
          const log = await voiceService.startLeadCall(lead.id);
          callLogIdRef.current = log.id;
          setStatus("in-call");
          if (detectNativeDialerPlatform() === "windows") {
            toast.info(
              "Se o Windows não abriu o telefone, clique em Abrir Phone Link no painel.",
            );
          }
          return;
        }
        const log = await voiceService.startLeadCall(lead.id);
        callLogIdRef.current = log.id;
        const device = await ensureDevice();
        const call = await device.connect({
          params: {
            To: log.phone,
            leadCallId: log.id,
            leadId: lead.id,
          },
        });
        callRef.current = call;
        call.on("ringing", () => setStatus("ringing"));
        call.on("accept", () => setStatus("in-call"));
        call.on("disconnect", () => finishCurrentCall());
        call.on("cancel", () => finishCurrentCall());
        call.on("reject", () => finishCurrentCall());
      } catch (caught) {
        setStatus("wrap-up");
        const message =
          caught instanceof ApiError
            ? caught.message
            : "Não foi possível iniciar a ligação.";
        setError(message);
        toast.error(message);
      } finally {
        startingRef.current = false;
      }
    },
    [ensureDevice, finishCurrentCall, mode],
  );

  const startAt = useCallback(
    (nextQueue: DialerLead[], index: number) => {
      const lead = nextQueue[index];
      if (!lead) {
        setStatus("idle");
        return;
      }
      setQueue(nextQueue);
      setCurrentIndex(index);
      void placeCall(lead);
    },
    [placeCall],
  );

  const enqueue = useCallback(
    (leads: DialerLead[]) => {
      if (configured === false) {
        toast.error(
          "Discador Twilio ainda não está configurado. Preencha as chaves TWILIO_* no .env do backend.",
        );
        return;
      }
      const incoming = toDialerLeads(leads);
      if (incoming.length === 0) {
        toast.error("Nenhum lead selecionado tem telefone válido.");
        return;
      }

      const busy = statusRef.current !== "idle" && queueRef.current.length > 0;
      if (busy) {
        const existing = new Set(queueRef.current.map((item) => item.id));
        const appended = incoming.filter((item) => !existing.has(item.id));
        if (appended.length === 0) {
          toast.info("Esses leads já estão na fila.");
          return;
        }
        setQueue((current) => [...current, ...appended]);
        toast.success(
          `${appended.length} lead${appended.length === 1 ? "" : "s"} adicionados à fila.`,
        );
        return;
      }

      startAt(incoming, 0);
    },
    [configured, startAt],
  );

  const callLead = useCallback(
    (lead: DialerLead) => {
      enqueue([lead]);
    },
    [enqueue],
  );

  const hangup = useCallback(() => {
    if (mode === "native") {
      finishCurrentCall();
      return;
    }
    callRef.current?.disconnect();
  }, [finishCurrentCall, mode]);

  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    const next = !muted;
    call.mute(next);
    setMuted(next);
  }, [muted]);

  const advance = useCallback(
    (fromIndex: number) => {
      const nextIndex = fromIndex + 1;
      const nextQueue = queueRef.current;
      callLogIdRef.current = null;
      if (nextIndex >= nextQueue.length) {
        setStatus("idle");
        setCurrentIndex(nextQueue.length);
        toast.success("Fila de ligações concluída.");
        return;
      }
      startAt(nextQueue, nextIndex);
    },
    [startAt],
  );

  const skip = useCallback(() => {
    const callId = callLogIdRef.current;
    skipWrapUpRef.current = true;
    callRef.current?.disconnect();
    if (callId) {
      void voiceService.updateLeadCall(callId, { outcome: "SKIPPED" });
    }
    advance(indexRef.current);
  }, [advance]);

  const setOutcome = useCallback(
    async (outcome: LeadCallOutcome, notes?: string) => {
      const callId = callLogIdRef.current;
      if (callId) {
        try {
          await voiceService.updateLeadCall(callId, { outcome, notes });
        } catch {
          toast.error("Não foi possível salvar o resultado da ligação.");
        }
      }
      advance(indexRef.current);
    },
    [advance],
  );

  const closeQueue = useCallback(() => {
    skipWrapUpRef.current = true;
    callRef.current?.disconnect();
    callLogIdRef.current = null;
    setQueue([]);
    setCurrentIndex(0);
    setStatus("idle");
    setError(null);
    setMuted(false);
  }, []);

  const value = useMemo<DialerContextValue>(
    () => ({
      configured,
      mode,
      status,
      queue,
      currentIndex,
      currentLead,
      remaining,
      muted,
      error,
      enqueue,
      callLead,
      hangup,
      toggleMute,
      skip,
      setOutcome,
      closeQueue,
    }),
    [
      configured,
      mode,
      status,
      queue,
      currentIndex,
      currentLead,
      remaining,
      muted,
      error,
      enqueue,
      callLead,
      hangup,
      toggleMute,
      skip,
      setOutcome,
      closeQueue,
    ],
  );

  return (
    <DialerContext.Provider value={value}>{children}</DialerContext.Provider>
  );
}

export function useDialer() {
  const context = useContext(DialerContext);
  if (!context) {
    throw new Error("useDialer must be used within DialerProvider");
  }
  return context;
}

export function useOptionalDialer() {
  return useContext(DialerContext);
}
