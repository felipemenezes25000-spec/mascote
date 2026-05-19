import type { ReactNode } from "react";
import Link from "next/link";
import type { Dictionary, Locale } from "@/lib/i18n";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Squiggle } from "./Ornaments";

export function LegalShell({
  dict,
  lang,
  kicker,
  title,
  lastUpdated,
  children,
}: {
  dict: Dictionary;
  lang: Locale;
  kicker: string;
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <main id="main" className="min-h-screen bg-cream text-ink">
      <Header dict={dict} lang={lang} />
      <article className="mx-auto max-w-3xl px-5 sm:px-8 py-16 sm:py-24">
        <nav aria-label="breadcrumb" className="mb-10">
          <ol className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-kicker text-ink/55">
            <li>
              <Link href={`/${lang}`} className="hover:text-ink">
                mascote
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-ink">{kicker}</li>
          </ol>
        </nav>

        <div className="inline-flex items-center gap-2 mb-5">
          <Squiggle className="h-3 w-12 text-brand" />
          <span className="font-mono text-[11px] uppercase tracking-kicker text-ink/65">
            {kicker}
          </span>
        </div>
        <h1 className="font-serif text-5xl sm:text-7xl leading-[0.95] tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-kicker text-ink/55">
          {lastUpdated}
        </p>

        <hr className="my-12 editorial-rule border-0 h-px" />

        <div className="prose-mascote space-y-8 text-ink-soft text-base sm:text-lg leading-relaxed">
          {children}
        </div>

        <div className="mt-16 pt-8 border-t border-ink/15">
          <Link
            href={`/${lang}`}
            className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-sm hover:bg-ink hover:text-cream transition"
          >
            ← {dict.nav.cta}
          </Link>
        </div>
      </article>
      <Footer dict={dict} lang={lang} />
    </main>
  );
}
