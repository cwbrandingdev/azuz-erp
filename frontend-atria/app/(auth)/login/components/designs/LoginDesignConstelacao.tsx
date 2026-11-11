"use client";

import { AgencyLogo } from "@/components/branding/agency-logo";
import { useCompany } from "@/contexts/company-context";
import { LoginForm } from "../LoginForm";

// Nós da constelação em coordenadas de 0 a 100 (viewBox do SVG).
const NODES = [
  { x: 12, y: 18, label: "Clientes", main: true },
  { x: 26, y: 40, label: "", main: false },
  { x: 18, y: 70, label: "Contratos", main: true },
  { x: 38, y: 86, label: "", main: false },
  { x: 74, y: 14, label: "Kanban", main: true },
  { x: 88, y: 34, label: "", main: false },
  { x: 82, y: 62, label: "Financeiro", main: true },
  { x: 66, y: 84, label: "Agenda", main: true },
  { x: 92, y: 88, label: "", main: false },
] as const;

const LINKS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [4, 5],
  [5, 6],
  [6, 7],
  [6, 8],
  [3, 7],
] as const;

// Estrelas de fundo com posições fixas, para o servidor e o navegador desenharem igual.
const STARS = Array.from({ length: 70 }, (_, index) => ({
  x: (index * 37) % 100,
  y: (index * 61) % 100,
  r: index % 7 === 0 ? 0.35 : 0.18,
}));

// Design N — céu noturno onde os módulos do sistema formam uma constelação.
export function LoginDesignConstelacao() {
  const { company } = useCompany();

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#011a1c] px-4 py-14">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,90,90,0.45) 0%, transparent 70%)",
        }}
      />

      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full"
      >
        {STARS.map((star, index) => (
          <circle key={index} cx={star.x} cy={star.y} r={star.r} fill="rgba(255,255,255,0.45)" />
        ))}
        {LINKS.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={NODES[from].x}
            y1={NODES[from].y}
            x2={NODES[to].x}
            y2={NODES[to].y}
            stroke="rgba(232,195,158,0.35)"
            strokeWidth="0.15"
            strokeDasharray="0.8 0.6"
          />
        ))}
      </svg>

      {NODES.map((node) => (
        <div
          key={`${node.x}-${node.y}`}
          className="pointer-events-none absolute hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 md:flex"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
        >
          <span
            className={
              node.main
                ? "size-3 rounded-full bg-[#E8C39E] shadow-[0_0_18px_6px_rgba(232,195,158,0.45)]"
                : "size-1.5 rounded-full bg-white/70 shadow-[0_0_10px_3px_rgba(255,255,255,0.25)]"
            }
          />
          {node.label && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E8C39E]/70">
              {node.label}
            </span>
          )}
        </div>
      ))}

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <AgencyLogo size="lg" variant="sidebar" showName />
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Tudo se conecta aqui
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {company?.name
              ? `Clientes, entregas e finanças de ${company.name} num só mapa.`
              : "Clientes, entregas e finanças num só mapa."}
          </p>
        </div>
        <LoginForm tone="dark" showHeader={false} centered />
      </div>
    </div>
  );
}
