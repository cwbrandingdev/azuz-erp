"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { WhatsappInbox } from "@/components/whatsapp/whatsapp-inbox";

export default function WhatsappPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--atria-primary)] sm:text-2xl">
          WhatsApp
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--atria-primary)]/50">
          Duas pessoas podem atender conversas diferentes ao mesmo tempo. O
          número é o da empresa, conectado pela Meta.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex min-h-[420px] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-[var(--atria-primary)]" />
          </div>
        }
      >
        <WhatsappInbox />
      </Suspense>
    </div>
  );
}
