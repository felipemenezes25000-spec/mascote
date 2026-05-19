/**
 * Tests da camada ML completa: tokenize, TF-IDF, BM25, Bayes, sentiment,
 * embeddings, vector store, Markov, EMA, k-means, anomaly, bandit,
 * style-tracker, mission-ranker, safety ensemble.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  cosine,
  cosineSparse,
  hashToken,
  stem,
  stripDiacritics,
  tokenize,
} from '@/lib/ml/text/tokenize';
import {
  addDocument,
  deserializeStats,
  emptyStats,
  serializeStats,
  tfidfSimilarity,
  tfidfVector,
} from '@/lib/ml/text/tfidf';
import {
  bm25Search,
  emptyIndex,
  indexDocument,
  removeDocument,
} from '@/lib/ml/text/bm25';
import {
  createBayes,
  deserializeBayes,
  learn,
  predict,
  serializeBayes,
} from '@/lib/ml/text/bayes';
import {
  analyzeSentiment,
  vibeFromScore,
} from '@/lib/ml/text/sentiment-lex';
import { embedLocal } from '@/lib/ml/embedding/local';
import { embed, detectMode, dim } from '@/lib/ml/embedding';
import { VectorStore } from '@/lib/ml/store/vector-store';
import {
  emptyChain,
  notableTransitions,
  topNext,
  trainSequence,
  transitionProb,
} from '@/lib/ml/temporal/markov';
import {
  createEma,
  emaFit,
  emaForecast,
  emaUpdate,
  trendDirection,
} from '@/lib/ml/temporal/ema';
import { autoK, kmeans } from '@/lib/ml/cluster/kmeans';
import {
  anomalyLevel,
  detectAnomaliesInSeries,
  iqrOutlier,
  robustZScore,
  summarize,
} from '@/lib/ml/anomaly/detection';
import {
  betaSample,
  createBandit,
  estimatedRate,
  recordReward,
  selectArm,
  topArms,
} from '@/lib/ml/recommend/bandit';
import {
  createStyle,
  describeStyle,
  scoreReply,
  updateStyle,
} from '@/lib/ml/recommend/style-tracker';
import {
  pickMissionWithBandit,
  rankMissions,
} from '@/lib/ml/recommend/mission-ranker';
import { classifySafetyEnsemble } from '@/lib/ml/safety/classifier';

function reset() {
  (globalThis as any).__asyncStorageReset?.();
}

// ============= TOKENIZE =============
describe('tokenize', () => {
  it('lowercase + remove diacritics + split', () => {
    const t = tokenize('Ansiedade Está difícil!');
    // 'ansiedade' tem sufixo 'idade' → stem 'ansie' (Porter-light)
    expect(t.some(tok => tok.startsWith('ansi'))).toBe(true);
    expect(t).not.toContain('difícil');
  });

  it('remove stopwords', () => {
    const t = tokenize('eu sou muito ansiosa');
    expect(t).not.toContain('eu');
    expect(t).not.toContain('sou');
    expect(t).not.toContain('muito');
  });

  it('preserva negação como token único', () => {
    const t = tokenize('não gosto disso');
    expect(t.some(tok => tok.startsWith('nao_'))).toBe(true);
  });

  it('stem reduz flexões', () => {
    expect(stem('ansiosa')).toBe(stem('ansioso'));
    expect(stem('chorando')).toBe('chor');
  });

  it('hashToken é determinístico', () => {
    expect(hashToken('teste', 256)).toBe(hashToken('teste', 256));
    expect(hashToken('teste', 256)).toBeLessThan(256);
  });

  it('stripDiacritics', () => {
    expect(stripDiacritics('açaí')).toBe('acai');
  });

  it('cosine de vetores ortogonais = 0', () => {
    expect(cosine([1, 0, 0], [0, 1, 0])).toBe(0);
  });

  it('cosine de vetores iguais = 1', () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });
});

// ============= TF-IDF =============
describe('TF-IDF', () => {
  it('vetor vazio pra documento vazio', () => {
    const v = tfidfVector('', emptyStats());
    expect(v.size).toBe(0);
  });

  it('similaridade alta entre docs com termos compartilhados', () => {
    const stats = emptyStats();
    addDocument(stats, 'gosto de respirar fundo');
    addDocument(stats, 'gosto de água gelada');
    addDocument(stats, 'corrida na praia');
    const sim = tfidfSimilarity('respiração fundo', 'respirar fundo é bom', stats);
    expect(sim).toBeGreaterThan(0);
  });

  it('serialize/deserialize preserva stats', () => {
    const stats = emptyStats();
    addDocument(stats, 'oi tudo bem');
    addDocument(stats, 'tudo certo');
    const ser = serializeStats(stats);
    const back = deserializeStats(ser);
    expect(back.n).toBe(stats.n);
    expect(back.df.size).toBe(stats.df.size);
  });
});

// ============= BM25 =============
describe('BM25', () => {
  it('indexa e busca', () => {
    const idx = emptyIndex();
    indexDocument(idx, '1', 'respiração profunda ajuda com ansiedade');
    indexDocument(idx, '2', 'beber água é importante');
    indexDocument(idx, '3', 'meditação acalma a mente');
    const results = bm25Search(idx, 'ansiedade respiração', { limit: 2 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('1');
  });

  it('removeDocument decrementa stats', () => {
    const idx = emptyIndex();
    indexDocument(idx, '1', 'teste teste teste');
    indexDocument(idx, '2', 'outro doc');
    removeDocument(idx, '1');
    expect(idx.docs.size).toBe(1);
  });

  it('busca vazia retorna []', () => {
    const idx = emptyIndex();
    expect(bm25Search(idx, 'qualquer coisa')).toEqual([]);
  });
});

// ============= BAYES =============
describe('Naive Bayes online', () => {
  it('aprende e classifica', () => {
    const m = createBayes<'positive' | 'negative'>();
    learn(m, 'eu adoro isso é incrível', 'positive');
    learn(m, 'que dia maravilhoso', 'positive');
    learn(m, 'feliz e grato', 'positive');
    learn(m, 'odeio essa porcaria', 'negative');
    learn(m, 'que dia horrível e ruim', 'negative');
    learn(m, 'estou triste', 'negative');
    const pred = predict(m, 'que coisa maravilhosa');
    expect(pred?.label).toBe('positive');
    const pred2 = predict(m, 'que horrível');
    expect(pred2?.label).toBe('negative');
  });

  it('sem treinamento retorna null', () => {
    const m = createBayes<'a' | 'b'>();
    expect(predict(m, 'teste')).toBeNull();
  });

  it('serialize round-trip', () => {
    const m = createBayes<'x' | 'y'>();
    learn(m, 'um dois três', 'x');
    learn(m, 'quatro cinco seis', 'y');
    const ser = serializeBayes(m);
    const back = deserializeBayes<'x' | 'y'>(ser);
    expect(back.totalDocs).toBe(2);
    expect(back.labelCount.get('x')).toBe(1);
  });
});

// ============= SENTIMENT =============
describe('sentiment lexical', () => {
  it('positivo claro', () => {
    const r = analyzeSentiment('estou muito feliz hoje');
    expect(r.score).toBeGreaterThan(0.3);
  });

  it('negativo claro', () => {
    const r = analyzeSentiment('estou ansiosa e triste');
    expect(r.score).toBeLessThan(-0.3);
  });

  it('negação inverte polaridade', () => {
    const positivo = analyzeSentiment('feliz');
    const negado = analyzeSentiment('não feliz');
    expect(negado.score).toBeLessThan(positivo.score);
  });

  it('intensifier amplifica', () => {
    const base = analyzeSentiment('triste');
    const muito = analyzeSentiment('muito triste');
    expect(Math.abs(muito.score)).toBeGreaterThanOrEqual(Math.abs(base.score));
  });

  it('emoji conta no score', () => {
    const r = analyzeSentiment('💛');
    expect(r.score).toBeGreaterThan(0);
  });

  it('score sempre em [-1, 1]', () => {
    const r1 = analyzeSentiment('feliz feliz feliz feliz feliz alegria amor maravilhoso');
    const r2 = analyzeSentiment('triste triste odeio depressao morrer pavor terror');
    expect(r1.score).toBeLessThanOrEqual(1);
    expect(r2.score).toBeGreaterThanOrEqual(-1);
  });

  it('vibeFromScore mapeia corretamente', () => {
    expect(vibeFromScore(0.8)).toBe('muito_positivo');
    expect(vibeFromScore(0.3)).toBe('positivo');
    expect(vibeFromScore(0)).toBe('neutro');
    expect(vibeFromScore(-0.3)).toBe('negativo');
    expect(vibeFromScore(-0.8)).toBe('muito_negativo');
  });
});

// ============= EMBEDDING =============
describe('embedding local + híbrido', () => {
  it('embedLocal produz vetor L2-normalizado', () => {
    const stats = emptyStats();
    addDocument(stats, 'oi tudo bem');
    const v = embedLocal('oi tudo bem', stats);
    expect(v.length).toBe(256);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeGreaterThan(0.5);
    expect(norm).toBeLessThanOrEqual(1.01);
  });

  it('detectMode escolhe corretamente', () => {
    expect(detectMode({})).toBe('local');
    expect(detectMode({ apiKey: 'sk-xxx' })).toBe('openai');
  });

  it('dim retorna tamanho certo', () => {
    expect(dim('local')).toBe(256);
    expect(dim('openai')).toBe(1536);
  });

  it('embed local funciona sem apiKey', async () => {
    const stats = emptyStats();
    addDocument(stats, 'teste');
    const v = await embed('teste', { mode: 'local', stats });
    expect(v.length).toBe(256);
  });
});

// ============= VECTOR STORE =============
describe('VectorStore', () => {
  beforeEach(reset);

  it('upsert + search com cosine', async () => {
    const store = new VectorStore<{ k: string }>('test');
    await store.upsert({
      id: 'a',
      vector: [1, 0, 0],
      metadata: { k: 'first' },
      created_at: new Date().toISOString(),
    });
    await store.upsert({
      id: 'b',
      vector: [0, 1, 0],
      metadata: { k: 'second' },
      created_at: new Date().toISOString(),
    });
    const results = await store.search([0.9, 0.1, 0], { limit: 1 });
    expect(results[0].record.id).toBe('a');
  });

  it('remove + clear', async () => {
    const store = new VectorStore('test2');
    await store.upsert({ id: '1', vector: [1, 2], created_at: '' });
    await store.upsert({ id: '2', vector: [3, 4], created_at: '' });
    await store.remove('1');
    expect(await store.size()).toBe(1);
    await store.clear();
    expect(await store.size()).toBe(0);
  });
});

// ============= MARKOV =============
describe('Markov chain', () => {
  it('aprende transições e prediz', () => {
    const chain = emptyChain<string>();
    trainSequence(chain, ['water', 'exercise', 'water', 'exercise']);
    trainSequence(chain, ['water', 'exercise', 'sleep']);
    const next = topNext(chain, 'water', 2);
    expect(next[0].state).toBe('exercise');
    expect(next[0].prob).toBeGreaterThan(0.5);
  });

  it('transitionProb com smoothing', () => {
    const chain = emptyChain<string>();
    trainSequence(chain, ['a', 'b']);
    const p = transitionProb(chain, 'a', 'c'); // c nunca veio depois de a
    expect(p).toBeGreaterThan(0); // Laplace garante > 0
  });

  it('notableTransitions com support mínimo', () => {
    const chain = emptyChain<string>();
    for (let i = 0; i < 5; i++) trainSequence(chain, ['x', 'y']);
    trainSequence(chain, ['x', 'z']);
    const notable = notableTransitions(chain, 3, 0.5);
    expect(notable.length).toBeGreaterThan(0);
    expect(notable[0].from).toBe('x');
    expect(notable[0].to).toBe('y');
  });
});

// ============= EMA =============
describe('EMA / Holt', () => {
  it('initialized é false antes do primeiro update', () => {
    expect(createEma().initialized).toBe(false);
  });

  it('emaUpdate inicializa no primeiro valor', () => {
    const s = emaUpdate(createEma(), 5);
    expect(s.level).toBe(5);
    expect(s.initialized).toBe(true);
  });

  it('emaFit smooth uma série', () => {
    const s = emaFit([1, 2, 3, 4, 5, 6]);
    expect(s.level).toBeGreaterThan(0);
    expect(s.trend).toBeGreaterThan(0); // trend ascendente
  });

  it('trendDirection detecta up/down/flat', () => {
    expect(trendDirection(emaFit([1, 2, 3, 4, 5]))).toBe('up');
    expect(trendDirection(emaFit([5, 4, 3, 2, 1]))).toBe('down');
    expect(trendDirection(emaFit([5, 5, 5, 5, 5]))).toBe('flat');
  });

  it('emaForecast extrapola usando trend', () => {
    const s = emaFit([1, 2, 3, 4, 5]);
    const f = emaForecast(s, 3);
    expect(f).toBeGreaterThan(s.level);
  });
});

// ============= K-MEANS =============
describe('K-means', () => {
  it('clusters 2 grupos óbvios', () => {
    const points = [
      [0, 0], [0.1, 0.1], [0.2, 0],
      [10, 10], [10.1, 9.9], [9.9, 10],
    ];
    const r = kmeans(points, { k: 2 });
    expect(r.labels[0]).toBe(r.labels[1]);
    expect(r.labels[3]).toBe(r.labels[4]);
    expect(r.labels[0]).not.toBe(r.labels[3]);
  });

  it('determinístico com mesmo seed', () => {
    const points = [[1, 1], [2, 2], [10, 10], [11, 11]];
    const r1 = kmeans(points, { k: 2, seed: 1 });
    const r2 = kmeans(points, { k: 2, seed: 1 });
    expect(r1.labels).toEqual(r2.labels);
  });

  it('autoK escolhe k razoável', () => {
    const points = [
      [0, 0], [0, 1], [1, 0], [1, 1],
      [10, 10], [10, 11], [11, 10],
    ];
    const k = autoK(points, 4);
    expect(k).toBeGreaterThanOrEqual(1);
    expect(k).toBeLessThanOrEqual(4);
  });
});

// ============= ANOMALY =============
describe('Anomaly detection', () => {
  it('summarize calcula stats básicas', () => {
    const s = summarize([1, 2, 3, 4, 5]);
    expect(s.mean).toBeCloseTo(3);
    expect(s.median).toBe(3);
    expect(s.n).toBe(5);
  });

  it('robustZScore: outlier extremo tem z alto', () => {
    const s = summarize([1, 2, 3, 4, 5]);
    expect(Math.abs(robustZScore(100, s))).toBeGreaterThan(3);
  });

  it('anomalyLevel detecta strong', () => {
    const s = summarize([10, 11, 12, 10, 11, 12, 10, 11]);
    expect(anomalyLevel(100, s)).toBe('strong');
    expect(anomalyLevel(11, s)).toBe('normal');
  });

  it('iqrOutlier detecta low/high', () => {
    const s = summarize([10, 11, 12, 13, 14, 15]);
    expect(iqrOutlier(0, s)).toBe('low');
    expect(iqrOutlier(100, s)).toBe('high');
    expect(iqrOutlier(13, s)).toBe('normal');
  });

  it('detectAnomaliesInSeries usa janela', () => {
    const series = [5, 5, 5, 5, 5, 5, 5, 50, 5];
    const anomalies = detectAnomaliesInSeries(series, 7);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].index).toBe(7);
  });
});

// ============= BANDIT =============
describe('Multi-armed bandit (Thompson)', () => {
  it('betaSample retorna [0, 1]', () => {
    for (let i = 0; i < 50; i++) {
      const s = betaSample(2, 3);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it('aprende qual arm é melhor com reward', () => {
    const b = createBandit();
    // arm 'good' sempre vence; arm 'bad' sempre falha
    for (let i = 0; i < 100; i++) {
      selectArm(b, ['good', 'bad'], () => Math.random());
      // record fixo (não depende do que selecionou, p/ simular ground truth)
    }
    for (let i = 0; i < 50; i++) recordReward(b, 'good', 1);
    for (let i = 0; i < 50; i++) recordReward(b, 'bad', 0);
    const goodArm = b.arms.get('good')!;
    const badArm = b.arms.get('bad')!;
    expect(estimatedRate(goodArm)).toBeGreaterThan(estimatedRate(badArm));
  });

  it('topArms ordena por taxa estimada', () => {
    const b = createBandit();
    selectArm(b, ['a', 'b', 'c']);
    recordReward(b, 'a', 1);
    recordReward(b, 'a', 1);
    recordReward(b, 'b', 0);
    const top = topArms(b, 3);
    expect(top[0].id).toBe('a');
  });
});

// ============= STYLE TRACKER =============
describe('Style tracker', () => {
  it('scoreReply detecta expansivo vs conciso', () => {
    const short = scoreReply('OK.');
    const long = scoreReply('Vou te contar uma história longa sobre como o mundo é cheio de detalhes interessantes e variados, com muitos exemplos.');
    expect(long.expansiveness).toBeGreaterThan(short.expansiveness);
  });

  it('updateStyle move na direção do reward', () => {
    let s = createStyle();
    const energetic = scoreReply('Bora!!! Vamos lá!');
    for (let i = 0; i < 20; i++) s = updateStyle(s, energetic, 1);
    expect(s.energy).toBeGreaterThan(0);
  });

  it('describeStyle só fala depois de amostra suficiente', () => {
    const sNew = createStyle();
    expect(describeStyle(sNew)).toBe('');
    let s = createStyle();
    const fofo = scoreReply('aiii querido 💛 te quero bem');
    for (let i = 0; i < 10; i++) s = updateStyle(s, fofo, 1);
    expect(describeStyle(s).length).toBeGreaterThan(0);
  });
});

// ============= MISSION RANKER =============
describe('Mission ranker', () => {
  it('filtra missão de sono fora do horário', () => {
    const b = createBandit();
    const ranked = rankMissions(b, {
      personality: 'calmo',
      mood: 'feliz',
      hour: 10, // de manhã, sleep não deve aparecer
      doneToday: new Set(),
    });
    expect(ranked.find(r => r.template.habit_kind === 'sleep')).toBeUndefined();
  });

  it('mood triste evita exercise pesado', () => {
    const b = createBandit();
    const ranked = rankMissions(b, {
      personality: 'motivador',
      mood: 'triste',
      hour: 15,
      doneToday: new Set(),
    });
    const heavyExercise = ranked.find(
      r => r.template.habit_kind === 'exercise' && r.template.xp_reward >= 40
    );
    expect(heavyExercise).toBeUndefined();
  });

  it('pickMissionWithBandit retorna algo válido', () => {
    const b = createBandit();
    const t = pickMissionWithBandit(b, {
      personality: 'calmo',
      mood: 'feliz',
      hour: 10,
      doneToday: new Set(),
    });
    expect(t).not.toBeNull();
  });
});

// ============= SAFETY ENSEMBLE =============
describe('Safety classifier ensemble', () => {
  it('crítico via regex', () => {
    const d = classifySafetyEnsemble('quero me suicidar');
    expect(d.flag).toBe('critical');
  });

  it('sentiment muito negativo eleva pelo menos pra watch', () => {
    const d = classifySafetyEnsemble('me sinto vazia, sem esperança, derrotada e triste demais');
    expect(['watch', 'high']).toContain(d.flag);
  });

  it('mensagem positiva passa como safe', () => {
    const d = classifySafetyEnsemble('que dia maravilhoso hoje');
    expect(d.flag).toBe('safe');
  });

  it('confidence aumenta quando sinais concordam', () => {
    const d1 = classifySafetyEnsemble('ok');
    const d2 = classifySafetyEnsemble('quero me matar');
    expect(d2.confidence).toBeGreaterThanOrEqual(d1.confidence);
  });
});

// ============= cosineSparse =============
describe('cosineSparse', () => {
  it('mesma chave = 1', () => {
    const a = new Map([['x', 1]]);
    expect(cosineSparse(a, a)).toBeCloseTo(1);
  });
  it('sem overlap = 0', () => {
    expect(cosineSparse(new Map([['x', 1]]), new Map([['y', 1]]))).toBe(0);
  });
});
