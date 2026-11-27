import { useAppSession } from "@/hooks/use-app-session";

export function useDashboardOverview() {
  const session = useAppSession();

  return {
    ...session,
    data: session.data?.dashboard ?? undefined,
  };
}
