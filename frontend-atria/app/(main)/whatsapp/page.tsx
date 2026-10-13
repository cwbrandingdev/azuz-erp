"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WhatsappInbox } from "@/components/whatsapp/whatsapp-inbox";

function WhatsappInboxFromQuery() {
  const params = useSearchParams();
  return <WhatsappInbox initialPhone={params.get("phone") ?? undefined} />;
}

export default function WhatsappPage() {
  return (
    <Suspense>
      <WhatsappInboxFromQuery />
    </Suspense>
  );
}
