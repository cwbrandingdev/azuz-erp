"use client";

import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveRootOrigin } from "@/lib/tenancy/tenant-host";

export function TenantNotFound() {
  const homeHref = resolveRootOrigin();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#f7fafa] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-[var(--atria-primary)]/10 text-[var(--atria-primary)]">
          <SearchX className="size-10" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--atria-primary)]">
          Ops, não encontramos essa página
        </h1>
        <p className="mt-3 text-sm text-[var(--atria-primary)]/55">
          Esse workspace não existe ou não está disponível.
        </p>
        <div className="mt-8 flex justify-center">
          <Button
            render={<a href={homeHref} />}
            className="h-10 bg-[var(--atria-primary)] px-4 text-white hover:bg-[var(--atria-primary)]/90"
          >
            <ArrowLeft className="size-4" />
            Voltar para a página inicial
          </Button>
        </div>
      </div>
    </div>
  );
}
