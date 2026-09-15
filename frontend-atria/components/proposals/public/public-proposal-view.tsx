"use client";

import Image from "next/image";
import { ClientLogosCarousel } from "@/components/proposals/public/client-logos-carousel";
import { ProposalServicesSection } from "@/components/proposals/public/proposal-services-section";
import { ProposalSpaceSection } from "@/components/proposals/public/proposal-space-section";
import {
  ABOUT_AGENCY_COPY,
  DEFAULT_COVER_IMAGE_URL,
  DEFAULT_COVER_VIDEO_URL,
  DEFAULT_SCHEDULING_URL,
  formatProposalCurrency,
  formatProposalDate,
  PROPOSAL_GOLD,
  PROPOSAL_TEAL,
} from "@/lib/proposal-utils";
import type { Proposal } from "@/services/types";

interface PublicProposalViewProps {
  proposal: Proposal;
}

export function PublicProposalView({ proposal }: PublicProposalViewProps) {
  const schedulingUrl =
    proposal.schedulingUrl?.trim() || DEFAULT_SCHEDULING_URL;
  const hasProjects = proposal.projects.length > 0;

  return (
    <main className="bg-white text-neutral-900">
      <section className="relative flex h-screen items-center justify-center overflow-hidden">
        <video
          className="absolute inset-0 h-screen w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={DEFAULT_COVER_IMAGE_URL}
        >
          <source src={DEFAULT_COVER_VIDEO_URL} type="video/mp4" />
        </video>
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `${PROPOSAL_TEAL}99` }}
        />
        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 text-center">
          <p
            className="mb-4 text-sm tracking-[0.2em] uppercase sm:text-base"
            style={{ color: PROPOSAL_GOLD }}
          >
            {proposal.companyName}
          </p>
          <h1 className="font-[family-name:var(--font-proposal-serif)] text-4xl leading-[1.05] font-semibold tracking-tight text-white uppercase sm:text-6xl md:text-7xl">
            Proposta
            <br />
            Comercial
          </h1>
          {proposal.validUntil ? (
            <p
              className="mt-6 text-sm tracking-[0.18em] uppercase sm:text-base"
              style={{ color: PROPOSAL_GOLD }}
            >
              Válido até: {formatProposalDate(proposal.validUntil)}
            </p>
          ) : null}
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p
            className="text-xs tracking-[0.3em] uppercase"
            style={{ color: PROPOSAL_GOLD }}
          >
            CWBranding
          </p>
          <h2
            className="mt-3 font-[family-name:var(--font-proposal-serif)] text-4xl font-semibold tracking-tight sm:text-5xl"
            style={{ color: PROPOSAL_TEAL }}
          >
            {ABOUT_AGENCY_COPY.title}
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-neutral-600 sm:text-lg">
            {ABOUT_AGENCY_COPY.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {ABOUT_AGENCY_COPY.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-xs font-medium tracking-wide"
                style={{
                  backgroundColor: `${PROPOSAL_TEAL}14`,
                  color: PROPOSAL_TEAL,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <ProposalServicesSection />

      <ProposalSpaceSection />

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p
            className="text-xs tracking-[0.3em] uppercase"
            style={{ color: PROPOSAL_GOLD }}
          >
            Parceiros
          </p>
          <h2
            className="mt-3 font-[family-name:var(--font-proposal-serif)] text-4xl font-semibold tracking-tight sm:text-5xl"
            style={{ color: PROPOSAL_TEAL }}
          >
            Clientes
          </h2>
          <p className="mt-4 max-w-2xl text-neutral-600">
            Nossos parceiros são mais do que aliados de negócios — são a base de
            tudo o que construímos e conquistamos.
          </p>
          <div className="mt-10">
            <ClientLogosCarousel />
          </div>
        </div>
      </section>

      {hasProjects ? (
        <section
          className="px-4 py-16 sm:px-6 sm:py-24"
          style={{ backgroundColor: "#0a2f2f" }}
        >
          <div className="mx-auto max-w-6xl">
            <p
              className="text-xs tracking-[0.3em] uppercase"
              style={{ color: PROPOSAL_GOLD }}
            >
              Cases
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-proposal-serif)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Projetos
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {proposal.projects.map((project) => (
                <article
                  key={project.id}
                  className="overflow-hidden border border-white/10 bg-white/5"
                >
                  {project.imageUrl ? (
                    <div className="relative aspect-[16/10] bg-black/40">
                      <Image
                        src={project.imageUrl}
                        alt={project.title}
                        fill
                        className="object-cover"
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2 p-5">
                    <h3 className="text-xl font-medium text-white">
                      {project.title}
                    </h3>
                    {project.description ? (
                      <p className="text-sm leading-relaxed text-white/65">
                        {project.description}
                      </p>
                    ) : null}
                    {project.projectUrl ? (
                      <a
                        href={project.projectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-sm underline underline-offset-4"
                        style={{ color: PROPOSAL_GOLD }}
                      >
                        Ver projeto
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p
            className="text-xs tracking-[0.3em] uppercase"
            style={{ color: PROPOSAL_GOLD }}
          >
            Investimento
          </p>
          <h2
            className="mt-3 font-[family-name:var(--font-proposal-serif)] text-4xl font-semibold tracking-tight sm:text-5xl"
            style={{ color: PROPOSAL_TEAL }}
          >
            Proposta Financeira
          </h2>
          <div
            className="mt-8 overflow-hidden rounded-2xl border"
            style={{ borderColor: `${PROPOSAL_TEAL}22` }}
          >
            <ul
              className="divide-y"
              style={{ borderColor: `${PROPOSAL_TEAL}14` }}
            >
              {proposal.items.map((item) => (
                <li
                  key={item.id}
                  className="px-5 py-4"
                  style={{ borderColor: `${PROPOSAL_TEAL}14` }}
                >
                  <p className="font-medium" style={{ color: PROPOSAL_TEAL }}>
                    {item.name}
                  </p>
                  {item.description ? (
                    <p className="mt-1 text-sm text-neutral-500">
                      {item.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <div
              className="flex items-center justify-between px-5 py-5 text-white"
              style={{ backgroundColor: PROPOSAL_TEAL }}
            >
              <span
                className="text-sm tracking-wide uppercase"
                style={{ color: PROPOSAL_GOLD }}
              >
                Investimento mensal
              </span>
              <span className="text-2xl font-semibold">
                {formatProposalCurrency(proposal.totalValue)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="px-4 py-20 text-center sm:px-6 sm:py-28"
        style={{ backgroundColor: PROPOSAL_TEAL }}
      >
        <div className="mx-auto max-w-3xl">
          <p
            className="text-xs tracking-[0.3em] uppercase"
            style={{ color: PROPOSAL_GOLD }}
          >
            Próximo passo
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-proposal-serif)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Agendamento
          </h2>
          <p className="mt-4 text-white/70">
            Fale com a gente e transforme essa proposta em uma parceria
            estratégica.
          </p>
          <a
            href={schedulingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold tracking-wide uppercase transition hover:opacity-90"
            style={{ backgroundColor: PROPOSAL_GOLD, color: PROPOSAL_TEAL }}
          >
            Agendar conversa
          </a>
        </div>
      </section>
    </main>
  );
}
