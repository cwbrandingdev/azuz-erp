"use client";

import { useCallback, useEffect, useState } from "react";
import {
  disablePush,
  enablePush,
  getPushState,
  type PushState,
} from "@/lib/push-notifications";
import { toast } from "@/lib/toast";

export function usePushNotifications() {
  const [state, setState] = useState<PushState | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    getPushState()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) setState("unsupported");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    try {
      setState(await enablePush());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível ativar as notificações no PC.",
      );
    }
  }, []);

  const disable = useCallback(async () => {
    await disablePush();
    setState("off");
  }, []);

  return { state, enable, disable };
}
