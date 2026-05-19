import type { Dictionary } from "@/lib/i18n";
import { Mascot } from "./Mascot";
import { Sparkle, StarBurst, Squiggle, ArrowDown } from "./Ornaments";
import { Marquee } from "./Marquee";
import { HeroEmail } from "./HeroEmail";

const chipColor = ["bg-brand/15 text-brand-deep", "bg-sage/20 text-sage", "bg-coral/20 text-coral", "bg-lilac/20 text-lilac", "bg-gold/30 text-ink"];

export function Hero({ dict }: { dict: Dictionary }) {
  const { hero } = dict;
  return (
    <section className="relative grain overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-brand/40 via-gold/20 to-transparent blur-3xl" />
        <div className="absolute top-40 -right-32 h-[520px] w-[520px] rounded-full bg-gradient-to-tl from-coral/30 via-rose/20 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-lilac/15 blur-3xl" />
      </div>

      <svg
        aria-hidden
        className="absolute right-6 top-24 h-44 w-28 text-ink/15 hidden lg:block"
        viewBox="0 0 60 100"
      >
        {Array.from({ length: 10 }).flatMap((_, r) =>
          Array.from({ length: 5 }).map((_, c) => (
            <circle key={`${r}-${c}`} cx={c * 12 + 4} cy={r * 10 + 4} r="1.4" fill="currentColor" />
          )),
        )}
      </svg>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-10 sm:pt-20 pb-12 sm:pb-24 relative">
        <div className="grid grid-cols-12 gap-x-6 gap-y-10 items-center">
          <div className="col-span-12 lg:col-span-7">
            <div className="inline-flex items-center gap-2 mb-7">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand">
                <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-75 [animation:pulseGlow_2s_ease-in-out_infinite]" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-kicker text-ink/65">
                {hero.kicker}
              </span>
            </div>

            <h1 className="font-serif text-[clamp(2.5rem,8.5vw,7.5rem)] leading-[0.94] tracking-tight text-ink break-words hyphens-auto">
              <span className="block">{hero.h1Part1}</span>
              <span className="block italic relative">
                {hero.h1Part2}
                <Sparkle className="absolute -right-2 -top-2 sm:-right-6 sm:top-2 h-7 w-7 sm:h-12 sm:w-12 text-gold" aria-hidden />
              </span>
              <span className="block">{hero.h1Part3}</span>
              <span className="block italic">
                {hero.h1Part4}
                <span className="inline-block ml-2 align-middle">
                  <Squiggle className="inline h-3 w-14 sm:h-4 sm:w-20 text-brand" aria-hidden />
                </span>
              </span>
            </h1>

            <p className="mt-8 max-w-xl text-lg sm:text-xl text-ink-soft leading-relaxed">
              {hero.sub}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <a
                href="#cta"
                className="group inline-flex items-center gap-2 rounded-full bg-ink text-cream pl-6 pr-2 py-2 text-base font-medium ink-shadow-lg hover:bg-brand hover:text-ink transition"
              >
                {hero.ctaPrimary}
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand text-ink group-hover:bg-cream transition">
                  →
                </span>
              </a>
              <a
                href="#evolution"
                className="inline-flex items-center gap-2 rounded-full border-2 border-ink px-6 py-3 text-base font-medium text-ink hover:bg-ink hover:text-cream transition"
              >
                {hero.ctaSecondary}
                <span aria-hidden>↓</span>
              </a>
            </div>
            {hero.ctaSecondaryNote && (
              <p className="mt-3 font-mono text-xs uppercase tracking-kicker text-ink/65">
                {hero.ctaSecondaryNote}
              </p>
            )}

            <HeroEmail dict={dict} />

            <ul className="mt-10 flex flex-wrap gap-2" aria-label="Highlights">
              {hero.tags.map((t, i) => (
                <li
                  key={t}
                  className={`${chipColor[i % chipColor.length]} inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-kicker`}
                >
                  <span className="inline-block h-1 w-1 rounded-full bg-current" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-12 lg:col-span-5 relative overflow-hidden lg:overflow-visible py-6">
            <div className="relative mx-auto w-fit max-w-full">
              <svg
                aria-hidden
                viewBox="0 0 420 420"
                className="absolute -inset-8 sm:-inset-16 text-ink/20"
              >
                <ellipse cx="210" cy="210" rx="190" ry="190" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" />
                <ellipse cx="210" cy="210" rx="160" ry="160" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              </svg>

              <StarBurst className="absolute -top-6 -left-2 h-10 w-10 sm:h-12 sm:w-12 text-gold [animation:float-slow_9s_ease-in-out_infinite]" aria-hidden />
              <Sparkle className="absolute -right-2 top-20 h-5 w-5 text-coral" aria-hidden data-decor-mobile-hide />
              <Sparkle className="absolute -bottom-2 left-12 h-4 w-4 text-lilac" aria-hidden data-decor-mobile-hide />

              <div className="w-[min(340px,82vw)] sm:w-[340px]">
                <Mascot phase="baby" personality="brand" size={340} className="w-full h-auto" />
              </div>

              <div className="absolute -left-4 sm:-left-12 top-1/3 hidden sm:block">
                <div className="bg-cream ring-ink rounded-2xl px-3 py-2 text-xs text-ink font-medium ink-shadow rotate-[-5deg]">
                  +50 XP
                </div>
              </div>
              <div className="absolute -right-2 sm:-right-10 bottom-12 hidden sm:block">
                <div className="bg-sage/90 ring-ink rounded-2xl px-3 py-2 text-xs text-ink font-medium ink-shadow rotate-[4deg]">
                  bipo · nv 2
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 flex items-center gap-3 text-ink/40">
          <ArrowDown className="h-7 w-5 [animation:float_3s_ease-in-out_infinite]" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-kicker">scroll</span>
        </div>
      </div>

      <Marquee
        dict={dict}
        items={Array.from({ length: 6 }).map(() => hero.ticker)}
        className="border-y border-ink/10 bg-cream font-serif italic text-3xl sm:text-5xl text-ink"
        fadeColor="#FBF6F1"
      />
    </section>
  );
}
