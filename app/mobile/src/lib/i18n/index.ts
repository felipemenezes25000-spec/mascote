/**
 * i18n entrypoint — helper t(), Provider, hook.
 *
 * Design:
 *   - Source of truth: PT-BR em atelier-strings.ts.
 *   - Fallback chain: locale ativo -> 'pt' -> key literal.
 *   - Lookup por dotted path: t('atelier.header.title').
 *   - Funcoes (subtitle_count(n)) recebem args via t(key, args...).
 *
 * Por que NAO i18next/lingui/etc:
 *   - Bundle size; setup; lifecycle. Nosso scope eh so PT/EN no MVP.
 *   - Helper local mantem deterministic + simples + tipado.
 *
 * Test mode:
 *   - Em tests, callers podem chamar setLocale('en') sem React tree.
 */

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { STRINGS_PT, type StringsBundle } from './atelier-strings';
import { STRINGS_EN } from './atelier-strings-en';
import { STRINGS_ES } from './atelier-strings-es';

export type Locale = 'pt' | 'en' | 'es';

const STRINGS_BY_LOCALE: Record<Locale, StringsBundle> = {
  pt: STRINGS_PT,
  en: STRINGS_EN,
  es: STRINGS_ES,
};

const DEFAULT_LOCALE: Locale = 'pt';

let currentLocale: Locale = DEFAULT_LOCALE;

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(path: string, ...args: unknown[]): string {
  const fromLocale = lookup(STRINGS_BY_LOCALE[currentLocale], path);
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

// ----- React provider -----

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, ...args: unknown[]) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export interface LocaleProviderProps {
  initialLocale?: Locale;
  children: ReactNode;
}

export function LocaleProvider(props: LocaleProviderProps) {
  const { initialLocale, children } = props;
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

  const handleSetLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    setLocale(l);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale: handleSetLocale, t }),
    [locale, handleSetLocale],
  );

  // Side-effect (mutar `currentLocale` modulo-level) tem que sair do body do
  // render. Em Strict Mode roda 2x; em concurrent rendering pode dessincronizar
  // com outros providers/effects que tambem chamam setLocale.
  useEffect(() => {
    if (currentLocale !== locale) {
      setLocale(locale);
    }
  }, [locale]);

  return createElement(LocaleContext.Provider, { value }, children);
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return { locale: currentLocale, setLocale, t };
}

export { STRINGS_PT, STRINGS_EN, STRINGS_ES };
