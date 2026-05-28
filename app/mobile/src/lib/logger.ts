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
 * Defesa em profundidade contra vazamento de segredo:
 *   TODO valor que passa por `dev/warn/error` é processado por `redactSecrets`
 *   antes de ir pra console ou sink. Strings com `sk-...`, `Bearer ...`,
 *   `Authorization: ...`, e objetos com chaves sensíveis (`token`, `password`,
 *   `api_key` etc) são mascarados automaticamente. Inclui `Error.message` e
 *   `Error.stack` — gates do PENTEST 3.
 *
 *   Isso é defesa em profundidade. Callers ainda devem evitar passar Request/
 *   Response inteiros — mas se acontecer, o redactor catch.
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

// ============================================================================
// Sanitização de segredos
// ============================================================================

/**
 * Padrões em strings que devem ser mascarados (case-insensitive onde relevante).
 *
 * Ordem importa quando padrões se sobrepõem: Bearer/sk- vêm antes de
 * Authorization pra que "Bearer sk-XXX" seja redigido primeiro, evitando
 * dupla-redação que produziria "[REDACTED] [REDACTED]".
 */
const SECRET_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  // OpenAI/Anthropic/genéricas sk- (cobre sk-, sk-proj-, sk-ant-, sk-svcacct-, etc).
  [/sk-(?:[a-z]+-)*[A-Za-z0-9_-]{16,}/g, 'sk-[REDACTED]'],
  // Stripe / RevenueCat-like: pk_test_, rk_live_, whsec_test_, sk_live_ etc.
  [/\b(?:pk|rk|sk|whsec)_(?:test|live)_[A-Za-z0-9_-]{16,}/g, '[REDACTED_KEY]'],
  // Bearer tokens (Authorization header). Não consome whitespace de fim.
  [/\bBearer\s+[A-Za-z0-9._\-+/=]+/gi, 'Bearer [REDACTED]'],
  // Authorization: <value> ou Authorization=<value> (Request stringified, headers map).
  // Lookahead evita re-redigir um "[REDACTED]" já posto.
  [/(authorization\s*[:=]\s*)["']?(?!\[REDACTED)[^\s,;}\]"']+/gi, '$1[REDACTED]'],
];

/** Chaves de objeto cujo VALOR inteiro deve ser substituído por [REDACTED]. */
const SECRET_KEYS: ReadonlySet<string> = new Set([
  'api_key', 'apikey',
  'access_token', 'accesstoken',
  'refresh_token', 'refreshtoken',
  'token', 'auth_token', 'authtoken',
  'secret', 'client_secret', 'clientsecret',
  'password', 'passwd', 'pwd',
  'private_key', 'privatekey',
  'authorization',
  'cookie', 'set-cookie',
  'openai_key', 'openaikey',
]);

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

function redactString(s: string): string {
  let out = s;
  for (const [re, rep] of SECRET_PATTERNS) {
    out = out.replace(re, rep);
  }
  return out;
}

function isSecretKey(key: string): boolean {
  return SECRET_KEYS.has(key.toLowerCase());
}

/**
 * Sanitiza recursivamente qualquer valor antes de chegar em console/sink.
 *
 * - Strings: regex de patterns conhecidos.
 * - Objetos: keys sensíveis viram `[REDACTED]`, demais valores são processados
 *   recursivamente.
 * - Arrays: cada elemento é processado.
 * - `Error`: `.message` e `.stack` redigidos; retorna objeto plain pra
 *   serialização consistente (sink JSON.stringify-friendly).
 * - Primitivos (number, boolean, null, undefined, bigint): retornados inalterados.
 * - Function/symbol: convertidos pra string segura.
 * - Profundidade limitada (`MAX_DEPTH=6`) — protege contra grafos profundos
 *   e refs circulares (que aqui são tratados como cutoff).
 */
export function redactSecrets(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[MAX_DEPTH]';

  if (value === null || value === undefined) return value;

  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'function' || typeof value === 'symbol') {
    return String(value);
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined,
    };
  }

  if (Array.isArray(value)) {
    return value.map(v => redactSecrets(v, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSecretKey(k) ? REDACTED : redactSecrets(v, depth + 1);
    }
    return out;
  }

  return value;
}

// ============================================================================
// API pública
// ============================================================================

export const logger = {
  dev(...args: unknown[]): void {
    if (!isDev()) return;
    const safe = args.map(a => redactSecrets(a));
    // eslint-disable-next-line no-console
    console.log('[dev]', ...safe);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    const safeMsg = redactString(message);
    const safeCtx = context
      ? (redactSecrets(context) as Record<string, unknown>)
      : context;
    if (isDev()) {
      // eslint-disable-next-line no-console
      console.warn(safeMsg, safeCtx);
    }
    sink?.capture('warn', safeMsg, safeCtx);
  },
  error(message: string, context?: Record<string, unknown>): void {
    const safeMsg = redactString(message);
    const safeCtx = context
      ? (redactSecrets(context) as Record<string, unknown>)
      : context;
    if (isDev()) {
      // eslint-disable-next-line no-console
      console.error(safeMsg, safeCtx);
    }
    sink?.capture('error', safeMsg, safeCtx);
  },
};
