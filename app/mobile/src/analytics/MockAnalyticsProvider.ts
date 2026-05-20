/**
 * MockAnalyticsProvider — in-memory ring buffer.
 *
 * Útil em dev/test pra inspecionar fluxo sem rede. NÃO usado em produção
 * silenciosamente — produção precisa de provider real configurado via env.
 *
 * Limit: 256 eventos mantidos em ring buffer. Suficiente pra debugar uma
 * sessão; previne leak em runs longos.
 */

import type { AnalyticsProvider } from './AnalyticsProvider';
import type { AnalyticsEventName, AnalyticsEventPayload } from './AnalyticsEvents';

interface BufferedEvent {
  event: AnalyticsEventName;
  props: Record<string, unknown>;
  ts: number;
}

export class MockAnalyticsProvider implements AnalyticsProvider {
  private buffer: BufferedEvent[] = [];
  private userIdHash: string | null = null;
  private static MAX = 256;

  track<K extends AnalyticsEventName>(
    event: K,
    props: AnalyticsEventPayload[K] & { user_id_hash?: string; ts: number },
  ): void {
    this.buffer.push({
      event,
      props: { ...props },
      ts: props.ts,
    });
    if (this.buffer.length > MockAnalyticsProvider.MAX) {
      this.buffer.shift();
    }
  }

  identify(userIdHash: string): void {
    this.userIdHash = userIdHash;
  }

  reset(): void {
    this.buffer = [];
    this.userIdHash = null;
  }

  /** Apenas para testes / debug — não exposto publicamente em produção. */
  __getBuffer(): readonly BufferedEvent[] {
    return this.buffer.slice();
  }

  __getUserIdHash(): string | null {
    return this.userIdHash;
  }
}

export const mockAnalyticsProvider = new MockAnalyticsProvider();
