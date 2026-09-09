import {
  BarChart3,
  FileSignature,
  Kanban,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { getRootDomain } from "@/lib/tenancy/tenant-host";

const FEATURES = [
  {
    icon: Kanban,
    title: "Operação",
    description: "Kanban, tarefas e entregas no mesmo fluxo da equipe.",
  },
  {
    icon: Wallet,
    title: "Financeiro",
    description: "Contratos, recebíveis e visão clara do caixa da agência.",
  },
  {
    icon: FileSignature,
    title: "Clientes",
    description: "CRM, portais e aprovações sem sair da plataforma.",
  },
  {
    icon: BarChart3,
    title: "Resultados",
    description: "Relatórios e indicadores para cada conta que você atende.",
  },
] as const;

export function LandingPage() {
  const rootDomain = getRootDomain();

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#f7fafa] text-[var(--atria-primary)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 12% -10%, rgba(232,195,158,0.28) 0%, transparent 36%), radial-gradient(circle at 90% 0%, rgba(0,73,73,0.08) 0%, transparent 32%)",
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--atria-primary)] text-sm font-black text-[var(--atria-accent)]">
            A
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight">ATRIA ERP</p>
            <p className="text-xs text-[var(--atria-primary)]/55">
              Sistema de gestão
            </p>
          </div>
        </div>
        <span className="hidden rounded-full border border-[var(--atria-primary)]/10 bg-white px-3 py-1 text-xs font-medium text-[var(--atria-primary)]/70 sm:inline-flex">
          Multi-tenant
        </span>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-20 pt-8 lg:pt-16">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--atria-accent)]">
            Plataforma para agências
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Gestão completa, no workspace da sua marca.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--atria-primary)]/65 sm:text-lg">
            Acesse o ERP pelo subdomínio da sua agência. Cada workspace isola
            clientes, times, financeiro e operação em um único ambiente.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-[var(--atria-primary)]/8 bg-white/80 p-5 shadow-[0_12px_40px_-24px_rgba(0,73,73,0.35)]"
            >
              <feature.icon
                className="size-5 text-[var(--atria-primary)]"
                strokeWidth={1.75}
              />
              <h2 className="mt-4 text-sm font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--atria-primary)]/60">
                {feature.description}
              </p>
            </article>
          ))}
        </section>

        <section className="flex items-start gap-3 rounded-2xl border border-[var(--atria-primary)]/8 bg-white/70 px-5 py-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--atria-accent)]" />
          <p className="text-sm leading-relaxed text-[var(--atria-primary)]/70">
            Já tem um workspace? Abra o endereço da sua agência
            {rootDomain ? (
              <>
                , como
                <span className="font-medium text-[var(--atria-primary)]">
                  {" "}
                  sua-agencia.{rootDomain}
                </span>
              </>
            ) : null}
            .
          </p>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[var(--atria-primary)]/8 px-6 py-6 text-center text-xs text-[var(--atria-primary)]/40">
        ATRIA ERP · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
