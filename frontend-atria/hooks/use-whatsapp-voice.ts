"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company-id";
import { whatsappKeys } from "@/lib/query-keys";
import { toast } from "@/lib/toast";
import {
  applyRemoteAnswer,
  closeCall,
  createAnswerFromOffer,
  createOutgoingOffer,
  setMuted,
} from "@/lib/whatsapp-webrtc";
import { ApiError } from "@/services/api";
import * as whatsappService from "@/services/whatsapp.service";
import type { WhatsAppCall } from "@/services/whatsapp.service";

const LIVE: WhatsAppCall["status"][] = [
  "CONNECTING",
  "RINGING",
  "IN_PROGRESS",
];

function apiCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || !error.data || typeof error.data !== "object") {
    return undefined;
  }
  const code = (error.data as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export function useWhatsappVoice() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const appliedAnswerRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [busy, setBusy] = useState(false);

  const liveQuery = useQuery({
    queryKey: [...whatsappKeys.root, companyId ?? "", "calls"],
    queryFn: () => whatsappService.listLiveCalls(),
    enabled: Boolean(companyId),
    refetchInterval: 1000,
  });

  const live = liveQuery.data ?? [];
  const incoming =
    live.find(
      (call) =>
        call.direction === "INBOUND" &&
        call.status === "RINGING" &&
        call.id !== sessionId,
    ) ?? null;
  const active =
    live.find((call) => call.id === sessionId) ??
    live.find(
      (call) => call.direction === "OUTBOUND" && LIVE.includes(call.status),
    ) ??
    null;

  const teardown = useCallback(() => {
    closeCall(pcRef.current, streamRef.current);
    pcRef.current = null;
    streamRef.current = null;
    appliedAnswerRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    setSessionId(null);
    setMutedState(false);
  }, []);

  const attachRemoteAudio = useCallback((pc: RTCPeerConnection) => {
    pc.ontrack = (event) => {
      const [remote] = event.streams;
      if (audioRef.current && remote) {
        audioRef.current.srcObject = remote;
        void audioRef.current.play().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    if (!active) {
      if (sessionId) teardown();
      return;
    }
    if (
      active.answerSdp &&
      pcRef.current &&
      appliedAnswerRef.current !== active.answerSdp
    ) {
      appliedAnswerRef.current = active.answerSdp;
      void applyRemoteAnswer(pcRef.current, active.answerSdp).catch(() => {
        toast.error("Não foi possível conectar o áudio da ligação.");
      });
    }
    if (!LIVE.includes(active.status)) {
      teardown();
    }
  }, [active, sessionId, teardown]);

  async function startCall(phone: string) {
    if (busy || sessionId || incoming) return;
    setBusy(true);
    try {
      const permission = await whatsappService.getCallPermissions(phone);
      if (!permission.canStartCall) {
        await whatsappService.requestCallPermission(phone);
        toast.info(
          "Pedido de permissão enviado. O contato precisa aceitar no WhatsApp para você ligar.",
        );
        await queryClient.invalidateQueries({ queryKey: whatsappKeys.root });
        return;
      }

      const session = await createOutgoingOffer();
      pcRef.current = session.pc;
      streamRef.current = session.stream;
      attachRemoteAudio(session.pc);
      const created = await whatsappService.initiateCall({
        to: phone,
        sdp: session.sdp,
      });
      setSessionId(created.id);
    } catch (error) {
      teardown();
      if (apiCode(error) === "CALL_PERMISSION_REQUIRED") {
        try {
          await whatsappService.requestCallPermission(phone);
          toast.info(
            "Pedido de permissão enviado. O contato precisa aceitar no WhatsApp para você ligar.",
          );
        } catch {
          toast.error("Este contato ainda não autorizou ligações.");
        }
        return;
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a ligação.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function acceptIncoming() {
    if (!incoming?.offerSdp || busy) return;
    setBusy(true);
    try {
      const session = await createAnswerFromOffer(incoming.offerSdp);
      pcRef.current = session.pc;
      streamRef.current = session.stream;
      attachRemoteAudio(session.pc);
      await whatsappService.answerCall(incoming.id, session.sdp);
      setSessionId(incoming.id);
    } catch (error) {
      teardown();
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível atender a ligação.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function rejectIncoming() {
    if (!incoming) return;
    try {
      await whatsappService.rejectCall(incoming.id);
    } catch {
      toast.error("Não foi possível recusar a ligação.");
    }
  }

  async function hangup() {
    const id = active?.id ?? sessionId;
    teardown();
    if (!id) return;
    try {
      await whatsappService.hangupCall(id);
    } catch {
      /* webhook may already have closed it */
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(streamRef.current, next);
    setMutedState(next);
  }

  return {
    audioRef,
    incoming,
    active,
    muted,
    busy,
    startCall,
    acceptIncoming,
    rejectIncoming,
    hangup,
    toggleMute,
  };
}
