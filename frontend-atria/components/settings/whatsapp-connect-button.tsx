"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { ApiError, whatsappService } from "@/services";
import type { WhatsappConfig } from "@/services/types";

declare global {
  interface Window {
    FB?: {
      init: (options: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: { code?: string };
          status?: string;
        }) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const COEXISTENCE_EXTRAS = {
  setup: {},
  featureType: "whatsapp_business_app_onboarding",
  sessionInfoVersion: "3",
};

type SessionPayload = {
  type?: string;
  event?: string;
  data?: {
    waba_id?: string;
    phone_number_id?: string;
    wabaId?: string;
    phoneNumberId?: string;
    error_message?: string;
  };
};

function isMetaMessageOrigin(origin: string) {
  try {
    const host = new URL(origin).hostname;
    return (
      host === "facebook.com" ||
      host.endsWith(".facebook.com") ||
      host === "instagram.com" ||
      host.endsWith(".instagram.com")
    );
  } catch {
    return false;
  }
}

function parseSignupPayload(raw: unknown): SessionPayload | null {
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;

  const payload = value as SessionPayload & { data?: unknown };
  if (typeof payload.data === "string") {
    try {
      payload.data = JSON.parse(payload.data) as SessionPayload["data"];
    } catch {
      payload.data = undefined;
    }
  }
  return payload as SessionPayload;
}

interface WhatsappConnectButtonProps {
  onConnected?: (config: WhatsappConfig) => void;
}

export function WhatsappConnectButton({
  onConnected,
}: WhatsappConnectButtonProps) {
  const [config, setConfig] = useState<WhatsappConfig | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const pending = useRef({
    code: "",
    wabaId: "",
    phoneNumberId: "",
  });
  const completing = useRef(false);

  useEffect(() => {
    whatsappService
      .getWhatsappConfig()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  const completeIfReady = useCallback(async () => {
    const { code, wabaId, phoneNumberId } = pending.current;
    if (!code || !wabaId || !phoneNumberId || completing.current) return;

    completing.current = true;
    setConnecting(true);
    try {
      const next = await whatsappService.completeEmbeddedSignup({
        code,
        wabaId,
        phoneNumberId,
      });
      pending.current = { code: "", wabaId: "", phoneNumberId: "" };
      setConfig(next);
      onConnected?.(next);
      toast.success("WhatsApp conectado. Você já pode usar o chat.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível concluir a conexão com a Meta.",
      );
    } finally {
      completing.current = false;
      setConnecting(false);
    }
  }, [onConnected]);

  useEffect(() => {
    const appId = config?.embeddedSignup.appId;
    if (!appId) return;

    const initSdk = () => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
      setSdkReady(true);
    };

    if (window.FB) {
      initSdk();
      return;
    }

    window.fbAsyncInit = initSdk;
    const existing = document.getElementById("facebook-jssdk");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/pt_BR/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, [config?.embeddedSignup.appId]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!isMetaMessageOrigin(event.origin)) return;
      const payload = parseSignupPayload(event.data);
      if (!payload || payload.type !== "WA_EMBEDDED_SIGNUP") return;

      if (payload.event === "CANCEL" || payload.event === "ERROR") {
        setConnecting(false);
        if (payload.event === "ERROR") {
          toast.error(
            payload.data?.error_message ||
              "A Meta encerrou o cadastro com erro.",
          );
        }
        return;
      }

      const wabaId = payload.data?.waba_id || payload.data?.wabaId || "";
      const phoneNumberId =
        payload.data?.phone_number_id || payload.data?.phoneNumberId || "";
      if (!wabaId || !phoneNumberId) return;

      pending.current.wabaId = wabaId;
      pending.current.phoneNumberId = phoneNumberId;
      void completeIfReady();
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [completeIfReady]);

  function handleConnect() {
    const signup = config?.embeddedSignup;
    if (!window.FB || !signup?.configId) {
      toast.error(
        "Salve o App ID, o App Secret e o Configuration ID do WhatsApp antes de conectar.",
      );
      return;
    }

    if (window.location.protocol !== "https:") {
      toast.error(
        "O QR da Meta só abre em HTTPS. Use npm run dev:https e abra https://localhost:3000",
      );
      return;
    }

    setConnecting(true);
    window.FB.login(
      (response) => {
        const code = response.authResponse?.code?.trim() ?? "";
        if (!code) {
          setConnecting(false);
          return;
        }
        pending.current.code = code;
        void completeIfReady();
      },
      {
        config_id: signup.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: COEXISTENCE_EXTRAS,
      },
    );
  }

  const canLaunch = Boolean(
    sdkReady && config?.embeddedSignup.enabled && !connecting,
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#25D366]/25 bg-[#25D366]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--atria-primary)]">
          {config?.configured
            ? "WhatsApp conectado neste ERP"
            : "Conectar com o QR da Meta"}
        </p>
        <p className="mt-1 text-xs text-[var(--atria-primary)]/50">
          Abre o popup da Meta com um QR. No celular, use o WhatsApp Business
          (ícone verde) para escanear. O número do telefone continua no app e
          entra no chat do ERP.
        </p>
      </div>
      <Button
        type="button"
        onClick={handleConnect}
        disabled={!canLaunch}
        className="gap-2 bg-[#128C7E] text-white hover:bg-[#128C7E]/90"
      >
        {connecting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <QrCode className="size-4" />
        )}
        {config?.configured ? "Reconectar WhatsApp" : "Conectar WhatsApp"}
      </Button>
    </div>
  );
}
