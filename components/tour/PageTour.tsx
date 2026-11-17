"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TourStep = {
  /** data-tour attribute value of the spotlighted element; null = centred card */
  target: string | null;
  title: string;
  body: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const SPOT_PADDING = 8;

function readRect(selector: string): Rect | null {
  const el = document.querySelector(`[data-tour="${selector}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    top: r.top - SPOT_PADDING,
    left: r.left - SPOT_PADDING,
    width: r.width + SPOT_PADDING * 2,
    height: r.height + SPOT_PADDING * 2,
  };
}

export function PageTour({
  tourId,
  steps,
}: {
  tourId: string;
  steps: TourStep[];
}) {
  const storageKey = `tour_done_${tourId}`;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const openRef = useRef(false);

  openRef.current = open;

  const measure = useCallback(() => {
    if (!openRef.current) return;
    const step = steps[index];
    if (!step) return;
    setRect(step.target ? readRect(step.target) : null);
  }, [index, steps]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(steps.length - 1, next));
      setIndex(clamped);
      const target = steps[clamped]?.target;
      if (target) {
        const el = document.querySelector(`[data-tour="${target}"]`);
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      // measure after the scroll settles
      setReady(false);
      window.setTimeout(() => {
        setReady(true);
      }, 420);
    },
    [steps],
  );

  // auto-start for first-time visitors
  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(storageKey) === "1";
    } catch {
      /* storage unavailable */
    }
    if (!seen) {
      const timer = window.setTimeout(() => {
        setOpen(true);
        setIndex(0);
        setReady(true);
      }, 700);
      return () => window.clearTimeout(timer);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(() => measure());
    const onMove = () => measure();
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
    };
  }, [open, measure, ready]);

  // Esc = dismiss
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, goTo]);

  function finish() {
    setOpen(false);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* storage unavailable */
    }
  }

  function replay() {
    setIndex(0);
    setReady(true);
    setOpen(true);
  }

  const step = steps[index];
  if (!step) return null;
  const last = index === steps.length - 1;

  // Tooltip placement
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 720;
  const tipWidth = Math.min(360, vw - 32);
  let tipStyle: React.CSSProperties = {};
  if (rect && ready) {
    const below = rect.top + rect.height + 14;
    const fitsBelow = below + 190 < vh;
    tipStyle = {
      position: "fixed",
      width: tipWidth,
      left: Math.min(
        Math.max(16, rect.left + rect.width / 2 - tipWidth / 2),
        vw - tipWidth - 16,
      ),
      top: fitsBelow ? below : Math.max(16, rect.top - 14 - 190),
    };
  } else {
    tipStyle = {
      position: "fixed",
      width: tipWidth,
      left: (vw - tipWidth) / 2,
      top: vh * 0.35,
    };
  }

  return (
    <>
      {/* Replay trigger */}
      <button
        type="button"
        onClick={replay}
        className="fixed bottom-4 right-4 z-30 flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg transition hover:bg-slate-700"
        title="Replay the guided tour"
      >
        <span aria-hidden>💡</span> Tour
      </button>

      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
          {/* Spotlight or full dim */}
          {rect && ready ? (
            <div
              className="pointer-events-none absolute rounded-xl ring-2 ring-white/70"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.72)",
                transition: "all 0.35s ease",
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-slate-900/72" />
          )}

          {/* Tooltip */}
          <div
            className="rounded-xl bg-white p-4 shadow-2xl ring-1 ring-slate-200"
            style={{ ...tipStyle, transition: "top 0.3s ease, left 0.3s ease" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                  Step {index + 1} of {steps.length}
                </p>
                <h3 className="mt-0.5 font-semibold text-slate-900">{step.title}</h3>
              </div>
              <button
                type="button"
                onClick={finish}
                className="text-slate-400 transition hover:text-slate-600"
                aria-label="Skip tour"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={finish}
                className="text-xs text-slate-400 underline hover:text-slate-600"
              >
                Skip tour
              </button>
              <div className="flex gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => goTo(index - 1)}
                    className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => (last ? finish() : goTo(index + 1))}
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                >
                  {last ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
