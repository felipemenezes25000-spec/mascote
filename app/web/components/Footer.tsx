import Link from "next/link";
import type { Dictionary, Locale } from "@/lib/i18n";
import { BrandWordmark, HeartBlock } from "./Ornaments";
import { LangSwitcher } from "./LangSwitcher";
import { SocialButtons } from "./SocialButtons";

export function Footer({ dict, lang }: { dict: Dictionary; lang: Locale }) {
  const { footer } = dict;
  return (
    <footer role="contentinfo" className="relative bg-cream border-t border-ink/15 pt-16 pb-10">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand">
                <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
                  <ellipse cx="16" cy="18" rx="11" ry="12" fill="#FBF6F1" />
                  <circle cx="12" cy="16" r="1.6" fill="#1F1A14" />
                  <circle cx="20" cy="16" r="1.6" fill="#1F1A14" />
                  <path d="M 13 22 Q 16 25 19 22" stroke="#1F1A14" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  <line x1="16" y1="6" x2="16" y2="3" stroke="#1F1A14" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="16" cy="2.2" r="1.6" fill="#F2C14E" stroke="#1F1A14" strokeWidth="1.4" />
                </svg>
              </span>
              <BrandWordmark className="text-2xl text-ink" />
            </div>
            <p className="max-w-sm text-ink-soft text-sm leading-relaxed mb-6">
              {footer.tagline}
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <LangSwitcher current={lang} />
            </div>
            <SocialButtons dict={dict} />
          </div>

          {footer.columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-[10px] uppercase tracking-kicker text-ink/55 mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => {
                  const external = l.href.startsWith("mailto:") || l.href.startsWith("http") || l.href.startsWith("#");
                  return (
                    <li key={l.label}>
                      {external ? (
                        <a href={l.href} className="text-sm text-ink hover:underline hover:underline-offset-4 hover:decoration-brand hover:decoration-2 transition">
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href} prefetch={false} className="text-sm text-ink hover:underline hover:underline-offset-4 hover:decoration-brand hover:decoration-2 transition">
                          {l.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-coral/30 bg-coral/10 p-5 mb-8 flex gap-4 items-start">
          <HeartBlock className="h-7 w-8 text-coral flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-ink leading-relaxed">{footer.safetyNote}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-ink/10 text-xs text-ink/55">
          <span>© 2026 Mascote · {footer.rights}</span>
          <span className="font-mono uppercase tracking-kicker">{footer.made}</span>
        </div>
      </div>

    </footer>
  );
}
