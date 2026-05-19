import type { Dictionary } from "@/lib/i18n";
import { HeartBlock, Squiggle } from "./Ornaments";

export function TrustBlock({ dict }: { dict: Dictionary }) {
  const { trust } = dict;
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8 text-center">
        <div className="inline-flex items-center gap-2 mb-8">
          <Squiggle className="h-3 w-14 text-brand" />
          <span className="font-mono text-[11px] uppercase tracking-kicker text-ink/65">
            {trust.kicker}
          </span>
          <Squiggle className="h-3 w-14 text-brand" />
        </div>
        <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl text-ink leading-[1.05] tracking-tight">
          <span className="block">
            {trust.headline}
          </span>
        </h2>
        <div className="mt-10 flex justify-center">
          <HeartBlock className="h-10 w-11 text-brand" />
        </div>
        <p className="mt-8 mx-auto max-w-2xl text-lg text-ink-soft leading-relaxed">
          {trust.body}
        </p>
      </div>
    </section>
  );
}
