"use client";

import Image from "next/image";
import {
  CW_MAIN_SERVICES_IMAGE_URL,
  PROPOSAL_GOLD,
  PROPOSAL_SERVICES,
  PROPOSAL_TEAL,
} from "@/lib/proposal-utils";

export function ProposalServicesSection() {
  return (
    <section
      id="servicos"
      className="relative overflow-hidden py-28 pl-6 md:py-40 md:pl-12 md:pr-5"
      style={{ backgroundColor: PROPOSAL_TEAL }}
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-14 xl:gap-16">
          <div>
            <h2 className="font-[family-name:var(--font-proposal-serif)] text-5xl font-semibold tracking-tight md:text-7xl lg:text-8xl">
              <span className="italic" style={{ color: PROPOSAL_GOLD }}>
                Nossos
              </span>{" "}
              <span className="text-white">Serviços</span>
            </h2>

            <div className="mt-10 max-w-xl space-y-6">
              <p className="font-[family-name:var(--font-proposal-serif)] text-2xl leading-snug font-medium text-white md:text-3xl">
                Transformamos sua visão em resultados concretos por meio da
                união entre estratégia, design e presença digital.
              </p>
              <p className="text-base leading-relaxed text-zinc-300 md:text-lg">
                A CWBranding combina criatividade, dados e execução para
                entregar soluções completas de marketing e branding, ajudando
                marcas a se destacarem no seu setor com verdade e consistência.
              </p>
            </div>
          </div>

          <div className="mb-36 flex h-[300px] w-full items-center justify-center md:h-[450px] lg:mb-0 lg:h-[620px] lg:justify-end xl:mr-64 xl:h-[700px]">
            <Image
              src={CW_MAIN_SERVICES_IMAGE_URL}
              alt="Processo Criativo CWBranding"
              width={900}
              height={700}
              className="h-full w-full object-contain lg:object-right"
              unoptimized
            />
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PROPOSAL_SERVICES.map((service) => (
            <article
              key={service.id}
              className="group relative flex h-96 flex-col justify-end overflow-hidden rounded-2xl border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ boxShadow: "none" }}
            >
              <Image
                src={service.imageUrl}
                alt={service.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                unoptimized
                sizes="(max-width: 768px) 100vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#004D4C]/95 via-[#004D4C]/90 to-transparent transition-all duration-500 md:from-black/80 md:via-black/20 md:group-hover:from-[#004D4C]/95 md:group-hover:via-[#004D4C]/90" />
              <div className="relative z-10 w-full p-6 md:p-8">
                <h3
                  className="font-[family-name:var(--font-proposal-serif)] text-2xl font-semibold transition-colors duration-300 md:text-white md:group-hover:text-[#E8C39E]"
                  style={{ color: PROPOSAL_GOLD }}
                >
                  {service.title}
                </h3>
                <div className="grid grid-rows-[1fr] transition-all duration-500 ease-in-out md:grid-rows-[0fr] md:group-hover:grid-rows-[1fr]">
                  <div className="overflow-hidden">
                    <p className="mt-4 text-sm leading-relaxed text-white/80 opacity-100 transition-opacity duration-500 md:opacity-0 md:delay-100 md:group-hover:opacity-100 md:text-base">
                      {service.description}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
