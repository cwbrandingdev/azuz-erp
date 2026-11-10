"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SiteLeadToast } from "@/components/leads-central/site-lead-toast";
import { useAuth } from "@/contexts/auth-context";
import { useSiteLeads } from "@/hooks/use-site-leads";
import { isMasterOrAdmin } from "@/lib/permissions";
import { toast } from "@/lib/toast";

const TOAST_ID = "site-lead-arrived";

function storageKey(userId: string) {
    return `atria_site_leads_seen:${userId}`;
}

function readSeen(key: string): Set<string> | null {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? new Set(JSON.parse(raw) as string[]) : null;
    } catch {
        return null;
    }
}

function writeSeen(key: string, ids: string[]) {
    try {
      window.localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      // Sem armazenamento: o aviso só pode repetir depois de recarregar a página.
    }
}

export function SiteLeadsWatcher() {
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();
    const enabled = isAuthenticated && isMasterOrAdmin(user?.role);
    const { data } = useSiteLeads({ enabled });

    useEffect(() => {
        if (!enabled || !user?.id || !data) return;

        const key = storageKey(user.id);
        const seen = readSeen(key);
        const ids = data.leads.map((lead) => lead.id);

        if (!seen) {
          writeSeen(key, ids);
          return;
        }

        const fresh = data.leads.filter((lead) => !seen.has(lead.id));
        if (fresh.length === 0) return;

        writeSeen(key, [...seen, ...fresh.map((lead) => lead.id)]);
        toast.custom(
          () => (
            <SiteLeadToast
              leads={fresh}
              onOpen={() => {
                toast.dismiss(TOAST_ID);
                router.push("/leads-central");
              }}
              onClose={() => toast.dismiss(TOAST_ID)}
            />
          ),
          { id: TOAST_ID, duration: 15_000},
        );
    }, [data, enabled, router, user?.id]);

    return null;
}