// Source-of-truth dos locales suportados. Mantido em módulo separado
// (sem deps de JSON) pra ser importável do middleware sem inflar o bundle
// do Edge com os dicionários inteiros.

export const locales = ["pt", "en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
