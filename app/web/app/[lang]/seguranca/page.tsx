import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDictionary, isLocale, type Locale, locales } from "@/lib/i18n";
import { LegalShell } from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  if (!isLocale(params.lang)) return {};
  const t = titleFor(params.lang as Locale);
  return {
    title: t,
    alternates: { canonical: `${SITE.url}/${params.lang}/seguranca` },
  };
}

const titleFor = (lang: Locale) =>
  lang === "pt" ? "Segurança e crise" : lang === "es" ? "Seguridad y crisis" : "Safety & crisis";

type Resource = { name: string; line: string; note: string };
const resources: Record<Locale, { kicker: string; title: string; intro: string; updated: string; resources: Resource[]; promise: string[]; }> = {
  pt: {
    kicker: "ESTÁ DIFÍCIL?",
    title: "Você não precisa estar bem agora.",
    updated: "Atualizado em 19 · 05 · 2026",
    intro:
      "Se algo está pesado demais — o que você está sentindo importa, e tem gente preparada pra escutar agora. Mascote é bem-estar, não emergência. Pra crise, ligue.",
    resources: [
      { name: "CVV — Centro de Valorização da Vida", line: "188", note: "Ligação grátis, 24h, anônima. Brasil." },
      { name: "Chat CVV", line: "cvv.org.br", note: "Atendimento por chat e e-mail." },
      { name: "SAMU", line: "192", note: "Emergência médica, Brasil." },
      { name: "CAPS — Centro de Atenção Psicossocial", line: "Pesquise o mais próximo", note: "Rede pública do SUS, gratuito." },
    ],
    promise: [
      "Em todas as 4 personalidades do app, se o usuário menciona auto-machucar ou crise, a IA é interceptada antes de chamar a OpenAI — entregamos diretamente os contatos acima.",
      "Não fingimos ser terapeuta. Não diagnosticamos. Não prescrevemos. Quando você precisa de um humano, a gente abre caminho.",
    ],
  },
  en: {
    kicker: "TOUGH RIGHT NOW?",
    title: "You don't have to be okay right now.",
    updated: "Last updated · 2026-05-19",
    intro:
      "If something feels too heavy — what you're feeling matters, and there are people trained to listen right now. Mascote is wellness, not emergency. For crisis, call.",
    resources: [
      { name: "988 Suicide & Crisis Lifeline", line: "988", note: "Free, 24/7. United States." },
      { name: "Samaritans", line: "116 123", note: "Free, 24/7. UK & Ireland." },
      { name: "Lifeline", line: "13 11 14", note: "Australia." },
      { name: "International directory", line: "findahelpline.com", note: "Find the line in your country." },
    ],
    promise: [
      "Across all 4 personalities, if a user mentions self-harm or crisis, the AI is intercepted before calling OpenAI — we deliver the resources above directly.",
      "We don't pretend to be a therapist. We don't diagnose. We don't prescribe. When you need a human, we make room.",
    ],
  },
  es: {
    kicker: "¿DIFÍCIL AHORA?",
    title: "No tienes que estar bien ahora mismo.",
    updated: "Actualizado · 19 · 05 · 2026",
    intro:
      "Si algo pesa demasiado — lo que sientes importa, y hay personas entrenadas para escuchar ahora. Mascote es bienestar, no emergencia. Para crisis, llama.",
    resources: [
      { name: "España · Línea 024", line: "024", note: "Gratis, 24h." },
      { name: "México · SAPTEL", line: "55 5259 8121", note: "24h." },
      { name: "Argentina · Centro de Asistencia al Suicida", line: "135", note: "Buenos Aires, gratuita." },
      { name: "Directorio internacional", line: "findahelpline.com", note: "Encuentra la línea de tu país." },
    ],
    promise: [
      "En las 4 personalidades, si el usuario menciona autolesión o crisis, la IA se intercepta antes de llamar a OpenAI — entregamos los recursos arriba.",
      "No fingimos ser terapeuta. No diagnosticamos. No prescribimos. Cuando necesitas a un humano, abrimos paso.",
    ],
  },
};

export default function SafetyPage({ params }: { params: { lang: string } }) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const dict = getDictionary(lang);
  const c = resources[lang];
  return (
    <LegalShell dict={dict} lang={lang} kicker={c.kicker} title={c.title} lastUpdated={c.updated}>
      <p className="text-xl text-ink leading-relaxed">{c.intro}</p>

      <div className="my-10 grid gap-4">
        {c.resources.map((r) => (
          <div
            key={r.name}
            className="rounded-2xl border border-coral/30 bg-coral/10 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
              <h3 className="font-serif text-2xl text-ink">{r.name}</h3>
              <span className="font-mono text-lg text-ink">{r.line}</span>
            </div>
            <p className="text-sm text-ink-soft">{r.note}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink mb-3">
          {lang === "pt" ? "O que prometemos" : lang === "es" ? "Lo que prometemos" : "What we promise"}
        </h2>
        {c.promise.map((p, i) => (
          <p key={i} className="mb-3">
            {p}
          </p>
        ))}
      </section>
    </LegalShell>
  );
}
