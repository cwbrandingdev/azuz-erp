"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { hasAnyPermission, Permission } from "@/lib/permissions";
import { toast } from "@/lib/toast";
import { leadsService } from "@/services";
import type { TodayLeadMeeting } from "@/services/types";

const SESSION_KEY = "atria_lead_meeting_toast_date";

function saoPauloDayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatMeetingTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function meetingLabel(meeting: TodayLeadMeeting) {
  return `${formatMeetingTime(meeting.startAt)} · ${meeting.title} com ${meeting.guestName}`;
}

export function LeadMeetingTodayWatcher() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const firedRef = useRef(false);
  const canSeeMeetings =
    isAuthenticated &&
    Boolean(user) &&
    hasAnyPermission(user?.role, [Permission.CRM_ALL, Permission.CRM_ORG_LEADS], user?.permissions);

  useEffect(() => {
    if (!canSeeMeetings || firedRef.current) return;

    const today = saoPauloDayKey();
    if (sessionStorage.getItem(SESSION_KEY) === today) {
      firedRef.current = true;
      return;
    }

    firedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, today);

    void leadsService
      .listTodayMeetings()
      .then((meetings) => {
        if (meetings.length === 0) return;

        const title =
          meetings.length === 1
            ? `Reunião hoje: ${meetings[0].title}`
            : `${meetings.length} reuniões hoje`;
        const description =
          meetings.length === 1
            ? `${formatMeetingTime(meetings[0].startAt)} com ${meetings[0].guestName}`
            : meetings.map(meetingLabel).join(" · ");

        toast.info(title, {
          description,
          action: {
            label: "Abrir kanban",
            onClick: () => router.push("/leads/kanban"),
          },
          duration: 10_000,
        });
      })
      .catch(() => {
        firedRef.current = false;
        sessionStorage.removeItem(SESSION_KEY);
      });
  }, [canSeeMeetings, router]);

  return null;
}
