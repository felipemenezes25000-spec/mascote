import Link from "next/link";
import type { Dictionary, Locale } from "@/lib/i18n";
import { LangSwitcher } from "./LangSwitcher";
import { BrandWordmark } from "./Ornaments";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";

export function Header({ dict, lang }: { dict: Dictionary; lang: Locale }) {
  const links = [
    { href: "#personalities", label: dict.nav.personalities },
    { href: "#evolution", label: dict.nav.evolution },
    { href: "#features", label: dict.nav.features },
    { href: "#pricing", label: dict.nav.pricing },
    { href: "#faq", label: dict.nav.faq },
  ];

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 backdrop-blur-md bg-cream/70 border-b border-ink/8"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <Link href={`/${lang}`} className="flex items-center gap-2.5 group" aria-label="Mascote">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-cream transition group-hover:rotate-[-4deg]">
            <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
              <ellipse cx="16" cy="18" rx="11" ry="12" fill="#FBF6F1" />
              <circle cx="12" cy="16" r="1.6" fill="#1F1A14" />
              <circle cx="20" cy="16" r="1.6" fill="#1F1A14" />
              <path d="M 13 22 Q 16 25 19 22" stroke="#1F1A14" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <line x1="16" y1="6" x2="16" y2="3" stroke="#1F1A14" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="16" cy="2.2" r="1.6" fill="#F2C14E" stroke="#1F1A14" strokeWidth="1.4" />
            </svg>
          </span>
          <BrandWordmark className="text-[22px] text-ink" />
          <span className="hidden md:inline-block font-mono text-[10px] tracking-kicker uppercase text-ink/60 ml-1 pl-2 border-l border-ink/15">
            beta · {lang.toUpperCase()}
          </span>
        </Link>

        <nav role="navigation" aria-label="primary" className="hidden lg:flex items-center gap-7 text-[13px] text-ink/70">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-ink transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle dict={dict} />
          <div className="hidden md:block">
            <LangSwitcher current={lang} />
          </div>
          <a
            href="#cta"
            className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-brand text-ink px-4 py-2 text-[13px] font-semibold hover:bg-ink hover:text-cream transition ring-ink"
          >
            {dict.nav.cta}
            <span aria-hidden>→</span>
          </a>
          <MobileMenu dict={dict} lang={lang} />
        </div>
      </div>
    </header>
  );
}
