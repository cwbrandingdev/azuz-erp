"use client";

import { Phone } from "lucide-react";
import { NativeTelButton } from "@/components/leads/native-tel-button";
import { useOptionalDialer } from "@/contexts/dialer-context";
import { isDialablePhone } from "@/lib/lead-phone";

interface LeadCallButtonProps {
  lead: { id: string; name: string; phone: string | null };
  className?: string;
  compact?: boolean;
}

export function LeadCallButton({
  lead,
  className,
  compact = false,
}: LeadCallButtonProps) {
  const dialer = useOptionalDialer();
  if (!dialer || !isDialablePhone(lead.phone)) return null;

  return (
    <NativeTelButton
      phone={dialer.mode === "native" ? lead.phone : null}
      variant="outline"
      size="sm"
      className={className}
      onClick={() =>
        dialer.callLead({
          id: lead.id,
          name: lead.name,
          phone: lead.phone as string,
        })
      }
      title="Ligar"
    >
      <Phone className="size-3.5" />
      {compact ? null : "Ligar"}
    </NativeTelButton>
  );
}
