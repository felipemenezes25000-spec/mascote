/**
 * Telemetria respeitando consentimento.
 *
 * Antes desse arquivo, `settings.consent_analytics` era toggle fantasma: salvo
 * no DB e nunca lido. Agora é a chave que liga/desliga o sink real.
 *
 * Hoje o sink é um stub `console.warn` em DEV. Para integrar Sentry/Logflare,
 * troque `consoleSink` pelo `Sentry.captureMessage` mantendo a mesma
 * interface — `setLogSink` em logger.ts já espera `LogSink`.
 *
 * Garantia: se `consent_analytics === false`, NENHUM evento sai do device.
 * `installTelemetry` é idempotente — chamar várias vezes não cria sinks
 * duplicados.
 */

import { logger, setLogSink, type LogSink } from '@/lib/logger';

interface ConsentSource {
  isConsented(): boolean;
}

const consoleSink: LogSink = {
  capture(level, message, context) {
    // Em prod (com `transform-remove-console`), só `error` sobrevive.
    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error('[telemetry]', message, context);
    } else {
      // eslint-disable-next-line no-console
      console.warn('[telemetry]', message, context);
    }
  },
};

class ConsentGatedSink implements LogSink {
  constructor(private consent: ConsentSource, private inner: LogSink) {}
  capture(level: Parameters<LogSink['capture']>[0], message: string, context?: Record<string, unknown>): void {
    if (!this.consent.isConsented()) return;
    this.inner.capture(level, message, context);
  }
}

let installed = false;

export function installTelemetry(opts: {
  isConsented: () => boolean;
  /** Sink customizado (ex: Sentry). Sem isso, usa stub console. */
  sink?: LogSink;
}): void {
  if (installed) return;
  installed = true;
  const gated = new ConsentGatedSink({ isConsented: opts.isConsented }, opts.sink ?? consoleSink);
  setLogSink(gated);
}

/** Apenas para testes — reseta para permitir nova chamada de installTelemetry. */
export function __resetTelemetry(): void {
  installed = false;
  setLogSink(null);
}

/**
 * Conveniência: captura evento de produto. Não passa pela camada `logger.warn/error`
 * (que é semântica de erro). Use isso pra "user clicked X", "screen viewed Y".
 *
 * Mantido leve a propósito: 99% dos eventos de produto devem morrer no consoleSink
 * em DEV, e em PROD só passam quando o usuário consentiu.
 */
export function trackEvent(name: string, props?: Record<string, unknown>): void {
  logger.warn(`[event] ${name}`, props);
}
