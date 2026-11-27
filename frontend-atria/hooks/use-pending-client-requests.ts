import { useAppSession } from "@/hooks/use-app-session";

export function usePendingClientRequests() {
  const session = useAppSession();

  return {
    ...session,
    data: session.data?.pendingRequests ?? [],
  };
}
