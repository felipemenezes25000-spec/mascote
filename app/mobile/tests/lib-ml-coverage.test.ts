/**
 * Cobre branches faltantes em ML modules: anomaly detection, kmeans (init),
 * bandit (errors), embedding/local edge cases, sentiment edge cases.
 */

import { describe, expect, it } from 'vitest';
import { detectAnomaliesInSeries, summarize } from '@/lib/ml/anomaly/detection';
import { kmeans, autoK } from '@/lib/ml/cluster/kmeans';
import { createBandit, deserializeBandit, recordReward, selectArm, serializeBandit } from '@/lib/ml/recommend/bandit';
import { analyzeSentiment, vibeFromScore } from '@/lib/ml/text/sentiment-lex';
import { emptyChain, trainSequence, notableTransitions, topNext, transitionProb } from '@/lib/ml/temporal/markov';
import { emaFit, trendDirection } from '@/lib/ml/temporal/ema';
import { embedLocal, LOCAL_EMBED_DIM } from '@/lib/ml/embedding/local';

describe('detection', () => {
  it('série vazia retorna []', () => {
    expect(detectAnomaliesInSeries([])).toEqual([]);
  });

  it('série < windowSize não detecta', () => {
    expect(detectAnomaliesInSeries([1, 2, 3], 7)).toEqual([]);
  });

  it('summarize de array vazio', () => {
    expect(summarize([])).toBeDefined();
  });
});

describe('autoK', () => {
  it('autoK respeita max', () => {
    const data = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6]];
    expect(autoK(data, 3)).toBeLessThanOrEqual(3);
  });

  it('autoK em array vazio → 1', () => {
    expect(autoK([], 5)).toBeGreaterThanOrEqual(1);
  });
});

describe('kmeans edge cases', () => {
  it('points vazio retorna empty result', () => {
    const r = kmeans([], { k: 2 });
    expect(r.centroids).toEqual([]);
    expect(r.labels).toEqual([]);
    expect(r.inertia).toBe(0);
  });

  it('k <= 0 retorna empty result', () => {
    const r = kmeans([[1, 2]], { k: 0 });
    expect(r.centroids).toEqual([]);
  });

  it('points.length === k → cada ponto é cluster', () => {
    const r = kmeans([[1], [10]], { k: 2 });
    expect(r.centroids.length).toBe(2);
    expect(r.labels).toEqual([0, 1]);
    expect(r.inertia).toBe(0);
  });
});

describe('bandit serialization', () => {
  it('deserialize lixo → bandit fresh', () => {
    const b = deserializeBandit('{{lixo}}');
    expect(b.arms.size).toBe(0);
  });

  it('serialize empty bandit é parseable', () => {
    const b = createBandit();
    const s = serializeBandit(b);
    const b2 = deserializeBandit(s);
    expect(b2.arms.size).toBe(0);
  });

  it('serialize + deserialize bandit com arms preserva estado', () => {
    const b = createBandit();
    recordReward(b, 'arm1', 1);
    recordReward(b, 'arm2', 0);
    const s = serializeBandit(b);
    const b2 = deserializeBandit(s);
    expect(b2.arms.size).toBe(2);
  });

  it('selectArm de bandit vazio retorna null', () => {
    const b = createBandit();
    expect(selectArm(b, [])).toBeNull();
  });

  it('selectArm com armId não nos arms → registra default', () => {
    const b = createBandit();
    const pick = selectArm(b, ['novo']);
    expect(pick).toBe('novo');
  });
});

describe('sentiment edge cases', () => {
  it('string vazia → score 0', () => {
    const r = analyzeSentiment('');
    expect(r.score).toBe(0);
    expect(r.hits).toBe(0);
  });

  it('só whitespace → score 0', () => {
    expect(analyzeSentiment('   ').score).toBe(0);
  });

  it('vibeFromScore: muito_positivo / positivo / neutro / negativo / muito_negativo', () => {
    expect(vibeFromScore(0.9)).toBe('muito_positivo');
    expect(vibeFromScore(0.3)).toBe('positivo');
    expect(vibeFromScore(0)).toBe('neutro');
    expect(vibeFromScore(-0.3)).toBe('negativo');
    expect(vibeFromScore(-0.9)).toBe('muito_negativo');
  });

  it('texto com !!!!!! aumenta magnitude positivo', () => {
    const a = analyzeSentiment('feliz').score;
    const b = analyzeSentiment('feliz!!!').score;
    expect(b).toBeGreaterThanOrEqual(a);
  });

  it('texto com ! aumenta magnitude negativo (raw < 0 branch)', () => {
    const a = analyzeSentiment('triste').raw;
    const b = analyzeSentiment('triste!!!').raw;
    // Multiplicador também para negativos
    expect(Math.abs(b)).toBeGreaterThanOrEqual(Math.abs(a));
  });

  it('texto com múltiplas ?? aumenta magnitude se raw != 0', () => {
    const a = analyzeSentiment('triste').raw;
    const b = analyzeSentiment('triste???').raw;
    expect(Math.abs(b)).toBeGreaterThanOrEqual(Math.abs(a));
  });

  it('negação inverte (não totalmente)', () => {
    const a = analyzeSentiment('triste').score;
    const b = analyzeSentiment('não triste').score;
    expect(b).toBeGreaterThan(a);
  });

  it('intensifier multiplica', () => {
    const a = analyzeSentiment('feliz').raw;
    const b = analyzeSentiment('muito feliz').raw;
    expect(b).toBeGreaterThan(a);
  });

  it('intensifier "meio" reduz', () => {
    const a = analyzeSentiment('cansada').raw;
    const b = analyzeSentiment('meio cansada').raw;
    // |b| < |a|
    expect(Math.abs(b)).toBeLessThan(Math.abs(a));
  });

  it('emoji feliz pontua positivo', () => {
    expect(analyzeSentiment('😊').score).toBeGreaterThan(0);
  });

  it('emoji triste pontua negativo', () => {
    expect(analyzeSentiment('😢').score).toBeLessThan(0);
  });

  it('emoji desconhecido é ignorado', () => {
    expect(analyzeSentiment('🚀').score).toBe(0);
  });
});

describe('markov chain', () => {
  it('chain vazia → topNext vazio', () => {
    const c = emptyChain<string>();
    expect(topNext(c, 'a')).toEqual([]);
  });

  it('notableTransitions filtra por minSupport e minProb', () => {
    const c = emptyChain<string>();
    trainSequence(c, ['a', 'b', 'a', 'b', 'a', 'b']);
    const trans = notableTransitions(c, 2, 0.5);
    expect(trans.some(t => t.from === 'a' && t.to === 'b')).toBe(true);
  });

  it('topNext de estado sem transições → []', () => {
    const c = emptyChain<string>();
    trainSequence(c, ['a']);
    expect(topNext(c, 'inexistente')).toEqual([]);
  });

  it('transitionProb retorna prob 0..1', () => {
    const c = emptyChain<string>();
    trainSequence(c, ['a', 'b', 'a', 'b']);
    const p = transitionProb(c, 'a', 'b');
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('transitionProb de from inexistente → 0', () => {
    const c = emptyChain<string>();
    expect(transitionProb(c, 'x', 'y')).toBe(0);
  });
});

describe('ema', () => {
  it('emaFit em série vazia → estado não inicializado', () => {
    const s = emaFit([]);
    expect(s.initialized).toBe(false);
  });

  it('emaFit série crescente → trendDirection up', () => {
    const s = emaFit([1, 2, 3, 4, 5, 6, 7]);
    expect(trendDirection(s)).toBe('up');
  });

  it('emaFit série decrescente → trendDirection down', () => {
    const s = emaFit([7, 6, 5, 4, 3, 2, 1]);
    expect(trendDirection(s)).toBe('down');
  });

  it('emaFit série flat → flat', () => {
    const s = emaFit([1, 1, 1, 1, 1]);
    expect(trendDirection(s)).toBe('flat');
  });
});

describe('embedLocal', () => {
  it('texto vazio → vetor de zeros', () => {
    const v = embedLocal('', {} as any);
    expect(v.length).toBe(LOCAL_EMBED_DIM);
    expect(v.every(x => x === 0)).toBe(true);
  });
});
