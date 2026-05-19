import "../globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Instrument_Serif, Plus_Jakarta_Sans, Quicksand, JetBrains_Mono } from "next/font/google";
import { getDictionary, isLocale, locales, localeMeta, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";
import { StructuredData } from "@/components/StructuredData";
import { Analytics } from "@/components/Analytics";
import { ThemeBoot } from "@/components/ThemeBoot";

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});
const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF6F1" },
    { media: "(prefers-color-scheme: dark)", color: "#1F1A14" },
  ],
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  if (!isLocale(params.lang)) return {};
  const lang = params.lang as Locale;
  const dict = getDictionary(lang);
  const url = `${SITE.url}/${lang}`;
  return {
    metadataBase: new URL(SITE.url),
    title: { default: dict.meta.title, template: "%s · Mascote" },
    description: dict.meta.description,
    applicationName: "Mascote",
    authors: [{ name: "Mascote", url: SITE.url }],
    creator: "Mascote",
    publisher: "Mascote",
    keywords:
      lang === "pt"
        ? ["app de bem-estar", "autocuidado", "mascote virtual", "tamagotchi adulto", "hábitos saudáveis", "anti-grind", "saúde mental Brasil", "alternativa Replika"]
        : lang === "es"
          ? ["app bienestar", "autocuidado", "mascote virtual", "hábitos saludables", "alternativa Replika"]
          : ["wellness app", "self-care", "virtual companion", "adult tamagotchi", "healthy habits", "anti-grind", "Replika alternative"],
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(locales.map((l) => [localeMeta[l].htmlLang, `${SITE.url}/${l}`])),
        "x-default": `${SITE.url}/pt`,
      },
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    openGraph: {
      type: "website",
      url,
      siteName: "Mascote",
      title: dict.meta.title,
      description: dict.meta.description,
      locale: localeMeta[lang].htmlLang,
      alternateLocale: locales.filter((l) => l !== lang).map((l) => localeMeta[l].htmlLang),
      images: [
        {
          url: `${SITE.url}/${lang}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: dict.meta.ogAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
      site: SITE.twitter,
      creator: SITE.twitter,
      images: [`${SITE.url}/${lang}/opengraph-image`],
    },
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/favicon.svg" }],
    },
    manifest: "/manifest.webmanifest",
    category: "lifestyle",
  };
}

export default function LangRootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { lang: string };
}) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang as Locale;
  const dict = getDictionary(lang);
  return (
    <html
      lang={localeMeta[lang].htmlLang}
      data-theme="light"
      className={`${instrument.variable} ${jakarta.variable} ${quicksand.variable} ${jetbrains.variable}`}
    >
      <head>
        <ThemeBoot />
        <StructuredData dict={dict} lang={lang} />
      </head>
      <body className="bg-cream text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink focus:text-cream focus:px-4 focus:py-2 focus:rounded-full focus:text-sm focus:shadow-lg"
        >
          {lang === "pt" ? "Pular para o conteúdo" : lang === "es" ? "Saltar al contenido" : "Skip to content"}
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
