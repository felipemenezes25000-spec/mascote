"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { locales, localeMeta, type Locale } from "@/lib/i18n";

export function LangSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const pathname = usePathname() || `/${current}`;
  const [hash, setHash] = useState<string>("");

  useEffect(() => {
    setHash(window.location.hash || "");
    const onHash = () => setHash(window.location.hash || "");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const targetFor = (l: Locale) => {
    const rest = pathname.split("/").slice(2).join("/");
    const base = rest ? `/${l}/${rest}` : `/${l}`;
    return `${base}${hash}`;
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-ink/15 bg-cream/70 p-1 backdrop-blur" role="group" aria-label="Language">
      {locales.map((l) => {
        const active = l === current;
        return (
          <button
            key={l}
            type="button"
            onClick={() => router.push(targetFor(l), { scroll: false })}
            className={`px-3 py-1.5 text-[12px] font-mono tracking-kicker uppercase rounded-full transition ${
              active ? "bg-ink text-cream" : "text-ink/65 hover:text-ink"
            }`}
            aria-label={`Switch to ${localeMeta[l].label}`}
            aria-current={active ? "true" : undefined}
            lang={localeMeta[l].htmlLang}
          >
            {localeMeta[l].flag}
          </button>
        );
      })}
    </div>
  );
}
