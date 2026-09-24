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
import { FinanceTutorialOverlay } from "@/components/financial/finance-tutorial-overlay";
import {
  FINANCE_TUTORIAL_STEPS,
  FINANCE_TUTORIAL_TAB_LABELS,
  financeTutorialStorageKey,
  pathnameToFinanceTutorialTab,
  type FinanceTutorialTabId,
} from "@/components/financial/finance-tutorial-steps";

type FinanceTutorialContextValue = {
  activeTabId: FinanceTutorialTabId | null;
  stepIndex: number;
  isOpen: boolean;
  startTour: (tabId?: FinanceTutorialTabId, options?: { force?: boolean }) => void;
  closeTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  currentTabLabel: string;
  totalSteps: number;
};

const FinanceTutorialContext = createContext<FinanceTutorialContextValue | null>(
  null,
);

export function useFinanceTutorial() {
  const ctx = useContext(FinanceTutorialContext);
  if (!ctx) {
    throw new Error("useFinanceTutorial must be used within FinanceTutorialProvider");
  }
  return ctx;
}

export function FinanceTutorialProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const routeTabId = pathnameToFinanceTutorialTab(pathname);
  const [activeTabId, setActiveTabId] = useState<FinanceTutorialTabId | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const steps = activeTabId ? FINANCE_TUTORIAL_STEPS[activeTabId] : [];
  const currentStep = steps[stepIndex];

  const markCompleted = useCallback((tabId: FinanceTutorialTabId) => {
    try {
      localStorage.setItem(financeTutorialStorageKey(tabId), "done");
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
    (tabId?: FinanceTutorialTabId, options?: { force?: boolean }) => {
      const resolved = tabId ?? routeTabId;
      if (!resolved) return;

      if (!options?.force) {
        try {
          if (localStorage.getItem(financeTutorialStorageKey(resolved)) === "done") {
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

    const timer = window.setTimeout(() => {
      startTour(routeTabId);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [routeTabId, startTour]);

  const value = useMemo(
    () => ({
      activeTabId,
      stepIndex,
      isOpen,
      startTour,
      closeTour,
      nextStep,
      prevStep,
      skipTour,
      currentTabLabel: activeTabId
        ? FINANCE_TUTORIAL_TAB_LABELS[activeTabId]
        : "",
      totalSteps: steps.length,
    }),
    [
      activeTabId,
      closeTour,
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
    <FinanceTutorialContext.Provider value={value}>
      {children}
      {isOpen && currentStep && activeTabId ? (
        <FinanceTutorialOverlay
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          tabLabel={FINANCE_TUTORIAL_TAB_LABELS[activeTabId]}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          onClose={closeTour}
        />
      ) : null}
    </FinanceTutorialContext.Provider>
  );
}
