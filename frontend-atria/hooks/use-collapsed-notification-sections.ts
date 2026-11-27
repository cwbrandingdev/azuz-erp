"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { NotificationCategory } from "@/lib/notification-utils";

const STORAGE_KEY = "atria_notification_collapsed_sections";
const CHANGE_EVENT = "atria:notification-sections";

// Reserva para quando o navegador bloqueia o armazenamento (ex.: aba anônima).
let memoryValue = "";

function read(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryValue;
  } catch {
    return memoryValue;
  }
}

function write(value: string) {
  memoryValue = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Sem armazenamento: a escolha vale só até recarregar a página.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parse(value: string) {
  return new Set(value.split(",").filter(Boolean));
}

export function useCollapsedNotificationSections() {
  // No servidor não existe navegador, então lá tudo começa aberto.
  const stored = useSyncExternalStore(subscribe, read, () => "");
  const collapsed = useMemo(() => parse(stored), [stored]);

  const isCollapsed = useCallback(
    (category: NotificationCategory) => collapsed.has(category),
    [collapsed],
  );

  const toggle = useCallback((category: NotificationCategory) => {
    const next = parse(read());
    if (!next.delete(category)) next.add(category);
    write([...next].join(","));
  }, []);

  return { isCollapsed, toggle };
}
