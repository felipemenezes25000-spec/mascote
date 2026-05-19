import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { SITE } from "@/lib/site";

const sections = ["privacidade", "termos", "seguranca", "imprensa"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const lang of locales) {
    entries.push({
      url: `${SITE.url}/${lang}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [
            l === "pt" ? "pt-BR" : l,
            `${SITE.url}/${l}`,
          ]),
        ),
      },
    });
    for (const s of sections) {
      entries.push({
        url: `${SITE.url}/${lang}/${s}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.4,
      });
    }
  }
  return entries;
}
