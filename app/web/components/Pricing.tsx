import type { Dictionary } from "@/lib/i18n";
import { Sparkle, StarBurst } from "./Ornaments";

export function Pricing({ dict }: { dict: Dictionary }) {
  const { pricing } = dict;
  return (
    <section id="pricing" className="relative py-20 sm:py-28 grain">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="text-center mb-14">
          <span className="font-mono text-[11px] uppercase tracking-kicker text-ink/65">
            {pricing.kicker}
          </span>
          <h2 className="mt-3 font-serif text-4xl sm:text-6xl md:text-7xl text-ink leading-[0.95] tracking-tight">
            {pricing.headline}
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-ink-soft">{pricing.sub}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {pricing.plans.map((plan) => {
            const isPlus = !!plan.highlight;
            return (
              <article
                key={plan.name}
                className={`relative rounded-3xl p-8 sm:p-10 flex flex-col ${
                  isPlus
                    ? "bg-ink text-cream ring-1 ring-ink shadow-[0_30px_80px_-20px_rgba(31,26,20,0.45)]"
                    : "bg-gradient-to-br from-gold/25 via-cream to-coral/15 text-ink border-2 border-ink/15"
                }`}
              >
                {isPlus && (
                  <>
                    <StarBurst className="absolute -top-6 -left-6 h-16 w-16 text-gold" aria-hidden />
                    <span className="absolute top-5 right-5 inline-flex items-center gap-1 rounded-full bg-brand text-cream px-3 py-1 font-mono text-[10px] uppercase tracking-kicker">
                      <Sparkle className="h-2.5 w-2.5" aria-hidden /> {plan.badge}
                    </span>
                  </>
                )}

                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      isPlus ? "bg-brand" : "bg-sage"
                    }`}
                  />
                  <span className="font-mono text-[11px] uppercase tracking-kicker opacity-70">
                    {isPlus ? "premium" : "open · sempre"}
                  </span>
                </div>
                <h3 className="font-serif text-4xl mb-1">{plan.name}</h3>
                <p className="text-sm opacity-70 mb-7 italic">{plan.tagline}</p>

                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-serif text-6xl tracking-tight">{plan.price}</span>
                  <span className="text-base opacity-70">{plan.period}</span>
                </div>
                {isPlus ? (
                  <span className="font-mono text-[10px] uppercase tracking-kicker mb-7 opacity-70">
                    {pricing.annualLabel}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-kicker mb-7 opacity-60">
                    sem cartão · sem trial · sem prazo
                  </span>
                )}

                {isPlus && (
                  <div className="mb-6 inline-flex items-center gap-2 self-start rounded-full bg-brand/90 text-ink px-3 py-1 text-[11px] font-medium">
                    <span aria-hidden>✓</span> 7 dias grátis · cancele em 1 toque
                  </div>
                )}

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[15px]">
                      <span
                        aria-hidden
                        className={`mt-1.5 inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                          isPlus ? "bg-brand" : "bg-ink"
                        }`}
                      />
                      <span className={isPlus ? "text-cream/90" : "text-ink-soft"}>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#cta"
                  className={`mt-auto inline-flex items-center justify-center gap-2 rounded-full py-3 px-6 font-medium transition ${
                    isPlus
                      ? "bg-brand text-ink hover:bg-cream"
                      : "bg-ink text-cream hover:bg-brand hover:text-ink"
                  }`}
                >
                  {plan.cta}
                  <span aria-hidden>→</span>
                </a>
              </article>
            );
          })}
        </div>

        <p className="mt-10 text-center max-w-2xl mx-auto text-sm text-ink/55 leading-relaxed">
          {pricing.legal}
        </p>
      </div>
    </section>
  );
}
