"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { Sparkle } from "./Ornaments";

const TARGET = 1247;

export function SocialProof({ dict }: { dict: Dictionary }) {
  const { socialProof } = dict;
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (reduced) {
              setCount(TARGET);
            } else {
              let start: number | null = null;
              const dur = 1600;
              const step = (ts: number) => {
                if (start === null) start = ts;
                const p = Math.min(1, (ts - start) / dur);
                const eased = 1 - Math.pow(1 - p, 3);
                setCount(Math.floor(eased * TARGET));
                if (p < 1) requestAnimationFrame(step);
              };
              requestAnimationFrame(step);
            }
            obs.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative py-20 sm:py-24 grain overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <span className="font-mono text-[11px] uppercase tracking-kicker text-ink/65">
              {socialProof.kicker}
            </span>
            <h2 className="mt-3 font-serif text-4xl sm:text-5xl text-ink leading-[1.0] tracking-tight mb-8">
              {socialProof.headline}
            </h2>
            <div className="rounded-3xl bg-ink text-cream p-7 ink-shadow-lg">
              <div className="font-mono text-[11px] uppercase tracking-kicker text-cream/55 mb-1">
                ao vivo · ranking interno
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-7xl tracking-tight">
                  {count.toLocaleString("pt-BR")}
                </span>
                <Sparkle className="h-5 w-5 text-brand" />
              </div>
              <div className="text-cream/70 text-sm mt-1">{socialProof.counterLabel}</div>
            </div>
            <div className="mt-8">
              <span className="font-mono text-[10px] uppercase tracking-kicker text-ink/55 block mb-3">
                {socialProof.featuredLabel}
              </span>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-ink/55">
                {socialProof.featured.map((f) => (
                  <span key={f} className="font-display italic text-lg">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4 self-stretch">
            {socialProof.quotes.map((q, i) => {
              const accents = ["border-sage/40 bg-sage/8", "border-coral/40 bg-coral/8", "border-lilac/40 bg-lilac/8"];
              return (
                <figure
                  key={i}
                  className={`relative rounded-3xl border ${accents[i % accents.length]} p-6 flex flex-col ${
                    i === 0 ? "sm:row-span-2" : ""
                  }`}
                >
                  <span aria-hidden className="font-serif italic text-7xl text-ink/15 leading-none">
                    &ldquo;
                  </span>
                  <blockquote className="font-serif italic text-xl sm:text-2xl text-ink leading-snug mb-5 -mt-2">
                    {q.text}
                  </blockquote>
                  <figcaption className="mt-auto pt-4 border-t border-ink/10">
                    <div className="text-ink font-medium text-sm">{q.author}</div>
                    <div className="font-mono text-[10px] uppercase tracking-kicker text-ink/55">
                      {q.role}
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
