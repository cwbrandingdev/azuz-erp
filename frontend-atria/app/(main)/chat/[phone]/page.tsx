"use client";

import { useParams } from "next/navigation";
import { WhatsappChat } from "@/components/whatsapp/whatsapp-chat";

export default function ChatPhonePage() {
  const params = useParams<{ phone: string }>();
  const phone = decodeURIComponent(params.phone ?? "");

  if (!phone) {
    return null;
  }

  return <WhatsappChat phone={phone} />;
}
