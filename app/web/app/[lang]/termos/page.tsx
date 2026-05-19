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
    alternates: { canonical: `${SITE.url}/${params.lang}/termos` },
  };
}

const titleFor = (lang: Locale) =>
  lang === "pt" ? "Termos" : lang === "es" ? "Términos" : "Terms";

const content: Record<Locale, { kicker: string; title: string; updated: string; body: { h: string; p: string[] }[] }> = {
  pt: {
    kicker: "USO ACEITÁVEL",
    title: "Termos. Sem juridiquês.",
    updated: "Atualizado em 19 · 05 · 2026",
    body: [
      {
        h: "O contrato em uma frase",
        p: ["Você usa o Mascote pra cuidar de si. A gente entrega o app, mantém seguro, e cobra honesto quando você assinar."],
      },
      {
        h: "Quem pode usar",
        p: ["Maiores de 16 anos. A gente confirma na entrada. Se você é menor, espera um pouco — o app não vai sumir."],
      },
      {
        h: "O que você não pode fazer",
        p: [
          "Tentar comprometer a segurança do app, copiar a marca pra produto similar, usar a IA pra produzir conteúdo que viole leis brasileiras ou direitos de terceiros. Padrão.",
        ],
      },
      {
        h: "Assinatura Plus",
        p: [
          "R$ 19,90/mês ou R$ 149/ano. 7 dias grátis no início (cobramos cartão pra reduzir fraude, mas zero cobrança nos 7 dias).",
          "Cancele em 1 toque, direto nas configurações da App Store ou Google Play. Sem dark pattern. Período pago vale até o fim do ciclo. Reembolso manual nos 7 primeiros dias do mensal/anual se pedir.",
        ],
      },
      {
        h: "Mascote não é terapia",
        p: [
          "Bem-estar e autocuidado, não diagnóstico, não prescrição, não substitui acompanhamento profissional. Em crise: CVV 188, CAPS local, SAMU 192. O app ajuda — não substitui.",
        ],
      },
      {
        h: "Mudanças nestes termos",
        p: ["Se mudarmos algo material, avisamos por e-mail e in-app. Continuar usando após o aviso = aceitação."],
      },
      {
        h: "Foro",
        p: ["Brasil, foro da comarca de São Paulo/SP. Mas dúvida resolve melhor por e-mail (oi@meumascote.app)."],
      },
    ],
  },
  en: {
    kicker: "ACCEPTABLE USE",
    title: "Terms. No legalese.",
    updated: "Last updated · 2026-05-19",
    body: [
      {
        h: "The contract in one sentence",
        p: ["You use Mascote to care for yourself. We deliver the app, keep it safe, and charge honestly when you subscribe."],
      },
      { h: "Who can use it", p: ["16+. We confirm at onboarding. If you're younger, wait — the app isn't going anywhere."] },
      {
        h: "What you can't do",
        p: [
          "Try to compromise app security, clone the brand for a similar product, use AI to produce content that breaks laws or third-party rights. Standard stuff.",
        ],
      },
      {
        h: "Plus subscription",
        p: [
          "$5.99/month or $59/year. 7 days free at start (card required to reduce fraud, zero charge during the trial).",
          "Cancel in one tap from your store settings. No dark patterns. Paid period valid until end of cycle. Manual refund available within first 7 days if requested.",
        ],
      },
      {
        h: "Mascote is not therapy",
        p: [
          "Wellness and self-care, not diagnosis, not prescription, not a substitute for professional support. In crisis, dial your local hotline. The app helps — it doesn't replace.",
        ],
      },
      { h: "Changes", p: ["If something material changes, we email and notify in-app. Continued use after notice = acceptance."] },
      { h: "Jurisdiction", p: ["Brazil, São Paulo/SP venue. But questions resolve faster by email (hi@meumascote.app)."] },
    ],
  },
  es: {
    kicker: "USO ACEPTABLE",
    title: "Términos. Sin tecnicismos.",
    updated: "Actualizado · 19 · 05 · 2026",
    body: [
      {
        h: "El contrato en una frase",
        p: ["Usas Mascote para cuidarte. Nosotros entregamos la app, la mantenemos segura y cobramos honesto al suscribir."],
      },
      { h: "Quién puede usarla", p: ["16+. Confirmamos al entrar. Si eres menor, espera — la app no se va."] },
      {
        h: "Qué no puedes hacer",
        p: ["Comprometer seguridad, copiar la marca, usar IA para contenido ilegal o que vulnere derechos. Lo estándar."],
      },
      {
        h: "Suscripción Plus",
        p: [
          "$5.99/mes o $59/año. 7 días gratis al inicio (tarjeta requerida para reducir fraude, cero cargo en los 7 días).",
          "Cancela en un toque desde los ajustes de la tienda. Sin dark patterns. Periodo pagado válido hasta fin de ciclo. Reembolso manual en los primeros 7 días si se pide.",
        ],
      },
      {
        h: "Mascote no es terapia",
        p: ["Bienestar y autocuidado, no diagnóstico, no prescripción, no sustituye apoyo profesional. En crisis, líneas locales."],
      },
      { h: "Cambios", p: ["Si algo material cambia, te avisamos por correo e in-app. Continuar usando = aceptar."] },
      { h: "Jurisdicción", p: ["Brasil, foro de São Paulo/SP. Dudas se resuelven mejor por correo (hola@meumascote.app)."] },
    ],
  },
};

export default function TermsPage({ params }: { params: { lang: string } }) {
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
