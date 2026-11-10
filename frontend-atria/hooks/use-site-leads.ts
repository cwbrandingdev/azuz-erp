import { useQuery } from "@tanstack/react-query";
import { siteLeadsService } from "@/services";

export const siteLeadsKeys = { all: ["site-leads"] as const };

const SITE_LEADS_POLL_MS = 60_000;

export function useSiteLeads(options?: { enabled?: boolean}) {
    return useQuery({
        queryKey: siteLeadsKeys.all,
        queryFn: () => siteLeadsService.getSiteLeads(),
        enabled: options?.enabled ?? true,
        refetchInterval: SITE_LEADS_POLL_MS,
        staleTime: 30_000,
    });
}