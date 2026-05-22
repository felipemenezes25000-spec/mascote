/**
 * CreatureMomentService — testes do bus pub/sub.
 *
 * Garantias:
 *  - subscribe + emit chega ao handler
 *  - filter por nome funciona (handler só de 'habit.water' não recebe outros)
 *  - filter null recebe todos
 *  - unsubscribe remove
 *  - handler que lança NÃO derruba outros (Promise.allSettled garantia)
 *  - on() helper é atalho equivalente a subscribe
 *  - emitAndWait aguarda handlers async terminarem
 *  - ring buffer mantém últimos 64 moments
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { creatureMoments, type Moment } from '@/lib/moments';

beforeEach(() => {
  creatureMoments.reset();
});

afterEach(() => {
  creatureMoments.reset();
});

describe('CreatureMomentService', () => {
  describe('subscribe + emit', () => {
    it('handler com filter no nome recebe quando emit bate', async () => {
      const recv: Moment[] = [];
      creatureMoments.subscribe({
        filter: ['habit.water'],
        handler: (m) => { recv.push(m); },
      });
      await creatureMoments.emitAndWait('habit.water', { intensity: 1 });
      expect(recv).toHaveLength(1);
      expect(recv[0]?.name).toBe('habit.water');
      expect(recv[0]?.payload).toEqual({ intensity: 1 });
      expect(typeof recv[0]?.ts).toBe('number');
    });

    it('handler com filter no nome NÃO recebe outros', async () => {
      const recv: Moment[] = [];
      creatureMoments.subscribe({
        filter: ['habit.water'],
        handler: (m) => { recv.push(m); },
      });
      await creatureMoments.emitAndWait('habit.sleep', { intensity: 1 });
      expect(recv).toHaveLength(0);
    });

    it('filter null recebe TODOS os moments', async () => {
      const recv: string[] = [];
      creatureMoments.subscribe({
        filter: null,
        handler: (m) => { recv.push(m.name); },
      });
      await creatureMoments.emitAndWait('habit.water', { intensity: 1 });
      await creatureMoments.emitAndWait('mutation.unlocked', {
        mutationId: 'mut.x',
        rarity: 'rare',
      });
      expect(recv).toEqual(['habit.water', 'mutation.unlocked']);
    });

    it('múltiplos handlers do mesmo moment recebem todos', async () => {
      const a = vi.fn();
      const b = vi.fn();
      creatureMoments.subscribe({ filter: ['streak.milestone'], handler: a });
      creatureMoments.subscribe({ filter: ['streak.milestone'], handler: b });
      await creatureMoments.emitAndWait('streak.milestone', { days: 7, isFirst: true });
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe', () => {
    it('chamar a função retornada por subscribe remove o handler', async () => {
      const recv: Moment[] = [];
      const unsub = creatureMoments.subscribe({
        filter: ['habit.water'],
        handler: (m) => { recv.push(m); },
      });
      await creatureMoments.emitAndWait('habit.water', { intensity: 0.5 });
      expect(recv).toHaveLength(1);
      unsub();
      await creatureMoments.emitAndWait('habit.water', { intensity: 0.5 });
      expect(recv).toHaveLength(1);
    });
  });

  describe('handler error isolation', () => {
    it('handler que LANÇA NÃO bloqueia outros handlers do mesmo moment', async () => {
      const goodCalls: number[] = [];
      creatureMoments.subscribe({
        filter: ['mission.completed'],
        handler: () => { throw new Error('handler ruim'); },
        label: 'evil',
      });
      creatureMoments.subscribe({
        filter: ['mission.completed'],
        handler: () => { goodCalls.push(1); },
        label: 'good',
      });
      await creatureMoments.emitAndWait('mission.completed', {
        missionId: 'm1',
        xpGained: 10,
        coinsGained: 5,
      });
      expect(goodCalls).toHaveLength(1);
    });

    it('handler que rejeita promise NÃO derruba o bus', async () => {
      const goodCalls: number[] = [];
      creatureMoments.subscribe({
        filter: ['chat.memory_saved'],
        handler: async () => { throw new Error('async fail'); },
      });
      creatureMoments.subscribe({
        filter: ['chat.memory_saved'],
        handler: async () => { goodCalls.push(1); },
      });
      await creatureMoments.emitAndWait('chat.memory_saved', {
        kind: 'evento',
        summary: 'oi',
      });
      expect(goodCalls).toHaveLength(1);
    });

    it('emit (síncrono) NÃO lança mesmo se handler explode', () => {
      creatureMoments.subscribe({
        filter: null,
        handler: () => { throw new Error('boom'); },
      });
      expect(() => {
        creatureMoments.emit('habit.water', { intensity: 1 });
      }).not.toThrow();
    });
  });

  describe('on() helper', () => {
    it('on(name, handler) é equivalente a subscribe com filter [name]', async () => {
      const recv: Moment[] = [];
      creatureMoments.on('phase.advanced', (m) => { recv.push(m); });
      await creatureMoments.emitAndWait('phase.advanced', { from: 'bebe', to: 'crianca' });
      await creatureMoments.emitAndWait('habit.water', { intensity: 1 });
      expect(recv).toHaveLength(1);
      expect(recv[0]?.name).toBe('phase.advanced');
    });

    it('on() retorna unsubscribe funcional', async () => {
      const recv: Moment[] = [];
      const unsub = creatureMoments.on('habit.sleep', (m) => { recv.push(m); });
      await creatureMoments.emitAndWait('habit.sleep', { intensity: 1 });
      unsub();
      await creatureMoments.emitAndWait('habit.sleep', { intensity: 1 });
      expect(recv).toHaveLength(1);
    });
  });

  describe('emitAndWait', () => {
    it('aguarda handlers async resolverem', async () => {
      const order: string[] = [];
      creatureMoments.subscribe({
        filter: ['habit.exercise'],
        handler: async () => {
          await new Promise((r) => setTimeout(r, 10));
          order.push('async-handler');
        },
      });
      await creatureMoments.emitAndWait('habit.exercise', { intensity: 1 });
      order.push('after-await');
      expect(order).toEqual(['async-handler', 'after-await']);
    });
  });

  describe('ring buffer (debug)', () => {
    it('getRecent retorna últimos N moments', async () => {
      for (let i = 0; i < 5; i++) {
        await creatureMoments.emitAndWait('habit.water', { intensity: i / 5 });
      }
      expect(creatureMoments.getRecent()).toHaveLength(5);
    });

    it('ring buffer cap em 64', async () => {
      for (let i = 0; i < 80; i++) {
        await creatureMoments.emitAndWait('habit.water', { intensity: 1 });
      }
      expect(creatureMoments.getRecent().length).toBeLessThanOrEqual(64);
    });

    it('reset zera recent e subscribers', async () => {
      creatureMoments.on('habit.water', vi.fn());
      await creatureMoments.emitAndWait('habit.water', { intensity: 1 });
      expect(creatureMoments.getRecent().length).toBeGreaterThan(0);
      expect(creatureMoments.getSubscriberCount()).toBe(1);
      creatureMoments.reset();
      expect(creatureMoments.getRecent()).toHaveLength(0);
      expect(creatureMoments.getSubscriberCount()).toBe(0);
    });
  });

  describe('emit sem subscribers é seguro (no-op)', () => {
    it('emit pra zero subscribers não lança e não trava', () => {
      expect(() => creatureMoments.emit('habit.water', { intensity: 1 })).not.toThrow();
    });
  });
});
