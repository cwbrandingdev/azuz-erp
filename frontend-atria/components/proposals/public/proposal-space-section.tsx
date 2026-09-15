"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CW_LOCAL_LOGO_URL,
  DEFAULT_STRUCTURE_CONTENT,
  LOCAL_SPACE_IMAGES,
  PROPOSAL_GOLD,
  PROPOSAL_TEAL,
} from "@/lib/proposal-utils";

export function ProposalSpaceSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = LOCAL_SPACE_IMAGES.length;

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex((index + total) % total);
    },
    [total],
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  useEffect(() => {
    const timer = window.setInterval(goNext, 5000);
    return () => window.clearInterval(timer);
  }, [goNext]);

  return (
    <section
      id="espaco"
      className="grid max-h-auto grid-cols-1 text-white lg:grid-cols-2"
      style={{ backgroundColor: PROPOSAL_TEAL }}
    >
      <div className="flex items-center justify-center px-6 py-12 lg:py-12">
        <div className="relative w-full max-w-[500px]">
          <div className="relative h-[320px] overflow-hidden rounded-2xl shadow-xl md:h-[500px]">
            {LOCAL_SPACE_IMAGES.map((image, index) => (
              <div
                key={image.id}
                className="absolute inset-0 transition-opacity duration-500"
                style={{ opacity: index === activeIndex ? 1 : 0 }}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority={index === 0}
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={goPrev}
            className="absolute top-1/2 left-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute top-1/2 right-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
            aria-label="Próxima imagem"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="mt-4 flex items-center justify-center gap-2">
            {LOCAL_SPACE_IMAGES.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => goTo(index)}
                className="h-2 rounded-full transition-all"
                style={{
                  width: index === activeIndex ? "1.5rem" : "0.5rem",
                  backgroundColor:
                    index === activeIndex
                      ? PROPOSAL_GOLD
                      : "rgba(255,255,255,0.35)",
                }}
                aria-label={`Ir para imagem ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 lg:px-12 lg:py-20">
        <div className="max-w-xl text-center lg:text-left">
          <div className="mb-6 flex flex-col items-center gap-4 lg:flex-row lg:items-center">
            <Image
              src={CW_LOCAL_LOGO_URL}
              alt="CWBranding"
              width={100}
              height={100}
              className="rounded-full"
              unoptimized
            />
            <h3 className="font-[family-name:var(--font-proposal-serif)] py-4 text-3xl leading-tight font-semibold text-white md:text-5xl">
              Nosso Espaço
            </h3>
          </div>
          <p className="text-base leading-relaxed text-zinc-200 md:text-lg">
            {DEFAULT_STRUCTURE_CONTENT}
          </p>
        </div>
      </div>
    </section>
  );
}
