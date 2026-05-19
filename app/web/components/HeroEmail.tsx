"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";

export function HeroEmail({ dict }: { dict: Dictionary }) {
  const { cta } = dict;
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(cta.errorEmail);
      return;
    }
    setError("");
    try {
      const list = JSON.parse(localStorage.getItem("mascote.waitlist") || "[]");
      list.push({ email, source: "hero-quick", at: new Date().toISOString() });
      localStorage.setItem("mascote.waitlist", JSON.stringify(list));
    } catch {}
    setOk(true);
  };

  if (ok) {
    return (
      <div role="status" aria-live="polite" className="mt-6 max-w-md rounded-2xl bg-sage/15 border border-sage/40 p-4">
        <p className="font-serif italic text-xl text-ink">{cta.success}</p>
        <a
          href="#cta"
          className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-kicker text-ink underline underline-offset-4 decoration-2 decoration-brand"
        >
          {cta.personalityLabel} <span aria-hidden>→</span>
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 max-w-md flex flex-col sm:flex-row gap-2"
      aria-label={cta.emailPlaceholder}
    >
      <label className="flex-1 relative">
        <span className="sr-only">{cta.emailPlaceholder}</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
          placeholder={cta.emailPlaceholder}
          required
          aria-invalid={!!error}
          aria-describedby={error ? "hero-email-error" : undefined}
          className="w-full rounded-full bg-cream/80 ring-ink px-5 py-3 text-base text-ink placeholder:text-ink/40 backdrop-blur focus:outline-none focus:ring-brand"
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-ink text-cream px-5 py-3 text-base font-medium hover:bg-brand hover:text-ink transition whitespace-nowrap"
      >
        {cta.submit} <span aria-hidden>→</span>
      </button>
      {error && (
        <p id="hero-email-error" role="alert" className="text-coral text-sm sm:basis-full font-medium">
          {error}
        </p>
      )}
    </form>
  );
}
