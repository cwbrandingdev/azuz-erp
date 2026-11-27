"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSession } from "@/hooks/use-app-session";
import { getNotificationHref } from "@/lib/notification-utils";
import { notificationsService } from "@/services";
import type { AppNotification } from "@/services/types";

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

function showInboundToasts(
  list: AppNotification[],
  knownIds: Set<string> | null,
) {
  if (!knownIds) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState !== "hidden") return;

  for (const item of list) {
    if (knownIds.has(item.id) || item.isRead || item.type !== "whatsapp_inbound") {
      continue;
    }
    const toast = new Notification(item.title, {
      body: item.message,
      tag: item.id,
    });
    toast.onclick = () => {
      window.focus();
      window.location.assign(getNotificationHref(item));
      toast.close();
    };
  }
}

function normalizeCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "count" in value &&
    typeof (value as { count: unknown }).count === "number"
  ) {
    return (value as { count: number }).count;
  }
  return 0;
}

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;
  const knownIdsRef = useRef<Set<string> | null>(null);
  const queryClient = useQueryClient();
  const session = useAppSession();

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["app-session"] });
  }, [queryClient]);

  useEffect(() => {
    if (!session.data) {
      if (session.isError || session.isFetched) setLoading(false);
      return;
    }

    const list = session.data.notifications;
    showInboundToasts(list, knownIdsRef.current);
    knownIdsRef.current = new Set(list.map((item) => item.id));
    setNotifications(list);
    setUnreadCount(normalizeCount(session.data.unreadCount));
    setLoading(false);
  }, [session.data, session.isError, session.isFetched]);

  const markAsRead = useCallback(async (id: string) => {
    const target = notificationsRef.current.find((item) => item.id === id);
    if (target && !target.isRead) {
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isRead: true } : item,
      ),
    );

    try {
      await notificationsService.markAsRead(id);
    } catch {
      await queryClient.invalidateQueries({ queryKey: ["app-session"] });
    }
  }, [queryClient]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true })),
    );
    setUnreadCount(0);

    try {
      await notificationsService.markAllAsRead();
    } catch {
      await queryClient.invalidateQueries({ queryKey: ["app-session"] });
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markAsRead,
      markAllAsRead,
    }),
    [notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationsProvider",
    );
  }
  return context;
}
