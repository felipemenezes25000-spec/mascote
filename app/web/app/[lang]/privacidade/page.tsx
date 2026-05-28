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
    alternates: { canonical: `${SITE.url}/${params.lang}/privacidade` },
    robots: { index: true, follow: true },
  };
}

const titleFor = (lang: Locale) =>
  lang === "pt" ? "Privacidade" : lang === "es" ? "Privacidad" : "Privacy";

const content: Record<Locale, { kicker: string; title: string; updated: string; body: { h: string; p: string[] }[] }> = {
  pt: {
    kicker: "POLÍTICA",
    title: "Privacidade, em português claro.",
    updated: "Atualizado em 19 · 05 · 2026",
    body: [
      {
        h: "O princípio",
        p: [
          "Mascote foi feito local-first. A maior parte do que você faz no app (check-ins, hábitos, customização, recompensas) é guardada no seu dispositivo. Nada disso sai dele sem você pedir.",
          "A gente não vende dado. Não aluga. Não compartilha pra ad network. Promessa séria — escrita aqui porque a gente quer ser cobrado por ela.",
        ],
      },
      {
        h: "O que fica no seu dispositivo",
        p: [
          "Seu nome, idade aproximada, humor diário, sequência de hábitos, conquistas, acessórios desbloqueados, configurações de tema e paleta. Tudo em AsyncStorage local — não passa por servidor.",
        ],
      },
      {
        h: "O que sai do dispositivo (e por quê)",
        p: [
          "Apenas o chat com IA, quando ativo. Sua mensagem vai para a API da OpenAI (gpt-4o-mini). Se você usa BYOK (sua chave), você é a conta cobrada. Se usa Plus, a chamada passa pelos nossos servidores antes de ir pra OpenAI — mas o histórico não é armazenado.",
          "E-mail, se você se inscrever na newsletter ou waitlist — usado só pra te avisar de updates do produto.",
        ],
      },
      {
        h: "Base legal (LGPD)",
        p: [
          "Coleta com base em consentimento (newsletter, waitlist) e execução de contrato (uso do app). Você pode pedir exclusão a qualquer momento por oi@meumascote.app — respondemos em 7 dias úteis.",
        ],
      },
      {
        h: "Crianças e adolescentes",
        p: [
          "Mascote é 16+. A gente confirma idade na entrada. Não direcionamos publicidade a menores, não coletamos dado de menores sabidamente. Se você é responsável e detectou uso por menor, escreva oi@meumascote.app e a gente apaga.",
        ],
      },
      {
        h: "Cookies",
        p: [
          "Só funcionais: lembrar idioma, tema e estado da newsletter. Se ativarmos analytics no futuro (GA4 ou Plausible), você verá um banner pedindo opt-in claro.",
        ],
      },
      {
        h: "Contato",
        p: ["Dúvida, pedido de exclusão, reclamação: oi@meumascote.app. Encarregado de proteção de dados: o mesmo e-mail (somos pequenos, sem rodeio)."],
      },
    ],
  },
  en: {
    kicker: "POLICY",
    title: "Privacy, in plain English.",
    updated: "Last updated · 2026-05-19",
    body: [
      {
        h: "The principle",
        p: [
          "Mascote is local-first. Most of what you do (check-ins, habits, customization, rewards) lives on your device. None of it leaves without your action.",
          "We don't sell data. We don't rent it. We don't share with ad networks. A serious promise — written here so we can be held to it.",
        ],
      },
      {
        h: "What stays on your device",
        p: [
          "Your name, approximate age, daily mood, habit streak, achievements, unlocked accessories, theme and palette settings. All in local AsyncStorage — never on a server.",
        ],
      },
      {
        h: "What leaves the device (and why)",
        p: [
          "Only the AI chat, when active. Your message goes to OpenAI (gpt-4o-mini). With BYOK (your own key) you pay OpenAI directly. With Plus, it routes through our servers — but history isn't stored.",
          "Email, if you join the newsletter or waitlist — used only to notify you about product updates.",
        ],
      },
      {
        h: "Legal basis",
        p: [
          "Consent (newsletter, waitlist) and contract execution (app usage). You can request deletion at any moment via oi@meumascote.app — answered within 7 working days.",
        ],
      },
      {
        h: "Children & teens",
        p: [
          "Mascote is 16+. We confirm age at onboarding. We don't target ads to minors, don't knowingly collect minor data. Guardians can request deletion at oi@meumascote.app.",
        ],
      },
      {
        h: "Cookies",
        p: [
          "Functional only: language, theme, newsletter state. If we ever turn on analytics (GA4 or Plausible), a clear opt-in banner will appear first.",
        ],
      },
      { h: "Contact", p: ["Questions, deletion, complaint: oi@meumascote.app."] },
    ],
  },
  es: {
    kicker: "POLÍTICA",
    title: "Privacidad, en español claro.",
    updated: "Actualizado · 19 · 05 · 2026",
    body: [
      {
        h: "El principio",
        p: [
          "Mascote es local-first. La mayor parte (check-ins, hábitos, personalización, recompensas) queda en tu dispositivo. Nada sale sin que lo pidas.",
          "No vendemos datos. No los alquilamos. No los compartimos con redes publicitarias. Promesa seria — escrita aquí para que nos exijan.",
        ],
      },
      {
        h: "Qué queda en tu dispositivo",
        p: [
          "Nombre, edad aproximada, ánimo diario, racha, logros, accesorios, configuración de tema y paleta. Todo en AsyncStorage local — nunca en servidor.",
        ],
      },
      {
        h: "Qué sale (y por qué)",
        p: [
          "Solo el chat IA, cuando activo. Tu mensaje va a OpenAI. Con BYOK pagas directamente a OpenAI. Con Plus, pasa por nuestros servidores — pero el historial no se guarda.",
          "Correo, si te unes a la newsletter o waitlist — solo para avisarte de novedades.",
        ],
      },
      {
        h: "Base legal",
        p: [
          "Consentimiento (newsletter, waitlist) y ejecución de contrato (uso de la app). Puedes pedir borrado en oi@meumascote.app — respondido en 7 días hábiles.",
        ],
      },
      {
        h: "Menores",
        p: [
          "Mascote es 16+. Confirmamos edad al entrar. No anunciamos a menores ni recopilamos sus datos a sabiendas.",
        ],
      },
      {
        h: "Cookies",
        p: ["Solo funcionales: idioma, tema, newsletter. Si activamos analítica, banner de opt-in primero."],
      },
      { h: "Contacto", p: ["Dudas o borrado: oi@meumascote.app."] },
    ],
  },
};

export default function PrivacyPage({ params }: { params: { lang: string } }) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const dict = getDictionary(lang);
  const c = content[lang];
  return (
    <LegalShell dict={dict} lang={lang} kicker={c.kicker} title={c.title} lastUpdated={c.updated}>
      {c.body.map((s) => (
        <section key={s.h}>
          <h2 className="font-serif text-2xl sm:text-3xl text-ink mb-3">{s.h}</h2>
          {s.p.map((p, i) => (
            <p key={i} className="mb-3">
              {p}
            </p>
          ))}
        </section>
      ))}
    </LegalShell>
  );
}
