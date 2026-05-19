"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n";

export function StickyCTA({ dict }: { dict: Dictionary }) {
  const { sticky } = dict;
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShow(window.scrollY > 800 && window.scrollY < document.body.scrollHeight - window.innerHeight - 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={`fixed bottom-3 left-3 right-3 z-40 lg:hidden transition-all duration-300 ${
        show ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
      }`}
    >
      <a
        href="#cta"
        className="flex items-center justify-between gap-2 rounded-full bg-ink text-cream pl-4 pr-1.5 py-1.5 ink-shadow-lg"
      >
        <span className="text-[13px] font-medium truncate min-w-0">{sticky.text}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand text-ink px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap">
          {sticky.cta} <span aria-hidden>→</span>
        </span>
      </a>
    </div>
  );
}
