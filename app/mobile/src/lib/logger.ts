/**
 * Logger fino que respeita `__DEV__` e consentimento de analytics.
 *
 * Por que existir:
 * - `console.log` em produção vaza dados em Logcat/Flipper/Console do device.
 * - Queremos um único ponto pra desligar todos os logs em release (e/ou
 *   plugar Sentry / Logflare no futuro atrás de `consent_analytics`).
 *
 * Filosofia:
 * - `dev(...)`  → só em __DEV__, jamais em release.
 * - `warn(...)` → console.warn em DEV, encaminhado para sink se houver.
 * - `error(...)` → idem warn, mas severidade maior.
 *
 * NUNCA passe objetos completos de fetch/Response/Request: eles podem conter
 * o header `Authorization`. Passe apenas strings explícitas.
 */

type Level = 'dev' | 'warn' | 'error';

export interface LogSink {
  capture(level: Level, message: string, context?: Record<string, unknown>): void;
}

let sink: LogSink | null = null;

export function setLogSink(s: LogSink | null): void {
  sink = s;
}

declare const __DEV__: boolean | undefined;
function isDev(): boolean {
  // NODE_ENV=production sempre silencia, independente de __DEV__ — o gate de
  // produção precisa ser inviolável. Caso contrário (dev ou teste), aceita
  // __DEV__ se definido, ou cai pro padrão `true`.
  if (process?.env?.NODE_ENV === 'production') return false;
  /* v8 ignore next — __DEV__ default `true` é injetado pelo Metro bundler;
     no ambiente de teste (Node + vitest) o setup.ts seta explicitamente. */
  return typeof __DEV__ !== 'undefined' ? !!__DEV__ : true;
}

export const logger = {
  dev(...args: unknown[]): void {
    if (!isDev()) return;
    // eslint-disable-next-line no-console
    console.log('[dev]', ...args);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    if (isDev()) {
      // eslint-disable-next-line no-console
      console.warn(message, context);
    }
    sink?.capture('warn', message, context);
  },
  error(message: string, context?: Record<string, unknown>): void {
    if (isDev()) {
      // eslint-disable-next-line no-console
      console.error(message, context);
    }
    sink?.capture('error', message, context);
  },
};
