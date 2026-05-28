import type { Dictionary, Locale } from "@/lib/i18n";
import { localeMeta } from "@/lib/i18n";
import { SITE } from "@/lib/site";

export function StructuredData({ dict, lang }: { dict: Dictionary; lang: Locale }) {
  const url = `${SITE.url}/${lang}`;
  const langTag = localeMeta[lang].htmlLang;

  const organization = {
    "@type": "Organization",
    "@id": `${SITE.url}#org`,
    name: "Mascote",
    url: SITE.url,
    logo: `${SITE.url}/favicon.svg`,
    sameAs: [SITE.social.instagram, SITE.social.tiktok, SITE.social.twitter, SITE.social.youtube],
    contactPoint: [
      { "@type": "ContactPoint", email: SITE.emailHello, contactType: "customer support", availableLanguage: ["pt-BR", "en", "es"] },
      { "@type": "ContactPoint", email: SITE.emailPress, contactType: "press" },
    ],
  };

  const website = {
    "@type": "WebSite",
    "@id": `${SITE.url}#website`,
    url: SITE.url,
    name: "Mascote",
    inLanguage: langTag,
    publisher: { "@id": `${SITE.url}#org` },
  };

  const softwareApplication = {
    "@type": "SoftwareApplication",
    "@id": `${SITE.url}#app`,
    name: "Mascote",
    operatingSystem: "iOS, Android",
    applicationCategory: "LifestyleApplication",
    description: dict.meta.description,
    inLanguage: ["pt-BR", "en", "es"],
    offers: [
      {
        "@type": "Offer",
        name: dict.pricing.plans[0].name,
        price: "0",
        priceCurrency: lang === "pt" ? "BRL" : "USD",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: dict.pricing.plans[1].name,
        price: lang === "pt" ? "19.90" : "5.99",
        priceCurrency: lang === "pt" ? "BRL" : "USD",
        availability: "https://schema.org/PreOrder",
      },
    ],
    creator: { "@id": `${SITE.url}#org` },
  };

  const faqPage = {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    mainEntity: dict.faq.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Mascote", item: SITE.url },
      { "@type": "ListItem", position: 2, name: localeMeta[lang].label, item: url },
    ],
  };

  const graph = {
    "@context": "https://schema.org",
    "@graph": [organization, website, softwareApplication, faqPage, breadcrumb],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
