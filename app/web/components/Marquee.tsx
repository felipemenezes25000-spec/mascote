"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n";
import { Sparkle } from "./Ornaments";

export function Marquee({
  dict,
  items,
  className = "",
  speed = 40,
  interleave,
  fadeColor = "#FBF6F1",
}: {
  dict: Dictionary;
  items: string[];
  className?: string;
  speed?: number;
  interleave?: ReactNode;
  fadeColor?: string;
}) {
  const [paused, setPaused] = useState(false);

  return (
    <div className={`relative overflow-hidden py-6 isolate ${className}`}>
      <div
        className={`marquee-track flex whitespace-nowrap will-change-transform ${paused ? "is-paused" : ""}`}
        style={{ "--marquee-duration": `${speed}s` } as CSSProperties}
      >
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-8 px-6">
            {t}
            {interleave ?? <Sparkle className="h-5 w-5 text-current inline-block" aria-hidden />}
          </span>
        ))}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 z-[1] h-full w-40 sm:w-52"
        style={{ background: `linear-gradient(to left, ${fadeColor} 0%, ${fadeColor} 55%, transparent 100%)` }}
      />

      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? dict.controls.playMarquee : dict.controls.pauseMarquee}
        aria-pressed={paused}
        className={`absolute right-3 top-1/2 -translate-y-1/2 z-[2] inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 transition cursor-pointer ${
          paused ? "bg-ink text-cream ring-ink" : "text-ink ring-ink/40 hover:bg-ink hover:text-cream hover:ring-ink"
        }`}
        style={!paused ? { backgroundColor: fadeColor } : undefined}
      >
        {paused ? (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
            <path d="M3 1 L10 6 L3 11 Z" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
            <rect x="2" y="1.5" width="2.6" height="9" rx="0.6" fill="currentColor" />
            <rect x="7.4" y="1.5" width="2.6" height="9" rx="0.6" fill="currentColor" />
          </svg>
        )}
      </button>
    </div>
  );
}
