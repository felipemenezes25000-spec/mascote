/**
 * useBehaviorTick — testes do hook que liga o engine ao ciclo de vida.
 *
 * Estratégia: fake timers do vitest pra controlar `setInterval` sem esperar.
 * Behaviors são stubs determinísticos — score fixo, execute retorna efeito
 * conhecido. Confirma que cooldown é marcado, paused suspende ticks, e
 * onEffect throw não derruba o engine.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '../../helpers/renderHook';
import { useBehaviorTick } from '@/lib/behavior/useBehaviorTick';
import type {
  Behavior,
  BehaviorContext,
  BehaviorEffect,
} from '@/lib/behavior/types';
import type { Genome } from '@/lib/dna/genome';
import type { Mascot } from '@/types';

const fakeGenome: Genome = {
  empathy: 0.5,
  curiosity: 0.5,
  creativity: 0.5,
  discipline: 0.5,
  chaos: 0.5,
  aggression: 0.5,
  resilience: 0.5,
  emotionalDepth: 0.5,
  socialEnergy: 0.5,
  adaptability: 0.5,
  intelligence: 0.5,
};

const fakeMascot = {
  id: 'm1',
  user_id: 'u1',
  name: 'Bipo',
  personality: 'calmo',
  phase: 'crianca',
  mood: 'ok',
  xp: 0,
  level: 1,
  energy: 50,
  health: 80,
} as unknown as Mascot;

function makeCtx(over: Partial<BehaviorContext> = {}): BehaviorContext {
  return {
    mascot: fakeMascot,
    genome: fakeGenome,
    mood: 'ok',
    hoursSinceLastInteraction: 0,
    streakCurrent: 0,
    hour: 12,
    cooldownActive: new Set(),
    lastRanAt: new Map(),
    ...over,
  };
}

function makeBehavior(
  id: string,
  score: number,
  cooldownSeconds = 60,
  effect: BehaviorEffect = { animation: 'bounce' },
): Behavior {
  return {
    id,
    kind: 'idle',
    cooldownSeconds,
    score: () => score,
    execute: () => effect,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useBehaviorTick', () => {
  it('dispara tick imediato no mount (sem esperar interval)', () => {
    const ctxBuilder = vi.fn(() => makeCtx());
    const onEffect = vi.fn();
    renderHook(() =>
      useBehaviorTick({
        behaviors: [makeBehavior('hi', 0.9)],
        intervalMs: 5000,
        ctxBuilder,
        onEffect,
      }),
    );
    expect(ctxBuilder).toHaveBeenCalledTimes(1);
    expect(onEffect).toHaveBeenCalledTimes(1);
    expect(onEffect.mock.calls[0]?.[1]?.id).toBe('hi');
  });

  it('não chama onEffect quando nenhum behavior tem score > 0', () => {
    const onEffect = vi.fn();
    renderHook(() =>
      useBehaviorTick({
        behaviors: [makeBehavior('zero', 0)],
        intervalMs: 5000,
        ctxBuilder: () => makeCtx(),
        onEffect,
      }),
    );
    expect(onEffect).not.toHaveBeenCalled();
  });

  it('skip tick quando ctxBuilder retorna null', () => {
    const onEffect = vi.fn();
    renderHook(() =>
      useBehaviorTick({
        behaviors: [makeBehavior('hi', 0.9)],
        intervalMs: 5000,
        ctxBuilder: () => null,
        onEffect,
      }),
    );
    expect(onEffect).not.toHaveBeenCalled();
  });

  it('dispara em ticks subsequentes via setInterval', () => {
    const onEffect = vi.fn();
    renderHook(() =>
      useBehaviorTick({
        behaviors: [makeBehavior('hi', 0.9, 0 /* sem cooldown */)],
        intervalMs: 5000,
        ctxBuilder: () => makeCtx(),
        onEffect,
      }),
    );
    expect(onEffect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(onEffect).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(10_000);
    expect(onEffect).toHaveBeenCalledTimes(4);
  });

  it('respeita cooldown — não refire dentro da janela', () => {
    const onEffect = vi.fn();
    renderHook(() =>
      useBehaviorTick({
        behaviors: [makeBehavior('hi', 0.9, 60 /* 60s cooldown */)],
        intervalMs: 5000,
        ctxBuilder: () => makeCtx(),
        onEffect,
      }),
    );
    expect(onEffect).toHaveBeenCalledTimes(1);
    // 50s depois ainda dentro de cooldown
    vi.advanceTimersByTime(50_000);
    expect(onEffect).toHaveBeenCalledTimes(1);
    // 65s depois — cooldown passou
    vi.advanceTimersByTime(15_000);
    expect(onEffect).toHaveBeenCalledTimes(2);
  });

  it('paused=true → engine não roda ticks', () => {
    const ctxBuilder = vi.fn(() => makeCtx());
    const onEffect = vi.fn();
    renderHook(() =>
      useBehaviorTick({
        behaviors: [makeBehavior('hi', 0.9)],
        intervalMs: 5000,
        ctxBuilder,
        onEffect,
        paused: true,
      }),
    );
    expect(ctxBuilder).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(onEffect).not.toHaveBeenCalled();
  });

  it('unmount limpa o interval', () => {
    const onEffect = vi.fn();
    const { unmount } = renderHook(() =>
      useBehaviorTick({
        behaviors: [makeBehavior('hi', 0.9, 0)],
        intervalMs: 5000,
        ctxBuilder: () => makeCtx(),
        onEffect,
      }),
    );
    expect(onEffect).toHaveBeenCalledTimes(1);
    unmount();
    vi.advanceTimersByTime(60_000);
    expect(onEffect).toHaveBeenCalledTimes(1);
  });

  it('clamp de intervalMs: valores <1000 viram 1000', () => {
    const onEffect = vi.fn();
    renderHook(() =>
      useBehaviorTick({
        behaviors: [makeBehavior('hi', 0.9, 0)],
        intervalMs: 50, // suspeito — caller errou
        ctxBuilder: () => makeCtx(),
        onEffect,
      }),
    );
    expect(onEffect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500); // não deveria disparar — clamp pra 1000ms
    expect(onEffect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(600); // total 1100ms — passou o clamp
    expect(onEffect).toHaveBeenCalledTimes(2);
  });

  it('clamp de intervalMs: valores >5min viram 5min (300_000ms)', () => {
    const onEffect = vi.fn();
    renderHook(() =>
      useBehaviorTick({
        behaviors: [makeBehavior('hi', 0.9, 0)],
        intervalMs: 60 * 60 * 1000, // 1h
        ctxBuilder: () => makeCtx(),
        onEffect,
      }),
    );
    expect(onEffect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5 * 60 * 1000); // 5min — clamp
    expect(onEffect).toHaveBeenCalledTimes(2);
  });

  it('onEffect que lança erro não derruba o engine — cooldown ainda é marcado', () => {
    const onEffect = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('caller bug');
      })
      .mockImplementation(() => undefined);
    renderHook(() =>
      useBehaviorTick({
        behaviors: [makeBehavior('hi', 0.9, 30 /* 30s cooldown */)],
        intervalMs: 5000,
        ctxBuilder: () => makeCtx(),
        onEffect,
      }),
    );
    expect(onEffect).toHaveBeenCalledTimes(1);
    // Mesmo com throw, cooldown deve estar marcado — não refire em 10s
    vi.advanceTimersByTime(10_000);
    expect(onEffect).toHaveBeenCalledTimes(1);
    // Após cooldown, refire (com mock que não lança)
    vi.advanceTimersByTime(25_000);
    expect(onEffect).toHaveBeenCalledTimes(2);
  });

  it('usa DEFAULT_BEHAVIORS quando behaviors não é passado', () => {
    // Default behaviors retornam score real. Aqui o teste é mais frouxo:
    // só verifica que ctxBuilder é chamado (engine roda).
    const ctxBuilder = vi.fn(() => makeCtx({ hoursSinceLastInteraction: 0 }));
    const onEffect = vi.fn();
    renderHook(() =>
      useBehaviorTick({
        intervalMs: 5000,
        ctxBuilder,
        onEffect,
      }),
    );
    expect(ctxBuilder).toHaveBeenCalled();
  });

  it('cooldown ativo é propagado para ctx no próximo tick (via probe sentinel)', () => {
    // Probe é um behavior com score 0 — nunca dispara, mas score() é chamado
    // a cada tick e podemos inspecionar ctx.cooldownActive.
    const captured: BehaviorContext[] = [];
    const onEffect = vi.fn();
    const firing: Behavior = makeBehavior('firing', 0.9, 60);
    const probe: Behavior = {
      id: 'probe',
      kind: 'idle',
      cooldownSeconds: 0,
      score: (ctx) => {
        captured.push(ctx);
        return 0;
      },
      execute: () => ({ animation: 'bounce' }),
    };
    renderHook(() =>
      useBehaviorTick({
        behaviors: [firing, probe],
        intervalMs: 5000,
        ctxBuilder: () => makeCtx(),
        onEffect,
      }),
    );
    // Tick 1: ninguém em cooldown ainda
    expect(captured[0]?.cooldownActive.has('firing')).toBe(false);
    expect(onEffect).toHaveBeenCalledTimes(1);
    // Tick 2 (após 5s): firing entrou em cooldown
    vi.advanceTimersByTime(5000);
    expect(captured[1]?.cooldownActive.has('firing')).toBe(true);
    // onEffect não foi chamado de novo (firing em cooldown, probe score 0)
    expect(onEffect).toHaveBeenCalledTimes(1);
  });
});
