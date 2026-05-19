import type { Dictionary } from "@/lib/i18n";
import { Squiggle } from "./Ornaments";

export function Manifesto({ dict }: { dict: Dictionary }) {
  const { manifesto } = dict;
  return (
    <section id="manifesto" className="relative py-24 sm:py-36 bg-ink text-cream overflow-hidden">
      <div aria-hidden className="absolute inset-0 opacity-[0.04]">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <pattern id="lines-ink" width="14" height="14" patternUnits="userSpaceOnUse">
            <line x1="0" y1="14" x2="14" y2="0" stroke="#FBF6F1" strokeWidth="0.5" />
          </pattern>
          <rect width="100" height="100" fill="url(#lines-ink)" />
        </svg>
      </div>

      {/* huge background asterisk */}
      <span aria-hidden className="absolute -right-20 -top-20 font-serif italic text-[400px] sm:text-[600px] text-brand/8 leading-none select-none">
        *
      </span>

      <div className="relative mx-auto max-w-5xl px-5 sm:px-8 text-center">
        <div className="inline-flex items-center gap-2 mb-10">
          <Squiggle className="h-3 w-14 text-brand" />
          <span className="font-mono text-[11px] uppercase tracking-kicker text-cream/65">
            {manifesto.kicker}
          </span>
          <Squiggle className="h-3 w-14 text-brand" />
        </div>
        <div className="space-y-5 font-serif text-3xl sm:text-5xl md:text-6xl leading-[1.15]">
          {manifesto.lines.map((line, i) => (
            <p
              key={i}
              className={i % 2 === 1 ? "italic text-brand-glow" : ""}
              style={{
                animationDelay: `${i * 0.05}s`,
              }}
            >
              {line}
            </p>
          ))}
        </div>
        <p className="mt-16 font-display text-xl sm:text-2xl text-cream/80">
          {manifesto.signoff}
        </p>
      </div>
    </section>
  );
}
