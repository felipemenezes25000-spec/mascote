import type { Dictionary } from "@/lib/i18n";
import { Mascot, type MascotPhase } from "./Mascot";
import { ArrowDown } from "./Ornaments";

const phaseMap: MascotPhase[] = ["egg", "baby", "child", "teen", "adult", "ascended"];

export function Evolution({ dict }: { dict: Dictionary }) {
  const { evolution } = dict;
  return (
    <section id="evolution" className="relative py-20 sm:py-28 grain overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-20 mx-auto h-px max-w-5xl editorial-rule opacity-50" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="h-1.5 w-8 bg-gold rounded-full" />
            <span className="font-mono text-[11px] uppercase tracking-kicker text-ink/65">
              {evolution.kicker}
            </span>
            <span className="h-1.5 w-8 bg-gold rounded-full" />
          </div>
          <h2 className="font-serif text-4xl sm:text-6xl md:text-7xl text-ink leading-[0.95] tracking-tight">
            {evolution.headline}
          </h2>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-ink-soft">
            {evolution.sub}
          </p>
        </div>

        {/* timeline */}
        <div className="relative">
          {/* connecting dashed line */}
          <svg
            aria-hidden
            viewBox="0 0 1200 60"
            preserveAspectRatio="none"
            className="absolute left-0 right-0 top-[110px] h-12 w-full hidden md:block text-ink/25"
          >
            <line
              x1="60"
              y1="30"
              x2="1140"
              y2="30"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="6 8"
            />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <circle key={i} cx={60 + (i * 1080) / 5} cy="30" r="4" fill="#FF8030" stroke="#1F1A14" strokeWidth="1.5" />
            ))}
          </svg>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-10 relative z-10">
            {evolution.phases.map((p, i) => (
              <div key={p.name} className="flex flex-col items-center text-center">
                <div className="h-[220px] flex items-end justify-center mb-4">
                  <Mascot
                    phase={phaseMap[i]}
                    personality={i % 2 === 0 ? "brand" : "sage"}
                    size={i === 0 ? 140 : i === 1 ? 150 : i === 2 ? 170 : i === 3 ? 190 : 210}
                    shadow={true}
                  />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-kicker text-ink/65 mb-1">
                  fase 0{i + 1}
                </span>
                <h3 className="font-serif text-2xl text-ink">{p.name}</h3>
                <span className="mt-1 inline-block rounded-full bg-ink text-cream px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-kicker">
                  {p.xp}
                </span>
                <p className="mt-3 text-sm text-ink-soft italic max-w-[180px]">{p.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex justify-center">
          <div className="rounded-full border border-ink/15 px-5 py-2 font-mono text-[11px] uppercase tracking-kicker text-ink/55 inline-flex items-center gap-3">
            <ArrowDown className="h-4 w-3" />
            ovo → evoluído · sem morte · só espera
          </div>
        </div>
      </div>
    </section>
  );
}
