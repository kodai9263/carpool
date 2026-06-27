"use client";

import { HelpCircle, X } from "lucide-react";
import { CSSProperties, useCallback, useEffect, useMemo, useState } from "react";

export interface GuidedTourStep {
  target: string;
  title: string;
  body: string;
}

interface GuidedTourProps {
  storageKey: string;
  steps: GuidedTourStep[];
  autoStart?: boolean;
  buttonLabel?: string;
  className?: string;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

const TARGET_PADDING = 8;

const clamp = (value: number, min: number, max: number) => {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};

const getGuideTarget = (target: string) => {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(`[data-guide="${target}"]`);
};

export default function GuidedTour({
  storageKey,
  steps,
  autoStart = false,
  buttonLabel = "使い方",
  className = "app-button-secondary",
}: GuidedTourProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 });

  const findAvailableStepIndex = useCallback(
    (startIndex: number) => {
      if (typeof document === "undefined") return null;

      for (let index = startIndex; index < steps.length; index += 1) {
        if (getGuideTarget(steps[index].target)) return index;
      }

      return null;
    },
    [steps]
  );

  const startTour = useCallback(() => {
    const firstStepIndex = findAvailableStepIndex(0);
    if (firstStepIndex === null) return;

    setStepIndex(firstStepIndex);
    setIsOpen(true);
  }, [findAvailableStepIndex]);

  const finishTour = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, "done");
    } catch {
      // localStorage が使えない環境では、このセッションだけ閉じられればよい。
    }

    setIsOpen(false);
    setTargetRect(null);
  }, [storageKey]);

  const measureTarget = useCallback(
    (shouldScroll = false) => {
      const step = steps[stepIndex];
      if (!isOpen || !step) return;

      const element = getGuideTarget(step.target);
      if (!element) {
        setTargetRect(null);
        return;
      }

      const updateRect = () => {
        const rect = element.getBoundingClientRect();
        const top = Math.max(TARGET_PADDING, rect.top - TARGET_PADDING);
        const left = Math.max(TARGET_PADDING, rect.left - TARGET_PADDING);
        const right = Math.min(window.innerWidth - TARGET_PADDING, rect.right + TARGET_PADDING);
        const bottom = Math.min(window.innerHeight - TARGET_PADDING, rect.bottom + TARGET_PADDING);

        setTargetRect({
          top,
          left,
          width: Math.max(48, right - left),
          height: Math.max(48, bottom - top),
        });
      };

      if (shouldScroll) {
        element.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        window.requestAnimationFrame(updateRect);
        window.setTimeout(updateRect, 260);
        return;
      }

      updateRect();
    },
    [isOpen, stepIndex, steps]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !autoStart) return;

    try {
      if (window.localStorage.getItem(storageKey) === "done") return;
    } catch {
      // localStorage が読めなくても、初回案内は表示できる。
    }

    startTour();
  }, [autoStart, isMounted, startTour, storageKey]);

  useEffect(() => {
    if (!isOpen) return;

    const nextStepIndex = findAvailableStepIndex(stepIndex);
    if (nextStepIndex === null) {
      finishTour();
      return;
    }

    if (nextStepIndex !== stepIndex) {
      setStepIndex(nextStepIndex);
      return;
    }

    measureTarget(true);
  }, [findAvailableStepIndex, finishTour, isOpen, measureTarget, stepIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      measureTarget(false);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("scroll", updateViewport, true);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("scroll", updateViewport, true);
    };
  }, [isOpen, measureTarget]);

  const currentStep = steps[stepIndex];
  const nextAvailableStepIndex = isOpen ? findAvailableStepIndex(stepIndex + 1) : null;
  const isLastStep = nextAvailableStepIndex === null;

  const tooltipStyle = useMemo<CSSProperties>(() => {
    if (!targetRect || viewport.width === 0 || viewport.height === 0) {
      return { left: 16, right: 16, bottom: 16 };
    }

    if (viewport.width < 640) {
      const targetIsLow = targetRect.top > viewport.height * 0.45;
      return targetIsLow ? { left: 16, right: 16, top: 16 } : { left: 16, right: 16, bottom: 16 };
    }

    const tooltipWidth = Math.min(360, viewport.width - 32);
    const estimatedHeight = 236;
    const centeredLeft = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    const left = clamp(centeredLeft, 16, viewport.width - tooltipWidth - 16);
    let top = targetRect.top + targetRect.height + 16;

    if (top + estimatedHeight > viewport.height - 16) {
      top = targetRect.top - estimatedHeight - 16;
    }

    return {
      left,
      top: clamp(top, 16, viewport.height - estimatedHeight - 16),
      width: tooltipWidth,
    };
  }, [targetRect, viewport.height, viewport.width]);

  const goToPreviousStep = () => {
    for (let index = stepIndex - 1; index >= 0; index -= 1) {
      if (getGuideTarget(steps[index].target)) {
        setStepIndex(index);
        return;
      }
    }
  };

  const goToNextStep = () => {
    if (nextAvailableStepIndex === null) {
      finishTour();
      return;
    }

    setStepIndex(nextAvailableStepIndex);
  };

  return (
    <>
      <button type="button" className={className} onClick={startTour}>
        <HelpCircle size={18} />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && currentStep && targetRect && (
        <div aria-live="polite">
          <div
            className="pointer-events-none fixed z-50 rounded-xl border-2 border-white bg-white/5 shadow-[0_0_0_9999px_rgba(15,23,42,0.72)] ring-4 ring-teal-300/80 transition-all duration-200"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            }}
          />

          <div
            role="dialog"
            aria-modal="false"
            aria-label="使い方ガイド"
            className="fixed z-[60] max-h-[48dvh] overflow-y-auto rounded-xl border border-teal-100 bg-white p-4 text-gray-900 shadow-[0_24px_70px_rgba(15,23,42,0.28)]"
            style={tooltipStyle}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-teal-700">
                  {stepIndex + 1} / {steps.length}
                </p>
                <h2 className="mt-1 text-base font-bold text-gray-950">{currentStep.title}</h2>
              </div>
              <button
                type="button"
                onClick={finishTour}
                className="app-icon-button min-h-9 min-w-9"
                aria-label="使い方ガイドを閉じる"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm leading-6 text-gray-600">{currentStep.body}</p>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={finishTour}
                className="min-h-10 rounded-lg px-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
              >
                スキップ
              </button>

              <div className="flex gap-2">
                {stepIndex > 0 && (
                  <button type="button" onClick={goToPreviousStep} className="app-button-secondary min-h-10 px-4">
                    戻る
                  </button>
                )}
                <button type="button" onClick={goToNextStep} className="app-button-primary min-h-10 px-4">
                  {isLastStep ? "完了" : "次へ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
