"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { PortalTutorialOverlay } from "@/components/portal/portal-tutorial-overlay";
import {
  PORTAL_TUTORIAL_STEPS,
  PORTAL_TUTORIAL_TAB_LABELS,
  portalTutorialStorageKey,
  resolvePortalTutorialTab,
  type PortalTutorialTabId,
} from "@/components/portal/portal-tutorial-steps";

type PortalTutorialContextValue = {
  routeTabId: PortalTutorialTabId | null;
  activeTabId: PortalTutorialTabId | null;
  stepIndex: number;
  isOpen: boolean;
  startTour: (tabId?: PortalTutorialTabId, options?: { force?: boolean }) => void;
  closeTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  currentTabLabel: string;
  totalSteps: number;
};

const PortalTutorialContext = createContext<PortalTutorialContextValue | null>(
  null,
);

export function usePortalTutorial() {
  const ctx = useContext(PortalTutorialContext);
  if (!ctx) {
    throw new Error("usePortalTutorial must be used within PortalTutorialProvider");
  }
  return ctx;
}

export function PortalTutorialProvider({
  activeTab,
  children,
}: {
  activeTab?: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const routeTabId = resolvePortalTutorialTab(pathname, activeTab);
  const [activeTabId, setActiveTabId] = useState<PortalTutorialTabId | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const steps = activeTabId ? PORTAL_TUTORIAL_STEPS[activeTabId] : [];
  const currentStep = steps[stepIndex];

  const markCompleted = useCallback((tabId: PortalTutorialTabId) => {
    try {
      localStorage.setItem(portalTutorialStorageKey(tabId), "done");
    } catch {
      // ignore storage errors
    }
  }, []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
    setStepIndex(0);
    setActiveTabId(null);
  }, []);

  const startTour = useCallback(
    (tabId?: PortalTutorialTabId, options?: { force?: boolean }) => {
      const resolved = tabId ?? routeTabId;
      if (!resolved) return;

      if (!options?.force) {
        try {
          if (localStorage.getItem(portalTutorialStorageKey(resolved)) === "done") {
            return;
          }
        } catch {
          // continue
        }
      }

      setActiveTabId(resolved);
      setStepIndex(0);
      setIsOpen(true);
    },
    [routeTabId],
  );

  const skipTour = useCallback(() => {
    if (activeTabId) markCompleted(activeTabId);
    closeTour();
  }, [activeTabId, closeTour, markCompleted]);

  const nextStep = useCallback(() => {
    if (!activeTabId) return;
    if (stepIndex >= steps.length - 1) {
      markCompleted(activeTabId);
      closeTour();
      return;
    }
    setStepIndex((value) => value + 1);
  }, [activeTabId, closeTour, markCompleted, stepIndex, steps.length]);

  const prevStep = useCallback(() => {
    setStepIndex((value) => Math.max(0, value - 1));
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setStepIndex(0);
    setActiveTabId(null);
  }, [routeTabId]);

  useEffect(() => {
    if (!routeTabId) return;

    let cancelled = false;
    const startedAt = Date.now();
    const firstTarget = PORTAL_TUTORIAL_STEPS[routeTabId][0]?.target;

    const timer = window.setInterval(() => {
      if (cancelled) return;
      const found = firstTarget
        ? document.querySelector(firstTarget)
        : null;
      const waited = Date.now() - startedAt;
      if (found || waited > 4000) {
        window.clearInterval(timer);
        startTour(routeTabId);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [routeTabId, startTour]);

  const value = useMemo(
    () => ({
      routeTabId,
      activeTabId,
      stepIndex,
      isOpen,
      startTour,
      closeTour,
      nextStep,
      prevStep,
      skipTour,
      currentTabLabel: activeTabId
        ? PORTAL_TUTORIAL_TAB_LABELS[activeTabId]
        : "",
      totalSteps: steps.length,
    }),
    [
      activeTabId,
      closeTour,
      routeTabId,
      isOpen,
      nextStep,
      prevStep,
      skipTour,
      startTour,
      stepIndex,
      steps.length,
    ],
  );

  return (
    <PortalTutorialContext.Provider value={value}>
      {children}
      {isOpen && currentStep && activeTabId ? (
        <PortalTutorialOverlay
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          tabLabel={PORTAL_TUTORIAL_TAB_LABELS[activeTabId]}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          onClose={closeTour}
        />
      ) : null}
    </PortalTutorialContext.Provider>
  );
}
