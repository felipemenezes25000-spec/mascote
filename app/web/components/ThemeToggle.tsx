"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n";

export function ThemeToggle({ dict }: { dict: Dictionary }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setDark(t === "dark");
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("mascote-theme", next);
    } catch {}
    setDark(!dark);
  };

  const label = mounted
    ? dark
      ? dict.themeToggle.labelDark
      : dict.themeToggle.labelLight
    : dict.themeToggle.auto;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink hover:bg-ink hover:text-cream transition"
      suppressHydrationWarning
    >
      {mounted && dark ? (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <circle cx="10" cy="10" r="4" />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            const x = 10 + Math.cos(a) * 7.5;
            const y = 10 + Math.sin(a) * 7.5;
            return <circle key={i} cx={x} cy={y} r="1" />;
          })}
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M16 12.5 A 7 7 0 1 1 7.5 4 A 5.5 5.5 0 0 0 16 12.5 Z" />
        </svg>
      )}
    </button>
  );
}
