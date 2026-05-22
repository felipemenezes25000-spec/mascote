/**
 * CreatureMomentService — bus central de moments do mascote.
 *
 * Padrão pub/sub minimal e tipado. Inscritos reagem em paralelo (Promise.all
 * via Promise.allSettled) e UM handler quebrar NUNCA bloqueia os outros.
 *
 * Uso:
 *   import { creatureMoments } from '@/lib/moments';
 *   creatureMoments.subscribe({ filter: ['habit.water'], handler: animate });
 *   creatureMoments.emit('habit.water', { intensity: 1 });
 *
 * **Quando usar:** quando uma ação do usuário deve disparar reação em ≥ 2
 * camadas (animação + analytics + memória, por exemplo). Não use pra evento
 * técnico (log de erro, etc).
 */

import type {
  Moment,
  MomentHandler,
  MomentName,
  MomentPayloads,
  MomentSubscription,
} from './types';
import { logger } from '@/lib/logger';

class CreatureMomentService {
  private subs: MomentSubscription[] = [];
  /** Ring buffer dos últimos N moments — útil pra debug em dev. */
  private recent: Moment[] = [];
  private static MAX_RECENT = 64;

  /**
   * Inscreve handler. Retorna unsubscribe function (padrão React/RxJS).
   */
  subscribe(sub: MomentSubscription): () => void {
    this.subs.push(sub);
    return () => {
      const idx = this.subs.indexOf(sub);
      if (idx >= 0) this.subs.splice(idx, 1);
    };
  }

  /**
   * Helper: inscreve um handler em UM moment específico (atalho comum).
   */
  on<K extends MomentName>(name: K, handler: (m: { name: K; payload: MomentPayloads[K]; ts: number }) => void | Promise<void>, label?: string): () => void {
    return this.subscribe({
      filter: [name],
      handler: handler as MomentHandler,
      label,
    });
  }

  /**
   * Emite um moment. Chama handlers compatíveis em paralelo via Promise.allSettled.
   * Retorna void síncrono — caller NÃO espera resolução pra continuar (essa é a
   * razão do bus existir: desacoplar).
   */
  emit<K extends MomentName>(name: K, payload: MomentPayloads[K]): void {
    const moment = { name, payload, ts: Date.now() } as Moment;
    this.pushRecent(moment);
    const targets = this.subs.filter(
      (s) => s.filter === null || s.filter.includes(name),
    );
    if (targets.length === 0) return;
    // Dispara em paralelo — handlers que lançam não param os outros.
    void Promise.allSettled(
      targets.map(async (s) => {
        try {
          await s.handler(moment);
        } catch (err) {
          logger.warn('[moments] handler threw', {
            label: s.label ?? 'unknown',
            moment: name,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }),
    );
  }

  /**
   * Variante síncrona — para testes ou quando o caller precisa garantir que
   * handlers terminem antes de avançar (ex: testes de unidade).
   */
  async emitAndWait<K extends MomentName>(
    name: K,
    payload: MomentPayloads[K],
  ): Promise<void> {
    const moment = { name, payload, ts: Date.now() } as Moment;
    this.pushRecent(moment);
    const targets = this.subs.filter(
      (s) => s.filter === null || s.filter.includes(name),
    );
    if (targets.length === 0) return;
    await Promise.allSettled(
      targets.map(async (s) => {
        try {
          await s.handler(moment);
        } catch (err) {
          logger.warn('[moments] handler threw', {
            label: s.label ?? 'unknown',
            moment: name,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }),
    );
  }

  /** Lista subscribers atuais — útil pra debug em dev. */
  getSubscriberCount(): number {
    return this.subs.length;
  }

  /** Últimos N moments emitidos (debug). NÃO usar em produção pra lógica. */
  getRecent(): readonly Moment[] {
    return this.recent.slice();
  }

  /** Reset completo — usar em testes. */
  reset(): void {
    this.subs = [];
    this.recent = [];
  }

  private pushRecent(moment: Moment): void {
    this.recent.push(moment);
    if (this.recent.length > CreatureMomentService.MAX_RECENT) {
      this.recent.shift();
    }
  }
}

/** Singleton — app inteiro compartilha o mesmo bus. */
export const creatureMoments = new CreatureMomentService();
