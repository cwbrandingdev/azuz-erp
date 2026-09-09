"use client";

import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileSignature,
  Kanban,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AgencyLogo } from "@/components/branding/agency-logo";
import { useBranding } from "@/contexts/branding-context";

const FEATURES = [
  { icon: Kanban, label: "Kanban & tarefas" },
  { icon: Wallet, label: "Financeiro" },
  { icon: FileSignature, label: "Contratos" },
  { icon: BarChart3, label: "Relatórios" },
] as const;

const KANBAN_COLUMNS = [
  {
    title: "A fazer",
    color: "bg-white/10",
    cards: ["Briefing cliente", "Revisão copy"],
  },
  {
    title: "Em produção",
    color: "bg-[#E8C39E]/15",
    cards: ["Posts Instagram"],
  },
  {
    title: "Concluído",
    color: "bg-emerald-400/10",
    cards: ["Campanha Q1", "Landing page"],
  },
] as const;

const ACTIVITY = [
  { label: "Contrato assinado", detail: "Estúdio Aurora", time: "agora" },
  { label: "Post aprovado", detail: "Feed · Marca X", time: "2 min" },
  { label: "Recebível gerado", detail: "R$ 4.800,00", time: "8 min" },
] as const;

export function LoginBrandShowcase() {
  const { branding } = useBranding();

  return (
    <div
      className="relative hidden h-full min-h-svh overflow-hidden lg:flex lg:flex-col"
      style={{ backgroundColor: branding.primaryColor }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 15%, rgba(232,195,158,0.4) 0%, transparent 40%),
            radial-gradient(circle at 85% 10%, rgba(232,195,158,0.2) 0%, transparent 32%),
            radial-gradient(circle at 70% 90%, rgba(52,211,153,0.12) 0%, transparent 38%),
            linear-gradient(160deg, rgba(0,73,73,1) 0%, rgba(0,42,42,1) 50%, rgba(0,58,58,1) 100%)
          `,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(232,195,158,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(232,195,158,0.9) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="login-orb pointer-events-none absolute -left-20 top-20 size-72 rounded-full bg-[#E8C39E]/20 blur-3xl" />
      <div className="login-orb-delayed pointer-events-none absolute -right-10 bottom-32 size-96 rounded-full bg-[#E8C39E]/12 blur-3xl" />
      <div className="login-orb pointer-events-none absolute left-1/2 top-2/3 size-48 rounded-full bg-emerald-300/10 blur-2xl" />

      <div className="relative z-10 flex flex-1 flex-col px-10 py-8 xl:px-14 xl:py-10">
        <header className="mb-8 flex items-center justify-between">
          <AgencyLogo
            size="md"
            variant="sidebar"
            subtitle="Workspace inteligente"
            showName
          />

          <div className="hidden items-center gap-2 rounded-full border border-[#E8C39E]/20 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-[#E8C39E] backdrop-blur-sm xl:flex">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Sistema online
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#E8C39E]/25 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#E8C39E] backdrop-blur-sm">
            <Sparkles className="size-3.5" />
            Plataforma para agências de alto desempenho
          </div>

          <h2 className="max-w-xl text-3xl font-bold leading-[1.15] tracking-tight text-white xl:text-[2.65rem]">
            Tudo que sua agência precisa,{" "}
            <span className="text-[#E8C39E]">em um só lugar</span>
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/55 xl:text-[15px]">
            Clientes, conteúdo, finanças e operações reunidos em um workspace
            elegante — feito para equipes criativas que precisam de velocidade e
            clareza.
          </p>

          <div className="mt-7 grid max-w-lg grid-cols-2 gap-2.5 sm:grid-cols-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm transition-colors hover:bg-white/8"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#E8C39E]/15 text-[#E8C39E]">
                  <Icon className="size-3.5" />
                </div>
                <span className="text-[11px] font-medium leading-tight text-white/80">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="relative mt-10">
            <div className="login-float-delayed pointer-events-none absolute -right-2 -top-5 z-20 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-[#003535]/90 px-3 py-2 shadow-xl shadow-black/25 backdrop-blur-md">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <div>
                <p className="text-[11px] font-semibold text-white">
                  Contrato assinado
                </p>
                <p className="text-[10px] text-white/45">Estúdio Aurora · agora</p>
              </div>
            </div>

            <div className="login-float pointer-events-none absolute -left-3 bottom-8 z-20 rounded-xl border border-white/10 bg-[#003535]/90 px-3 py-2.5 shadow-xl shadow-black/25 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-[#E8C39E]/20 text-[#E8C39E]">
                  <TrendingUp className="size-3.5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-white">
                    +38% eficiência
                  </p>
                  <p className="text-[10px] text-white/45">vs. mês anterior</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07] shadow-2xl shadow-black/30 backdrop-blur-md">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-white/20" />
                  <span className="size-2.5 rounded-full bg-white/20" />
                  <span className="size-2.5 rounded-full bg-white/20" />
                </div>
                <div className="mx-auto flex h-6 w-48 items-center justify-center rounded-md bg-white/5 text-[10px] text-white/30">
                  app.atria-erp.com/dashboard
                </div>
              </div>

              <div className="grid gap-3 p-4 xl:grid-cols-[1fr_1.1fr]">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        icon: Users,
                        label: "Clientes",
                        value: "12",
                        sub: "ativos",
                      },
                      {
                        icon: CalendarDays,
                        label: "Entregas",
                        value: "94%",
                        sub: "no prazo",
                      },
                      {
                        icon: Wallet,
                        label: "Receita",
                        value: "R$ 48k",
                        sub: "este mês",
                      },
                    ].map(({ icon: Icon, label, value, sub }) => (
                      <div
                        key={label}
                        className="rounded-xl border border-white/8 bg-[#004949]/50 p-2.5"
                      >
                        <Icon className="mb-1.5 size-3.5 text-[#E8C39E]/80" />
                        <p className="text-[9px] uppercase tracking-wide text-white/40">
                          {label}
                        </p>
                        <p className="text-sm font-bold text-white">{value}</p>
                        <p className="text-[9px] text-white/35">{sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-white/8 bg-[#004949]/40 p-3">
                    <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#E8C39E]/90">
                      Atividade recente
                    </p>
                    <div className="space-y-2">
                      {ACTIVITY.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-medium text-white/85">
                              {item.label}
                            </p>
                            <p className="truncate text-[10px] text-white/40">
                              {item.detail}
                            </p>
                          </div>
                          <span className="shrink-0 text-[9px] text-white/30">
                            {item.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/8 bg-[#004949]/40 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#E8C39E]/90">
                      Kanban · Marca X
                    </p>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-white/50">
                      5 tarefas
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {KANBAN_COLUMNS.map((column) => (
                      <div key={column.title} className="min-w-0">
                        <p className="mb-1.5 truncate text-[9px] font-medium text-white/45">
                          {column.title}
                        </p>
                        <div className="space-y-1.5">
                          {column.cards.map((card) => (
                            <div
                              key={card}
                              className={`rounded-lg border border-white/8 px-2 py-1.5 text-[9px] leading-snug text-white/75 ${column.color}`}
                            >
                              {card}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-6">
            <blockquote className="max-w-md text-sm italic text-white/65">
              &ldquo;O ATRIA transformou nossa rotina de aprovações e
              entregas.&rdquo;
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-[#E8C39E]/20 text-xs font-bold text-[#E8C39E]">
                EC
              </div>
              <div>
                <p className="text-xs font-medium text-white/80">
                  Estúdio Criativo
                </p>
                <p className="text-[11px] text-white/35">São Paulo, SP</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 px-10 py-5 text-xs text-white/30 xl:px-14">
        © {new Date().getFullYear()} ATRIA ERP · Todos os direitos reservados
      </div>
    </div>
  );
}
