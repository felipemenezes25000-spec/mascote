import pt from "@/messages/pt.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";

export const locales = ["pt", "en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt";

const dictionaries = { pt, en, es } as const;

export type Dictionary = typeof pt;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const localeMeta: Record<Locale, { label: string; flag: string; htmlLang: string }> = {
  pt: { label: "Português", flag: "BR", htmlLang: "pt-BR" },
  en: { label: "English", flag: "EN", htmlLang: "en" },
  es: { label: "Español", flag: "ES", htmlLang: "es" },
};
