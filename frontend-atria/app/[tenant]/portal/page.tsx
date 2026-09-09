"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PortalAuthProvider } from "@/contexts/portal-auth-context";
import { getPortalAccessToken } from "@/lib/portal-auth-storage";

function PortalIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(
      getPortalAccessToken() ? "/portal/dashboard" : "/portal/login",
    );
  }, [router]);

  return null;
}

export default function PortalIndexPage() {
  return (
    <PortalAuthProvider>
      <PortalIndexRedirect />
    </PortalAuthProvider>
  );
}
