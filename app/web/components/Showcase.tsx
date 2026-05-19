import type { Dictionary } from "@/lib/i18n";
import { Mascot } from "./Mascot";
import { Sparkle, StarBurst } from "./Ornaments";

export function Showcase({ dict }: { dict: Dictionary }) {
  const { showcase } = dict;
  return (
    <section className="relative py-20 sm:py-28 bg-cream grain">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center mb-16">
          <span className="font-mono text-[11px] uppercase tracking-kicker text-ink/65">
            {showcase.kicker}
          </span>
          <h2 className="mt-3 font-serif italic text-4xl sm:text-6xl md:text-7xl text-ink leading-[0.95] tracking-tight">
            {showcase.headline}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1 — Check-in */}
          <div className="lg:col-span-2 rounded-3xl bg-ink text-cream p-8 sm:p-10 relative overflow-hidden">
            <div className="grid sm:grid-cols-2 gap-8 sm:gap-6 items-stretch">
              <div className="flex flex-col order-1">
                <span className="font-mono text-[10px] uppercase tracking-kicker text-cream/55 mb-3">
                  /checkin · 30s
                </span>
                <h3 className="font-serif text-3xl sm:text-4xl leading-tight mb-3">
                  {showcase.items[0].title}
                </h3>
                <p className="text-cream/75 leading-relaxed">{showcase.items[0].body}</p>
                <div className="mt-6 sm:mt-auto pt-2 sm:pt-6 flex flex-wrap gap-2">
                  {["humor", "água", "sono", "gentileza"].map((tag) => (
                    <span key={tag} className="rounded-full bg-cream/10 px-3 py-1 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              {/* fake phone mock — normal flow on mobile, centered absolute on sm+ */}
              <div className="relative flex items-center justify-center order-2 sm:min-h-[300px]">
                <Sparkle className="absolute top-2 right-2 sm:top-4 sm:right-4 h-6 w-6 text-gold z-10" aria-hidden />
                <div className="relative h-[280px] w-[160px] rounded-[28px] bg-cream ring-2 ring-ink/80 overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-ink/80" />
                  <div className="pt-7 px-3">
                    <div className="font-mono text-[8px] uppercase tracking-kicker text-ink/55">como tá hoje?</div>
                    <div className="mt-2 flex justify-between">
                      {["😄","🙂","😐","😞"].map((e, i) => (
                        <div key={i} className={`h-9 w-9 rounded-xl flex items-center justify-center text-lg ${i === 1 ? "bg-brand/80 ring-ink" : "bg-ink/5"}`}>
                          {e}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 rounded-2xl bg-sage/20 p-2.5">
                      <div className="font-mono text-[8px] uppercase tracking-kicker text-ink/55">bipo diz</div>
                      <div className="mt-0.5 font-serif italic text-[11px] text-ink leading-tight">
                        &ldquo;Tô orgulhoso. +10 XP.&rdquo;
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-center">
                      <Mascot phase="baby" personality="sage" size={80} shadow={false} />
                    </div>
                    <div className="mt-2 text-center">
                      <span className="inline-block rounded-full bg-ink text-cream px-3 py-1 text-[9px] font-medium">
                        anotar e continuar
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 — Surprise box */}
          <div className="rounded-3xl bg-gold/30 p-8 sm:p-10 relative overflow-hidden min-h-[360px] flex flex-col">
            <StarBurst className="absolute -top-4 -right-4 h-24 w-24 text-gold [animation:float-slow_9s_ease-in-out_infinite]" />
            <span className="font-mono text-[10px] uppercase tracking-kicker text-ink/65 mb-3">
              caixa surpresa · 1×/dia
            </span>
            <h3 className="font-serif text-3xl leading-tight mb-3">
              {showcase.items[1].title}
            </h3>
            <p className="text-ink-soft leading-relaxed mb-6">{showcase.items[1].body}</p>

            <div className="mt-auto grid grid-cols-3 gap-2">
              {["🪙 10", "💎 1", "🎩", "🧢", "🌿", "📕"].map((drop, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-cream ring-ink py-3 text-center text-base font-medium"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {drop}
                </div>
              ))}
            </div>
          </div>

          {/* Card 3 — Weekly report (full width) */}
          <div className="lg:col-span-3 rounded-3xl bg-sage/20 p-8 sm:p-12 relative overflow-hidden">
            <div className="grid sm:grid-cols-5 gap-6 items-center">
              <div className="sm:col-span-3">
                <span className="font-mono text-[10px] uppercase tracking-kicker text-ink/65 mb-3 block">
                  /weekly · domingo de manhã
                </span>
                <h3 className="font-serif text-3xl sm:text-4xl leading-tight mb-4">
                  {showcase.items[2].title}
                </h3>
                <p className="text-ink-soft leading-relaxed mb-6 max-w-lg">{showcase.items[2].body}</p>
                <blockquote className="font-serif italic text-2xl text-ink border-l-2 border-sage pl-4">
                  &ldquo;Cama cedo virou hábito. Bipo notou.&rdquo;
                </blockquote>
              </div>
              <div className="sm:col-span-2 flex justify-center">
                <div className="relative">
                  <div className="rounded-3xl bg-cream ring-ink p-5 ink-shadow-lg max-w-[260px]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-[9px] uppercase tracking-kicker text-ink/55">sua semana</span>
                      <span className="font-mono text-[9px] uppercase tracking-kicker text-brand">+72 XP</span>
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[5, 8, 6, 9, 7, 10, 12].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-brand/70 rounded-sm" style={{ height: `${h * 4}px` }} />
                          <span className="font-mono text-[8px] text-ink/45">{["s","t","q","q","s","s","d"][i]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] text-ink-soft leading-snug">
                      Você dormiu melhor 5 dos 7 dias. Sigam assim.
                    </div>
                  </div>
                  <Sparkle className="absolute -top-3 -right-3 h-6 w-6 text-coral" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
