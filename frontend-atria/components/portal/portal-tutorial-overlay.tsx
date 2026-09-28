"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PortalTutorialStep } from "@/components/portal/portal-tutorial-steps";

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type PortalTutorialOverlayProps = {
  step: PortalTutorialStep;
  stepIndex: number;
  totalSteps: number;
  tabLabel: string;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
};

const PADDING = 8;
const CARD_WIDTH = 360;
const CARD_WIDTH_WITH_IMAGE = 720;
const CARD_GAP = 16;

function visibleTarget(selector: string): Element | null {
  const elements = document.querySelectorAll(selector);
  for (const element of elements) {
    const box = element.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) return element;
  }
  return null;
}

function measureTarget(selector: string): Rect | null {
  const element = visibleTarget(selector);
  if (!element) return null;
  const box = element.getBoundingClientRect();
  return {
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function PortalTutorialOverlay({
  step,
  stepIndex,
  totalSteps,
  tabLabel,
  onNext,
  onPrev,
  onSkip,
  onClose,
}: PortalTutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [cardStyle, setCardStyle] = useState<CSSProperties>({});

  const updateGeometry = useCallback(() => {
    const rect = measureTarget(step.target);
    setTargetRect(rect);

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cardWidth = Math.min(
      step.image ? CARD_WIDTH_WITH_IMAGE : CARD_WIDTH,
      viewportWidth - 32,
    );
    const cardHeightEstimate = step.image ? 280 : 220;

    if (!rect) {
      setCardStyle({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: cardWidth,
      });
      return;
    }

    const highlightBottom = rect.top + rect.height + PADDING;
    const spaceBelow = viewportHeight - highlightBottom - CARD_GAP;
    const spaceAbove = rect.top - PADDING - CARD_GAP;

    let top: number;
    if (spaceBelow >= cardHeightEstimate || spaceBelow >= spaceAbove) {
      top = highlightBottom + CARD_GAP;
    } else {
      top = rect.top - PADDING - CARD_GAP - cardHeightEstimate;
    }

    const left = clamp(rect.left, 16, viewportWidth - cardWidth - 16);

    setCardStyle({
      top,
      left,
      width: cardWidth,
    });
  }, [step.image, step.target]);

  useLayoutEffect(() => {
    const element = visibleTarget(step.target);
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
    updateGeometry();
  }, [updateGeometry, stepIndex, step.target]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onChange = () => updateGeometry();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);

    const raf = window.requestAnimationFrame(updateGeometry);
    const retry = window.setInterval(updateGeometry, 400);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
      window.cancelAnimationFrame(raf);
      window.clearInterval(retry);
    };
  }, [updateGeometry]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onNext();
      if (event.key === "ArrowLeft" && stepIndex > 0) onPrev();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onNext, onPrev, stepIndex]);

  const hole = targetRect
    ? {
        top: targetRect.top - PADDING,
        left: targetRect.left - PADDING,
        width: targetRect.width + PADDING * 2,
        height: targetRect.height + PADDING * 2,
      }
    : null;

  return (
    <div
      className="fixed inset-0 z-[200]"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      onClick={onClose}
    >
      {hole ? (
        <div
          className="absolute rounded-xl ring-4 ring-violet-400/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.72)] transition-all duration-200"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/72" aria-hidden="true" />
      )}

      <div
        className="absolute z-[201] max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl border border-white/10 bg-white p-5 shadow-2xl"
        style={cardStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-600">
              Tutorial · {tabLabel}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{step.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar tutorial"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className={step.image ? "flex items-start gap-4" : undefined}>
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-600">
            {step.body}
          </p>
          {step.image ? (
            <img
              src={step.image}
              alt={step.imageAlt ?? step.title}
              className="w-[46%] shrink-0 rounded-xl border border-slate-200"
            />
          ) : null}
        </div>

        {!targetRect ? (
          <p className="mt-3 text-xs text-amber-700">
            Este passo não encontrou o elemento na tela. Avance ou feche o tutorial.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-400">
            Passo {stepIndex + 1} de {totalSteps}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
              Não mostrar de novo
            </Button>
            {stepIndex > 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={onPrev}>
                Voltar
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={onNext}>
              {stepIndex >= totalSteps - 1 ? "Concluir" : "Próximo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
