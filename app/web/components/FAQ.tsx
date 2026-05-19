import type { Dictionary } from "@/lib/i18n";

export function FAQ({ dict }: { dict: Dictionary }) {
  const { faq } = dict;
  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="text-center mb-12">
          <span className="font-mono text-[11px] uppercase tracking-kicker text-ink/65">
            {faq.kicker}
          </span>
          <h2 className="mt-3 font-serif text-4xl sm:text-6xl md:text-7xl text-ink leading-[0.95] tracking-tight">
            {faq.headline}
          </h2>
        </div>

        <div className="divide-y divide-ink/15 border-y border-ink/15">
          {faq.items.map((item, i) => (
            <details
              key={i}
              className="group py-6 [&_summary::-webkit-details-marker]:hidden [&[open]_.faq-plus]:rotate-45 [&[open]_.faq-q]:text-brand"
            >
              <summary className="flex cursor-pointer items-start justify-between gap-6 list-none">
                <div className="flex items-start gap-5 flex-1">
                  <span className="font-mono text-[11px] uppercase tracking-kicker text-ink/65 mt-1 flex-shrink-0">
                    Q.{String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="faq-q font-serif text-2xl sm:text-3xl text-ink leading-snug transition-colors">
                    {item.q}
                  </h3>
                </div>
                <span
                  aria-hidden
                  className="faq-plus mt-2 flex-shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink/25 text-ink transition-transform duration-300"
                >
                  +
                </span>
              </summary>
              <div className="pl-0 sm:pl-[88px] pr-12 mt-4 text-ink-soft text-base sm:text-lg leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
