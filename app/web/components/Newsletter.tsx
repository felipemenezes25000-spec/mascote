"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import { Sparkle } from "./Ornaments";

export function Newsletter({ dict }: { dict: Dictionary }) {
  const { newsletter } = dict;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok">("idle");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    try {
      const list = JSON.parse(localStorage.getItem("mascote.newsletter") || "[]");
      list.push({ email, at: new Date().toISOString() });
      localStorage.setItem("mascote.newsletter", JSON.stringify(list));
    } catch {}
    setStatus("ok");
  };

  return (
    <section className="relative py-12 sm:py-20 bg-gold/30">
      <div className="mx-auto max-w-4xl px-5 sm:px-8 text-center">
        <Sparkle className="mx-auto h-5 w-5 text-ink mb-4" aria-hidden />
        <span className="font-mono text-[11px] uppercase tracking-kicker text-ink/65">
          {newsletter.kicker}
        </span>
        <h2 className="mt-3 font-serif italic text-3xl sm:text-5xl text-ink leading-tight tracking-tight">
          {newsletter.headline}
        </h2>
        <p className="mt-5 max-w-xl mx-auto text-ink-soft">{newsletter.sub}</p>

        {status === "ok" ? (
          <p className="mt-8 font-serif italic text-2xl text-ink">{newsletter.success}</p>
        ) : (
          <form onSubmit={submit} className="mt-8 mx-auto max-w-md flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              name="newsletter_email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={newsletter.placeholder}
              aria-label={newsletter.placeholder}
              className="flex-1 min-w-0 rounded-full bg-cream ring-ink px-5 py-3 text-base text-ink placeholder:text-ink/40 focus:outline-none focus:ring-brand"
            />
            <button
              type="submit"
              className="w-full sm:w-auto rounded-full bg-ink text-cream px-5 py-3 font-medium hover:bg-brand hover:text-ink transition whitespace-nowrap"
            >
              {newsletter.submit}
            </button>
          </form>
        )}
        <p className="mt-4 text-xs text-ink/55">{newsletter.legal}</p>
      </div>
    </section>
  );
}
