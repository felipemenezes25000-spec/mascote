"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n";

type Status = "idle" | "loading" | "success" | "error";
type Step = 1 | 2;

export function WaitlistForm({ dict }: { dict: Dictionary }) {
  const { cta, personalities } = dict;
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pick, setPick] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [utm, setUtm] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const collected: Record<string, string> = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"].forEach((k) => {
        const v = sp.get(k);
        if (v) collected[k] = v;
      });
      if (Object.keys(collected).length) setUtm(collected);
    } catch {}
  }, []);

  const advance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(cta.errorRequired);
      setStatus("error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(cta.errorEmail);
      setStatus("error");
      return;
    }
    setError("");
    setStatus("idle");
    setStep(2);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setTimeout(() => {
      try {
        const list = JSON.parse(localStorage.getItem("mascote.waitlist") || "[]");
        list.push({
          email,
          name,
          pick,
          at: new Date().toISOString(),
          referrer: typeof document !== "undefined" ? document.referrer : "",
          ...utm,
        });
        localStorage.setItem("mascote.waitlist", JSON.stringify(list));
      } catch {}
      setStatus("success");
    }, 600);
  };

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="relative rounded-3xl bg-cream ring-ink p-8 sm:p-12 text-center ink-shadow-lg"
      >
        <div className="mx-auto h-14 w-14 rounded-full bg-sage flex items-center justify-center text-ink text-2xl mb-5">
          ♡
        </div>
        <h3 className="font-serif text-3xl sm:text-4xl text-ink mb-3">{cta.success}</h3>
        <p className="text-ink-soft">{email}</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-1.5 font-mono text-[11px] uppercase tracking-kicker text-ink/65">
          {pick ? `personalidade: ${pick}` : "personalidade: a definir"}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={step === 1 ? advance : submit}
      action="#cta"
      method="post"
      className="relative rounded-3xl bg-cream ring-ink p-6 sm:p-10 ink-shadow-lg"
      noValidate
    >
      <div className="mb-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-kicker text-ink/55">
        <span aria-current={step === 1 ? "step" : undefined} className={step === 1 ? "text-ink font-semibold" : ""}>
          01 · contato
        </span>
        <span aria-hidden>→</span>
        <span aria-current={step === 2 ? "step" : undefined} className={step === 2 ? "text-ink font-semibold" : ""}>
          02 · personalidade
        </span>
      </div>

      {step === 1 ? (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-kicker text-ink/55 block mb-1.5">
                {cta.namePlaceholder}
              </span>
              <input
                type="text"
                name="name"
                autoComplete="given-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={cta.namePlaceholder}
                aria-label={cta.namePlaceholder}
                className="w-full bg-transparent border-b border-ink/20 py-2 text-lg text-ink placeholder:text-ink/30 focus:border-brand focus:outline-none transition"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-kicker text-ink/55 block mb-1.5">
                {cta.emailPlaceholder}
              </span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="you@email.com"
                required
                aria-label={cta.emailPlaceholder}
                aria-invalid={status === "error"}
                className="w-full bg-transparent border-b border-ink/20 py-2 text-lg text-ink placeholder:text-ink/30 focus:border-brand focus:outline-none transition"
              />
            </label>
          </div>
          {status === "error" && (
            <p role="alert" className="text-coral text-sm mb-4 font-medium">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-ink text-cream py-4 text-base font-medium hover:bg-brand hover:text-ink transition"
          >
            {cta.submit} <span aria-hidden>→</span>
          </button>
        </>
      ) : (
        <>
          <span className="font-mono text-[10px] uppercase tracking-kicker text-ink/55 block mb-3">
            {cta.personalityLabel}
          </span>
          <div role="radiogroup" aria-label={cta.personalityLabel} className="flex flex-wrap gap-2 mb-7">
            {personalities.items.map((p) => {
              const active = pick === p.name;
              return (
                <button
                  key={p.name}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-pressed={active}
                  onClick={() => setPick(p.name)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-ink bg-ink text-cream"
                      : "border-ink/20 text-ink hover:border-ink/50"
                  }`}
                >
                  {p.name} · <span className="italic opacity-70">{p.role}</span>
                </button>
              );
            })}
          </div>

          <input type="hidden" name="utm" value={JSON.stringify(utm)} />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full border border-ink/20 px-5 py-3 text-sm text-ink hover:bg-ink/5 transition"
            >
              ← voltar
            </button>
            <button
              type="submit"
              disabled={status === "loading"}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-brand text-ink py-3 text-base font-semibold hover:bg-ink hover:text-cream transition disabled:opacity-60"
            >
              {status === "loading" ? "..." : cta.submit} <span aria-hidden>→</span>
            </button>
          </div>
        </>
      )}
    </form>
  );
}
