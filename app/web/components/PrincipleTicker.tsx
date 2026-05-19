"use client";

import { useState, type CSSProperties } from "react";
import type { Dictionary } from "@/lib/i18n";
import { Sparkle } from "./Ornaments";

export function PrincipleTicker({ dict }: { dict: Dictionary }) {
  const items = dict.press.items;
  const [paused, setPaused] = useState(false);

  return (
    <section className="relative bg-brand text-ink overflow-hidden border-y-[2px] border-ink isolate">
      <div
        aria-label="principles"
        className={`marquee-track flex whitespace-nowrap py-5 will-change-transform ${paused ? "is-paused" : ""}`}
        style={{ "--marquee-duration": "28s" } as CSSProperties}
      >
        {Array.from({ length: 6 }).map((_, set) => (
          <div key={set} className="flex items-center gap-6 px-4 font-display font-bold text-2xl sm:text-3xl">
            {items.map((item, i) => (
              <span key={`${set}-${i}`} className="flex items-center gap-6">
                <span>{item}</span>
                <Sparkle className="h-4 w-4 text-ink" aria-hidden />
              </span>
            ))}
          </div>
        ))}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 z-[1] h-full w-36 sm:w-44"
        style={{ background: "linear-gradient(to left, #FF8030 0%, #FF8030 55%, transparent 100%)" }}
      />

      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? dict.controls.playMarquee : dict.controls.pauseMarquee}
        aria-pressed={paused}
        className={`absolute right-3 top-1/2 -translate-y-1/2 z-[2] inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 transition cursor-pointer ${
          paused ? "bg-ink text-cream ring-ink" : "bg-brand text-ink ring-ink/40 hover:bg-ink hover:text-cream hover:ring-ink"
        }`}
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
    </section>
  );
}
