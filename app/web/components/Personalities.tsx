import type { Dictionary } from "@/lib/i18n";
import { Mascot, type MascotPersonality } from "./Mascot";
import { Sparkle } from "./Ornaments";

const tintByColor: Record<MascotPersonality, { wash: string; chip: string; border: string; text: string }> = {
  sage:  { wash: "bg-sage/15",  chip: "bg-sage text-ink", border: "border-sage/40",  text: "text-sage" },
  brand: { wash: "bg-brand/15", chip: "bg-brand text-cream", border: "border-brand/40", text: "text-brand-deep" },
  coral: { wash: "bg-coral/15", chip: "bg-coral text-ink", border: "border-coral/40", text: "text-coral" },
  lilac: { wash: "bg-lilac/15", chip: "bg-lilac text-ink", border: "border-lilac/40", text: "text-lilac" },
};

export function Personalities({ dict }: { dict: Dictionary }) {
  const { personalities } = dict;
  return (
    <section id="personalities" className="relative py-20 sm:py-28 bg-ink text-cream">
      <div aria-hidden className="absolute inset-0 opacity-[0.07] pointer-events-none">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <pattern id="dots-ink" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="0.6" fill="#FBF6F1" />
          </pattern>
          <rect width="100" height="100" fill="url(#dots-ink)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 mb-5">
              <span className="h-1.5 w-8 bg-brand rounded-full" />
              <span className="font-mono text-[11px] uppercase tracking-kicker text-cream/65">
                {personalities.kicker}
              </span>
            </div>
            <h2 className="font-serif text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight">
              {personalities.headline}
            </h2>
          </div>
          <p className="max-w-md text-base text-cream/70 leading-relaxed">
            {personalities.sub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {personalities.items.map((p, idx) => {
            const tint = tintByColor[p.color as MascotPersonality];
            return (
              <article
                key={p.name}
                className={`group relative overflow-hidden rounded-3xl border ${tint.border} bg-cream text-ink p-6 flex flex-col transition hover:-translate-y-1 hover:rotate-[-0.5deg] duration-300`}
              >
                {/* big number */}
                <span className="absolute right-5 top-4 font-serif text-5xl text-ink/8 leading-none select-none">
                  0{idx + 1}
                </span>

                <div className={`-mx-6 -mt-6 mb-4 ${tint.wash} px-6 pt-6 pb-2 relative`}>
                  <div className="mx-auto w-fit">
                    <Mascot phase={idx === 0 ? "baby" : idx === 1 ? "child" : idx === 2 ? "teen" : "adult"} personality={p.color as MascotPersonality} size={180} />
                  </div>
                  <Sparkle className={`absolute top-3 left-4 h-3 w-3 ${tint.text}`} />
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-serif text-3xl text-ink">{p.name}</h3>
                  <span className={`text-[10px] font-mono uppercase tracking-kicker px-2 py-1 rounded-full ${tint.chip}`}>
                    {p.role}
                  </span>
                </div>

                <p className="text-sm text-ink-soft italic">{p.tagline}</p>

                <blockquote className={`mt-4 border-l-2 ${tint.border} pl-3 font-serif italic text-lg text-ink leading-snug`}>
                  &ldquo;{p.quote}&rdquo;
                </blockquote>

                <div className="mt-auto pt-5 border-t border-ink/8">
                  <span className="font-mono text-[12px] uppercase tracking-kicker text-ink/65 block">
                    {p.habits}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
