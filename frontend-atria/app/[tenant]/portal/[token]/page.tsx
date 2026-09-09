"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyPortalTokenPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();

  useEffect(() => {
    router.replace("/portal/login");
  }, [router, params.token]);

  return null;
}
