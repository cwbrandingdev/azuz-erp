"use client";

import { useParams } from "next/navigation";
import { WhatsappInbox } from "@/components/whatsapp/whatsapp-inbox";

export default function ChatPhonePage() {
  const params = useParams<{ phone: string }>();
  const phone = decodeURIComponent(params.phone ?? "");

  if (!phone) {
    return null;
  }

  return <WhatsappInbox initialPhone={phone} />;
}
