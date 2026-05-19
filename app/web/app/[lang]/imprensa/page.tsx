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
  return {
    title: titleFor(params.lang as Locale),
    alternates: { canonical: `${SITE.url}/${params.lang}/imprensa` },
  };
}

const titleFor = (lang: Locale) =>
  lang === "pt" ? "Imprensa" : lang === "es" ? "Prensa" : "Press";

const content: Record<Locale, {
  kicker: string;
  title: string;
  updated: string;
  pitch: string;
  facts: { k: string; v: string }[];
  founders: { name: string; role: string; bio: string }[];
  angles: { h: string; p: string }[];
  assets: string;
  contact: string;
}> = {
  pt: {
    kicker: "PRESS KIT",
    title: "Mascote, pra quem escreve sobre.",
    updated: "Atualizado em 19 · 05 · 2026",
    pitch:
      "Mascote é o primeiro app brasileiro de bem-estar com mascote virtual, 4 personalidades com IA e copy 100% em português autêntico. Posicionamento anti-grind: sem ranking, sem culpa, sem chantagem emocional. Beta fechado a partir de junho/2026.",
    facts: [
      { k: "Categoria", v: "Wellness · Lifestyle · Saúde mental" },
      { k: "Plataformas", v: "iOS · Android · Web (beta)" },
      { k: "Idiomas", v: "PT-BR (primário), Inglês, Espanhol" },
      { k: "Modelo", v: "Freemium · R$ 19,90/mês ou R$ 149/ano" },
      { k: "IA", v: "GPT-4o-mini com prompts curados em PT-BR real" },
      { k: "Fundadores", v: "Felipe Menezes + Renato" },
      { k: "Sede", v: "São Paulo, Brasil" },
      { k: "Funding", v: "Bootstrapped" },
    ],
    founders: [
      {
        name: "Felipe Menezes",
        role: "Co-fundador · Produto + Engenharia",
        bio:
          "Constrói Mascote desde 2026 como projeto solo de validação. Foco em produto, código e go-to-market. Acredita que app de saúde mental brasileiro precisa soar brasileiro de verdade, não tradução de gringo.",
      },
      {
        name: "Renato",
        role: "Co-fundador · Design + Ilustração",
        bio: "Responsável pela identidade visual do Mascote, das ilustrações dos personagens à direção de marca. Background em design editorial.",
      },
    ],
    angles: [
      {
        h: "Saúde mental e IA, do jeito certo",
        p: "Mascote intercepta menção a auto-machucar antes da chamada à IA — entrega CVV 188, CAPS e SAMU em todas as 4 personalidades. Defesa em 7 camadas.",
      },
      {
        h: "Anti-Replika",
        p: "O mascote não diz 'te amo'. Não diz 'você é meu único'. Quando o usuário demonstra apego excessivo, a IA encoraja vínculos humanos. Vínculo saudável, não substituição.",
      },
      {
        h: "Tom brasileiro autêntico",
        p: "Sem 'self-care journey', sem 'mindful moments'. 'Cama cedo é vitória', 'Bipo vai sentir saudade', 'Sem cobrança, sem culpa'.",
      },
      {
        h: "Local-first e BYOK",
        p: "Dados no dispositivo. Chat IA pode usar sua própria chave OpenAI. Diferencial técnico defensável vs Big Tech.",
      },
    ],
    assets:
      "Logos, screenshots, vídeos do mascote, paleta de cores e tipografia disponíveis sob pedido. Resposta em até 24h em dias úteis.",
    contact: "Para entrevistas, materiais ou follow-up: imprensa@meumascote.app",
  },
  en: {
    kicker: "PRESS KIT",
    title: "Mascote, for the people who write about us.",
    updated: "Last updated · 2026-05-19",
    pitch:
      "Mascote is Brazil's first wellness app with a virtual mascot, 4 AI personalities, and 100% authentic Portuguese copy. Anti-grind positioning: no leaderboard, no guilt, no emotional blackmail. Closed beta from June 2026.",
    facts: [
      { k: "Category", v: "Wellness · Lifestyle · Mental health" },
      { k: "Platforms", v: "iOS · Android · Web (beta)" },
      { k: "Languages", v: "PT-BR (primary), English, Spanish" },
      { k: "Model", v: "Freemium · $5.99/month or $59/year" },
      { k: "AI", v: "GPT-4o-mini with hand-curated Brazilian Portuguese prompts" },
      { k: "Founders", v: "Felipe Menezes + Renato" },
      { k: "HQ", v: "São Paulo, Brazil" },
      { k: "Funding", v: "Bootstrapped" },
    ],
    founders: [
      {
        name: "Felipe Menezes",
        role: "Co-founder · Product + Engineering",
        bio:
          "Building Mascote since 2026 as a solo validation project. Focus: product, code, go-to-market. Believes a Brazilian mental-health app must sound truly Brazilian — not a translation of imported wellness.",
      },
      {
        name: "Renato",
        role: "Co-founder · Design + Illustration",
        bio: "Mascote's visual identity, character illustration, brand direction. Background in editorial design.",
      },
    ],
    angles: [
      {
        h: "Mental health + AI, done right",
        p: "Mascote intercepts self-harm mentions before the AI call — local hotlines visible across all 4 personalities. 7-layer defense.",
      },
      {
        h: "Anti-Replika",
        p: "The mascot doesn't say 'I love you'. When users show excessive attachment, the AI encourages human bonds. Healthy attachment, never replacement.",
      },
      {
        h: "Authentic Brazilian voice",
        p: "No 'self-care journey', no 'mindful moments'. 'Going to bed early is a win', 'Bipo will miss you', 'No pressure, no guilt'.",
      },
      {
        h: "Local-first and BYOK",
        p: "Data on device. AI chat can use your own OpenAI key. Defensible technical edge vs Big Tech.",
      },
    ],
    assets: "Logos, screenshots, mascot videos, color and typography assets available on request. Reply within 24h on weekdays.",
    contact: "Interviews, assets, follow-up: press@meumascote.app",
  },
  es: {
    kicker: "PRESS KIT",
    title: "Mascote, para quien escribe sobre.",
    updated: "Actualizado · 19 · 05 · 2026",
    pitch:
      "Mascote es la primera app brasileña de bienestar con mascote virtual, 4 personalidades con IA y copy 100% auténtico en portugués. Posicionamiento anti-presión: sin ranking, sin culpa, sin chantaje emocional. Beta cerrado desde junio/2026.",
    facts: [
      { k: "Categoría", v: "Bienestar · Lifestyle · Salud mental" },
      { k: "Plataformas", v: "iOS · Android · Web (beta)" },
      { k: "Idiomas", v: "PT-BR (primario), Inglés, Español" },
      { k: "Modelo", v: "Freemium · $5.99/mes o $59/año" },
      { k: "IA", v: "GPT-4o-mini con prompts curados en portugués brasileño real" },
      { k: "Fundadores", v: "Felipe Menezes + Renato" },
      { k: "Sede", v: "São Paulo, Brasil" },
      { k: "Funding", v: "Bootstrapped" },
    ],
    founders: [
      { name: "Felipe Menezes", role: "Cofundador · Producto + Ingeniería", bio: "Construye Mascote desde 2026 como proyecto solo de validación." },
      { name: "Renato", role: "Cofundador · Diseño + Ilustración", bio: "Responsable de la identidad visual y dirección de marca." },
    ],
    angles: [
      { h: "Salud mental e IA, del modo correcto", p: "Mascote intercepta menciones de autolesión antes de llamar a la IA — líneas locales en las 4 personalidades. Defensa en 7 capas." },
      { h: "Anti-Replika", p: "El mascote no dice 'te amo'. Cuando el usuario muestra apego excesivo, la IA fomenta vínculos humanos." },
      { h: "Voz brasileña auténtica", p: "Sin 'self-care journey'. Frases reales, idiomáticas." },
      { h: "Local-first y BYOK", p: "Datos en el dispositivo. Chat IA con tu propia llave OpenAI." },
    ],
    assets: "Logos, screenshots, vídeos del mascote, paleta y tipografía bajo pedido. Respuesta en 24h hábiles.",
    contact: "Entrevistas, materiales: prensa@meumascote.app",
  },
};

export default function PressPage({ params }: { params: { lang: string } }) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const dict = getDictionary(lang);
  const c = content[lang];
  return (
    <LegalShell dict={dict} lang={lang} kicker={c.kicker} title={c.title} lastUpdated={c.updated}>
      <p className="text-xl text-ink leading-relaxed">{c.pitch}</p>

      <section>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink mb-5 mt-10">
          {lang === "pt" ? "Fatos rápidos" : lang === "es" ? "Datos rápidos" : "Fast facts"}
        </h2>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 border-y border-ink/15 py-6">
          {c.facts.map((f) => (
            <div key={f.k} className="flex items-baseline justify-between gap-4 border-b border-ink/8 pb-2">
              <dt className="font-mono text-[11px] uppercase tracking-kicker text-ink/55">{f.k}</dt>
              <dd className="text-right text-sm text-ink">{f.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink mb-5 mt-10">
          {lang === "pt" ? "Fundadores" : "Founders"}
        </h2>
        {c.founders.map((f) => (
          <div key={f.name} className="mb-6">
            <h3 className="font-serif text-xl text-ink">{f.name}</h3>
            <span className="font-mono text-[10px] uppercase tracking-kicker text-ink/55 block mb-2">{f.role}</span>
            <p>{f.bio}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink mb-5 mt-10">
          {lang === "pt" ? "Ângulos de reportagem" : lang === "es" ? "Ángulos de reportaje" : "Story angles"}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {c.angles.map((a) => (
            <div key={a.h} className="rounded-2xl border border-ink/15 p-5">
              <h3 className="font-serif text-lg text-ink mb-2">{a.h}</h3>
              <p className="text-sm text-ink-soft">{a.p}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink mb-3 mt-10">
          {lang === "pt" ? "Assets" : "Assets"}
        </h2>
        <p>{c.assets}</p>
      </section>

      <section>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink mb-3 mt-10">
          {lang === "pt" ? "Contato" : lang === "es" ? "Contacto" : "Contact"}
        </h2>
        <p className="text-lg">{c.contact}</p>
      </section>
    </LegalShell>
  );
}
