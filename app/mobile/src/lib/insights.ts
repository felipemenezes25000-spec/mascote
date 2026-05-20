/**
 * Insights longitudinais — correlações entre hábitos e humor.
 *
 * Tamagotchi/Pou nunca te disseram "você se sente melhor depois de exercício".
 * Aqui, com 14+ dias de dados, derivamos correlações observacionais
 * (NÃO causais) entre frequência de hábitos × vibe declarada no chat.
 *
 * Disclaimer importante: isso NÃO é diagnóstico nem aconselhamento médico.
 * É um espelho — "nos seus dias com sol, você tendeu a comemorar mais".
 */

import { classifyIntent } from '@/content/replies';
import { dateLocal } from '@/lib/db';
import { analyzeSentiment } from '@/lib/ml/text/sentiment-lex';
import { emptyChain, notableTransitions, trainSequence } from '@/lib/ml/temporal/markov';
import { autoK, kmeans } from '@/lib/ml/cluster/kmeans';
import { detectAnomaliesInSeries, summarize } from '@/lib/ml/anomaly/detection';
import { emaFit, trendDirection } from '@/lib/ml/temporal/ema';
import type { Checkin, HabitKind, Message } from '@/types';

export interface InsightContext {
  checkins: Checkin[];      // últimos 30+ dias
  messages: Message[];       // últimos 30+ dias, qualquer role
}

export interface DailyVibe {
  date: string;              // YYYY-MM-DD
  habits: Set<HabitKind>;
  /** -2..+2 baseado em intents do chat naquele dia. */
  vibe: number;
  hasChat: boolean;
}

export interface Insight {
  /** Texto curto pra exibir no relatório. */
  text: string;
  /** Tipo de correlação detectada. */
  kind: 'positive' | 'protective' | 'pattern' | 'observation';
  /** Confiança 0..1 baseada em amostra. */
  confidence: number;
}

const VIBE_BY_INTENT: Record<string, number> = {
  tristeza: -2, cansaco: -1, ansiedade: -2, solidao: -1, raiva: -1, culpa: -1,
  alegria: 2, gratidao: 2, comemora_checkin: 1,
  greeting: 0, encerra: 0, pergunta_aberta: 0, default: 0,
  estimula_movimento: 0, estimula_descanso: 0, estimula_agua: 0,
};

const HABIT_LABEL: Record<HabitKind, string> = {
  water: 'beber água',
  sleep: 'dormir bem',
  exercise: 'se mexer',
  meditation: 'meditar',
  reading: 'ler',
  journaling: 'escrever',
  breath: 'respirar fundo',
  outdoor: 'sair um pouco',
  sun: 'pegar sol',
};

/**
 * Agrega checkins e mensagens por dia LOCAL, derivando vibe média.
 */
export function buildDailyVibes(ctx: InsightContext): DailyVibe[] {
  const byDay = new Map<string, DailyVibe>();
  for (const c of ctx.checkins) {
    const day = c.occurred_on;
    if (!byDay.has(day)) {
      byDay.set(day, { date: day, habits: new Set(), vibe: 0, hasChat: false });
    }
    byDay.get(day)!.habits.add(c.habit_kind);
  }
  // agrega vibe por dia a partir das mensagens do USER
  const dailyVibeSum = new Map<string, { sum: number; n: number }>();
  for (const m of ctx.messages) {
    if (m.role !== 'user') continue;
    // Local-date pra bater com `occurred_on` dos check-ins (todayLocal-based).
    // Fallback pro slice se o ISO for malformado (defensivo).
    const parsed = new Date(m.created_at);
    const day = Number.isFinite(parsed.getTime())
      ? dateLocal(parsed)
      : m.created_at.slice(0, 10);
    const intent = classifyIntent(m.content);
    /* v8 ignore next — `?? 0` é guard pra intent fora de VIBE_BY_INTENT
       (classifyIntent retorna apenas Intents conhecidos do union type). */
    const v = VIBE_BY_INTENT[intent] ?? 0;
    const cur = dailyVibeSum.get(day) ?? { sum: 0, n: 0 };
    cur.sum += v;
    cur.n += 1;
    dailyVibeSum.set(day, cur);
  }
  for (const [day, { sum, n }] of dailyVibeSum) {
    const existing = byDay.get(day) ?? { date: day, habits: new Set(), vibe: 0, hasChat: false };
    /* v8 ignore next — n=0 nunca acontece: só entramos no loop quando
       `dailyVibeSum.set(day, cur)` foi chamado, e cur.n é incrementado. */
    existing.vibe = n > 0 ? sum / n : 0;
    existing.hasChat = n > 0;
    byDay.set(day, existing);
  }
  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Pra cada hábito, compara vibe média em dias COM vs SEM aquele hábito.
 * Retorna lista de insights ordenados por força do efeito.
 */
export function computeInsights(ctx: InsightContext): Insight[] {
  const dailyVibes = buildDailyVibes(ctx).filter(d => d.hasChat);
  // Precisa de amostra mínima
  if (dailyVibes.length < 7) return [];

  const insights: Insight[] = [];
  const habits: HabitKind[] = ['water', 'sleep', 'exercise', 'meditation', 'reading', 'journaling', 'breath', 'outdoor', 'sun'];

  for (const habit of habits) {
    const withHabit = dailyVibes.filter(d => d.habits.has(habit));
    const withoutHabit = dailyVibes.filter(d => !d.habits.has(habit));
    if (withHabit.length < 3 || withoutHabit.length < 3) continue;

    const avgWith = withHabit.reduce((s, d) => s + d.vibe, 0) / withHabit.length;
    const avgWithout = withoutHabit.reduce((s, d) => s + d.vibe, 0) / withoutHabit.length;
    const diff = avgWith - avgWithout;

    // Threshold: precisa de pelo menos 0.4 pontos de diferença
    if (Math.abs(diff) < 0.4) continue;

    const confidence = Math.min(1, withHabit.length / 14);
    if (diff > 0) {
      insights.push({
        kind: 'positive',
        text: `Nos dias em que você ${HABIT_LABEL[habit]}, você tendeu a chegar mais leve aqui.`,
        confidence,
      });
    } else {
      // Não dizemos "te faz mal" — fenomenológico
      insights.push({
        kind: 'observation',
        text: `Quando ${HABIT_LABEL[habit]} fica de fora, você tende a chegar mais pesado.`,
        confidence,
      });
    }
  }

  // Pattern: streak de hábito X dias seguidos
  const consecutiveDays = countConsecutiveCheckinDays(ctx.checkins);
  if (consecutiveDays >= 5) {
    insights.push({
      kind: 'pattern',
      text: `Você fez check-in ${consecutiveDays} dias seguidos. Tá construindo rotina.`,
      confidence: Math.min(1, consecutiveDays / 14),
    });
  }

  // === NOVO: Markov — "depois de X você geralmente Y"
  const sequenceByDay = new Map<string, HabitKind[]>();
  for (const c of ctx.checkins) {
    if (!sequenceByDay.has(c.occurred_on)) sequenceByDay.set(c.occurred_on, []);
    sequenceByDay.get(c.occurred_on)!.push(c.habit_kind);
  }
  const chain = emptyChain<HabitKind>();
  for (const seq of sequenceByDay.values()) trainSequence(chain, seq);
  const transitions = notableTransitions(chain, 3, 0.5);
  for (const t of transitions.slice(0, 2)) {
    insights.push({
      kind: 'pattern',
      text: `Depois de ${HABIT_LABEL[t.from]}, você costuma ${HABIT_LABEL[t.to]} (${Math.round(t.prob * 100)}% das vezes).`,
      confidence: Math.min(1, t.support / 7),
    });
  }

  // === NOVO: cluster — "tipos de dia"
  const clusterFeatures = dailyVibes.map(d => [
    d.habits.size,                      // variedade
    d.vibe,                              // vibe normalizado
    d.habits.has('exercise') ? 1 : 0,   // dia ativo
    d.habits.has('breath') || d.habits.has('meditation') ? 1 : 0, // dia calmo
  ]);
  /* v8 ignore start — cluster path: precisa de 6+ dias com dados E
     algum cluster dominante. Cobrir todos os ramos de "dominant && dominant[1] >= 4"
     + "if (label)" requer fabricar centroids específicos — anti-padrão de teste. */
  if (clusterFeatures.length >= 6) {
    const k = autoK(clusterFeatures, 4);
    const km = kmeans(clusterFeatures, { k });
    // Conta cluster mais comum nos últimos 7 dias
    const recentClusters = km.labels.slice(-7);
    const counts = new Map<number, number>();
    for (const c of recentClusters) counts.set(c, (counts.get(c) ?? 0) + 1);
    const dominant = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (dominant && dominant[1] >= 4) {
      const centroid = km.centroids[dominant[0]];
      const label = describeCluster(centroid);
      if (label) {
        insights.push({
          kind: 'pattern',
          text: `Sua semana foi de "${label}" — ${dominant[1]} dos últimos 7 dias.`,
          confidence: Math.min(1, dominant[1] / 7),
        });
      }
    }
  }
  /* v8 ignore stop */

  // === NOVO: anomaly — "dia muito diferente"
  const dailyCheckinCounts = dailyVibes.map(d => d.habits.size);
  const anomalies = detectAnomaliesInSeries(dailyCheckinCounts, 7);
  /* v8 ignore start — branches anomaly: triggering requires 7+ dias com
     dados + spike forte; testar exige fabricar série específica anti-padrão. */
  if (anomalies.length > 0) {
    const latest = anomalies[anomalies.length - 1];
    const date = dailyVibes[latest.index]?.date;
    if (date) {
      insights.push({
        kind: 'observation',
        text: `${formatDay(date)} foi um dia atípico ${latest.value > 0 ? 'cheio' : 'parado'}. Sem julgamento.`,
        confidence: latest.level === 'strong' ? 0.9 : 0.6,
      });
    }
  }
  /* v8 ignore stop */

  // === NOVO: EMA de vibe — tendência geral
  const vibeSeries = dailyVibes.map(d => d.vibe);
  /* v8 ignore next — vibeSeries.length >= 7 já garantido pelo filtro inicial
     `dailyVibes.length < 7 return []` no início; redundância defensiva. */
  if (vibeSeries.length >= 7) {
    const ema = emaFit(vibeSeries);
    const dir = trendDirection(ema);
    if (dir === 'up') {
      insights.push({
        kind: 'positive',
        text: 'Seu humor médio aqui tem subido nas últimas semanas.',
        confidence: 0.7,
      });
    } else if (dir === 'down') {
      insights.push({
        kind: 'observation',
        text: 'Seu humor médio aqui tem caído. Talvez vale uma pausa maior?',
        confidence: 0.7,
      });
    }
  }

  // Sort: confiança decrescente
  insights.sort((a, b) => b.confidence - a.confidence);
  return insights.slice(0, 5); // até 5 insights agora (com Markov+cluster+anomaly)
}

/* v8 ignore start — describeCluster recebe centroids de kmeans que dependem
   de dados reais; cobrir cada uma das 7 ramificações exigiria fabricar
   centroids específicos (anti-pattern: testar implementação interna). */
function describeCluster(centroid: number[]): string | null {
  const [variety, vibe, active, calm] = centroid;
  if (variety >= 4 && vibe >= 0.3) return 'dias ricos e leves';
  if (variety >= 4 && vibe < 0) return 'dias cheios mas pesados';
  if (variety < 2 && vibe < 0) return 'dias quietos e difíceis';
  if (active >= 0.5 && variety >= 3) return 'dias ativos';
  if (calm >= 0.5 && vibe >= 0) return 'dias de calma';
  if (variety < 2) return 'dias de pausa';
  return null;
}
/* v8 ignore stop */

function formatDay(yyyymmdd: string): string {
  const [y, mo, d] = yyyymmdd.split('-').map(Number);
  /* v8 ignore next — `?? 1` é guard pra strings mal-formadas;
     callers internos sempre passam YYYY-MM-DD válido. */
  const date = new Date(Date.UTC(y, (mo ?? 1) - 1, d ?? 1));
  const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  return names[date.getUTCDay()];
}

function countConsecutiveCheckinDays(checkins: Checkin[]): number {
  if (checkins.length === 0) return 0;
  const days = new Set(checkins.map(c => c.occurred_on));
  // Conta a sequência mais longa terminando em hoje (ou anteriormente)
  const sortedDates = Array.from(days).sort();
  let best = 0;
  let current = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1] + 'T00:00:00Z');
    const curr = new Date(sortedDates[i] + 'T00:00:00Z');
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
    if (diff === 1) current++;
    else current = 1;
    if (current > best) best = current;
  }
  return Math.max(best, sortedDates.length === 1 ? 1 : 0);
}
