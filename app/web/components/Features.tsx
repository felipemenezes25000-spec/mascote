import type { Dictionary } from "@/lib/i18n";

const accentByIndex = [
  "text-brand",
  "text-sage",
  "text-gold",
  "text-coral",
  "text-lilac",
  "text-brand",
  "text-sage",
  "text-coral",
];

export function Features({ dict }: { dict: Dictionary }) {
  const { features } = dict;
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-14 pb-6 border-b border-ink/15">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-kicker text-ink/65">
              {features.kicker}
            </span>
            <h2 className="mt-3 font-serif text-4xl sm:text-6xl md:text-7xl text-ink leading-[0.95] tracking-tight">
              {features.headline}
            </h2>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-kicker text-ink/65">
            {String(features.items.length).padStart(2, "0")} · capítulos
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.items.map((f, i) => (
            <article
              key={f.title}
              className="group relative rounded-2xl border border-ink/15 bg-cream p-6 flex flex-col min-h-[230px] overflow-hidden transition hover:bg-ink hover:text-cream hover:border-ink"
            >
              <div className="flex items-center justify-between mb-5">
                <span className={`font-serif text-5xl leading-none ${accentByIndex[i]} group-hover:text-cream transition`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-kicker px-2 py-1 rounded-full border border-ink/20 group-hover:border-cream/30 transition">
                  {f.tag}
                </span>
              </div>
              <h3 className="font-serif text-2xl leading-tight mb-2">{f.title}</h3>
              <p className="text-sm leading-relaxed text-ink-soft group-hover:text-cream/80 transition">
                {f.body}
              </p>
              <span aria-hidden className="absolute -right-3 -bottom-3 font-serif italic text-[120px] text-ink/3 group-hover:text-cream/5 transition leading-none select-none">
                *
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
