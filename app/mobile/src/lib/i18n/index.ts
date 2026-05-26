/**
 * i18n entrypoint — helper `t()`, Provider, hook.
 *
 * Design:
 *   - Source of truth: PT-BR em `atelier-strings.ts`.
 *   - Fallback chain: locale ativo → 'pt' → key literal.
 *   - Lookup por dotted path: t('atelier.header.title') → "Ateliê".
 *   - Funções (subtitle_count(n)) recebem args via t(key, args...).
 *
 * Por que NÃO i18next/lingui/etc:
 *   - Bundle size; setup; lifecycle. Nosso scope é só PT/EN no MVP.
 *   - Helper local mantém deterministc + simples + tipado.
 *
 * Locale detection:
 *   - LocaleProvider aceita override explícito (boot pode passar do device).
 *   - Default = 'pt' (audiência primária do produto).
 *
 * Test mode:
 *   - Em tests, o provider default pode ser instanciado direto via
 *     `setLocale('en')` sem React tree.
 */

import { createContext, createElement, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { STRINGS_PT, type StringsBundle } from './atelier-strings';
import { STRINGS_EN } from './atelier-strings-en';

export type Locale = 'pt' | 'en';

const STRINGS_BY_LOCALE: Record<Locale, StringsBundle> = {
  pt: STRINGS_PT,
  en: STRINGS_EN,
};

const DEFAULT_LOCALE: Locale = 'pt';

// Estado global mínimo pro modo "imperativo" (tests, scripts).
let currentLocale: Locale = DEFAULT_LOCALE;

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Lookup por dotted path. Aceita args opcionais se o leaf for função.
 *
 * Exemplos:
 *   t('atelier.header.title')                       → "Ateliê"
 *   t('atelier.sections.mutations_active.subtitle_count', 3) → "3 desbloqueadas — afetando o preview"
 *
 * Se a key não existir no locale ativo, cai pra PT-BR. Se nem lá existir,
 * devolve a key literal (debug-friendly em vez de quebrar UI).
 */
export function t(path: string, ...args: unknown[]): string {
  const locale = currentLocale;
  const fromLocale = lookup(STRINGS_BY_LOCALE[locale], path);
  const resolved = fromLocale ?? lookup(STRINGS_BY_LOCALE.pt, path);
  if (resolved === undefined || resolved === null) {
    return path;
  }
  if (typeof resolved === 'function') {
    try {
      const out = (resolved as (...a: unknown[]) => unknown)(...args);
      return typeof out === 'string' ? out : String(out);
    } catch {
      return path;
    }
  }
  if (typeof resolved === 'string') return resolved;
  // Objeto/array intermediário: caller passou path incompleto.
  return path;
}

function lookup(root: unknown, path: string): unknown {
  if (!root || typeof root !== 'object') return undefined;
  const parts = path.split('.');
  let cur: unknown = root;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

// ───── React provider (opcional, pra futuro reativo) ─────

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: typeof t;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export interface LocaleProviderProps {
  initialLocale?: Locale;
  children: ReactNode;
}

export function LocaleProvider({ initialLocale, children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

  const handleSetLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    setLocale(l); // sync global pra imports diretos de `t`
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: handleSetLocale,
      t,
    }),
    [locale, handleSetLocale],
  );

  // Sync no mount caso initialLocale != default
  if (currentLocale !== locale) {
    setLocale(locale);
  }

  // O LocaleProvider intencionalmente não usa JSX (evita .tsx aqui).
  return createElement(LocaleContext.Provider, { value }, children);
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  // Fallback: callers fora do provider ainda funcionam (modo imperativo).
  return {
    locale: currentLocale,
    setLocale,
    t,
  };
}

export { STRINGS_PT, STRINGS_EN };
