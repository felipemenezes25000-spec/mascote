import type { Dictionary } from "@/lib/i18n";
import { WaitlistForm } from "./WaitlistForm";
import { Sparkle, StarBurst, Squiggle } from "./Ornaments";
import { Mascot } from "./Mascot";

export function CTA({ dict }: { dict: Dictionary }) {
  const { cta } = dict;
  return (
    <section id="cta" className="relative py-20 sm:py-28 overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute top-10 left-1/4 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-gold/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="relative text-center mb-12">
          <StarBurst className="absolute -top-4 left-1/4 h-10 w-10 text-coral hidden sm:block" />
          <Sparkle className="absolute top-12 right-1/4 h-5 w-5 text-lilac hidden sm:block" />

          <div className="inline-flex items-center gap-2 mb-5">
            <Squiggle className="h-3 w-12 text-brand" />
            <span className="font-mono text-[11px] uppercase tracking-kicker text-ink/65">
              {cta.kicker}
            </span>
            <Squiggle className="h-3 w-12 text-brand" />
          </div>
          <h2 className="font-serif text-4xl sm:text-6xl md:text-7xl text-ink leading-[0.95] tracking-tight">
            {cta.headline}
          </h2>
          <p className="mt-6 mx-auto max-w-xl text-lg text-ink-soft">
            {cta.sub}
          </p>
        </div>

        <div className="relative grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          <WaitlistForm dict={dict} />
          <aside className="rounded-3xl bg-ink text-cream p-7 relative overflow-hidden h-fit">
            <Mascot phase="baby" personality="brand" size={170} className="mx-auto" />
            <div className="text-center mt-3">
              <span className="font-mono text-[10px] uppercase tracking-kicker text-cream/55 block mb-2">o que vem</span>
              <ul className="text-sm text-cream/80 leading-relaxed space-y-1">
                <li>e-mail de boas-vindas</li>
                <li>convite ao beta privado</li>
                <li>1 newsletter/mês</li>
                <li>zero spam</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
