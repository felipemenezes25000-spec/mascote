"use client";

import { useEffect, useState } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";
import { LangSwitcher } from "./LangSwitcher";
import { SocialButtons } from "./SocialButtons";

export function MobileMenu({ dict, lang }: { dict: Dictionary; lang: Locale }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const links = [
    { href: "#personalities", label: dict.nav.personalities },
    { href: "#evolution", label: dict.nav.evolution },
    { href: "#features", label: dict.nav.features },
    { href: "#pricing", label: dict.nav.pricing },
    { href: "#faq", label: dict.nav.faq },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink hover:bg-ink hover:text-cream transition"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
          <line x1="3" y1="6" x2="17" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <div
        id="mobile-menu"
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
        aria-label={dict.nav.cta}
        className={`fixed inset-0 z-[80] lg:hidden transition ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          onClick={() => setOpen(false)}
          aria-hidden
          className={`absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          className={`absolute inset-x-0 top-0 bg-cream grain origin-top transition-transform duration-300 ${
            open ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="px-5 pt-5 pb-10 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-10">
              <span className="font-mono text-[10px] uppercase tracking-kicker text-ink/65">
                menu · {lang.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/20 text-ink hover:bg-ink hover:text-cream transition"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
                  <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav aria-label="primary mobile">
              <ul className="space-y-2 mb-10">
                {links.map((l, i) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex items-baseline justify-between gap-4 py-3 border-b border-ink/10 group"
                    >
                      <span className="font-serif text-3xl text-ink group-hover:italic transition">
                        {l.label}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-kicker text-ink/55">
                        0{i + 1}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>

              <a
                href="#cta"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink text-cream py-4 text-base font-medium hover:bg-brand hover:text-ink transition mb-6"
              >
                {dict.nav.cta} <span aria-hidden>→</span>
              </a>

              <div className="flex items-center justify-between gap-3">
                <LangSwitcher current={lang} />
                <SocialButtons dict={dict} />
              </div>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
