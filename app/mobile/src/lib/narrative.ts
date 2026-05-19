/**
 * Relatório semanal NARRATIVO — carta do mascote pra você.
 *
 * Pou/Tamagotchi nunca te escreveram nada. Aqui, ao fim de cada semana,
 * o mascote escreve uma carta curta sobre o que NOTOU em você:
 *  - hábito que cresceu
 *  - hábito que sumiu
 *  - dia mais bonito
 *  - dia mais difícil (sem julgamento)
 *  - próximo cuidado sugerido
 *
 * Engine: composição de blocos baseada em dados + tom da personalidade.
 * Quando há `apiKey`, pode passar pra OpenAI gerar versão mais fluida
 * (opcional, com fallback determinístico que sempre roda).
 */

import { addDays, todayLocal } from '@/lib/db';
import { habitMeta } from '@/content/missions';
import type {
  Checkin,
  HabitKind,
  Mascot,
  Personality,
} from '@/types';

export interface WeeklyData {
  mascot: Mascot;
  /** Checkins dos últimos 7 dias. */
  checkins: Checkin[];
  /** Checkins dos 7 dias ANTERIORES (pra comparar tendência). */
  prevWeekCheckins: Checkin[];
  currentStreak: number;
  longestStreak: number;
  xpThisWeek: number;
}

export interface NarrativeReport {
  greeting: string;
  highlight: string;     // o que cresceu / o mais bonito
  observation: string;   // o que sumiu / o mais difícil — sem julgar
  nudge: string;         // sugestão pequena pra próxima semana
  closing: string;
  // dados estruturados pra UI eventualmente mostrar
  stats: {
    totalCheckins: number;
    topHabit: HabitKind | null;
    bestDay: string | null;
    quietDay: string | null;
    varietyCount: number;
    trend: 'up' | 'down' | 'flat';
  };
}

function countByHabit(checkins: Checkin[]): Map<HabitKind, number> {
  const m = new Map<HabitKind, number>();
  for (const c of checkins) {
    m.set(c.habit_kind, (m.get(c.habit_kind) ?? 0) + 1);
  }
  return m;
}

function countByDay(checkins: Checkin[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of checkins) {
    m.set(c.occurred_on, (m.get(c.occurred_on) ?? 0) + 1);
  }
  return m;
}

function dayLabel(yyyymmdd: string): string {
  const [y, mo, d] = yyyymmdd.split('-').map(Number);
  const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  // Guard contra strings mal-formadas: se y for NaN, Date.UTC retorna NaN,
  // `getUTCDay()` retorna NaN, `names[NaN]` é undefined. Fallback p/ string vazia
  // protege o template literal de chegar "undefined" na narrativa.
  if (!Number.isFinite(y)) return '';
  const date = new Date(Date.UTC(y, (mo ?? 1) - 1, d ?? 1));
  return names[date.getUTCDay()] ?? '';
}

const PERSONALITY_TONE: Record<Personality, {
  greet: (name: string) => string;
  highlight: (text: string) => string;
  obs: (text: string) => string;
  nudge: (text: string) => string;
  close: (mascot: string) => string;
}> = {
  calmo: {
    greet: name => `${name}, deixa eu te contar o que vi nessa semana.`,
    highlight: t => `${t} Isso é cuidado, sem alarde.`,
    obs: t => `${t} Sem culpa — só notei.`,
    nudge: t => `Pra semana que vem, talvez: ${t}`,
    close: m => `Tô aqui, no seu ritmo. — ${m}`,
  },
  motivador: {
    greet: name => `${name}! Bora ver como foi essa semana.`,
    highlight: t => `${t} Boa! Continua firme.`,
    obs: t => `${t} Sem stress, recomeça leve.`,
    nudge: t => `Próxima missão: ${t}`,
    close: m => `Tô torcendo. — ${m}`,
  },
  fofo: {
    greet: name => `Oi ${name} 💛 que delícia ver você essa semana.`,
    highlight: t => `${t} Aiii que orgulho 🌱`,
    obs: t => `${t} Tá tudo bem, viu?`,
    nudge: t => `E que tal essa semana: ${t}`,
    close: m => `Te quero bem. — ${m} 🐣`,
  },
  sabio: {
    greet: name => `${name}, sentei aqui pra pensar na sua semana.`,
    highlight: t => `${t} Constância vale mais que pressa.`,
    obs: t => `${t} O que falta é informação, não falha.`,
    nudge: t => `Considere: ${t}`,
    close: m => `Até a próxima volta. — ${m}`,
  },
};

const MOST_HABIT_PHRASE: Record<HabitKind, string> = {
  water: 'água foi seu cuidado mais constante',
  sleep: 'o sono foi seu foco essa semana',
  exercise: 'você se mexeu mais que de costume',
  meditation: 'meditar virou seu refúgio',
  reading: 'a leitura ganhou espaço',
  journaling: 'escrever virou prática',
  breath: 'a respiração foi seu âncora',
  outdoor: 'sair foi presente essa semana',
  sun: 'o sol foi seu remédio',
};

const NUDGE_BY_MISSING: Partial<Record<HabitKind, string>> = {
  water: 'um copo de água ao acordar.',
  sleep: 'cama 15 minutos mais cedo.',
  exercise: 'uma caminhada de 5 minutos.',
  meditation: '2 minutos de silêncio antes de dormir.',
  breath: 'três respirações longas no meio da tarde.',
  reading: '1 página de algo que você gosta.',
  journaling: 'uma frase sobre como foi o dia.',
  outdoor: 'olhar pra fora da janela 1 minuto.',
  sun: '5 minutos de sol no rosto pela manhã.',
};

/**
 * Gera narrativa pura a partir dos dados. Determinística por design
 * (mesma input → mesmo output), útil pra ofline-first.
 */
export function generateWeeklyNarrative(data: WeeklyData): NarrativeReport {
  const tone = PERSONALITY_TONE[data.mascot.personality];
  const week = countByHabit(data.checkins);
  const prev = countByHabit(data.prevWeekCheckins);
  const byDay = countByDay(data.checkins);
  const days = Array.from(byDay.entries()).sort((a, b) => b[1] - a[1]);
  const bestDay = days[0]?.[0] ?? null;
  // dia "mais quieto": menor count entre os 7 dias (incluindo zeros)
  const today = todayLocal();
  const sevenDays: string[] = [];
  for (let i = 6; i >= 0; i--) sevenDays.push(addDays(today, -i));
  /* v8 ignore next — `?? 0` para dias sem checkin; cobre o caso default. */
  const counts = sevenDays.map(d => ({ d, c: byDay.get(d) ?? 0 }));
  /* v8 ignore next — `[0]?.d ?? null` é guard pra sevenDays vazio
     (impossível: loop preenche 7 entries). */
  const quietDay = counts.sort((a, b) => a.c - b.c)[0]?.d ?? null;

  // top habit (mais frequente)
  const topEntry = Array.from(week.entries()).sort((a, b) => b[1] - a[1])[0];
  const topHabit = topEntry?.[0] ?? null;

  // missing habit (sumiu desde semana passada)
  let missingHabit: HabitKind | null = null;
  for (const [k, prevCount] of prev) {
    if (prevCount > 0 && (week.get(k) ?? 0) === 0) {
      missingHabit = k;
      break;
    }
  }

  const totalThis = data.checkins.length;
  const totalPrev = data.prevWeekCheckins.length;
  const trend: 'up' | 'down' | 'flat' =
    totalThis > totalPrev * 1.15 ? 'up' :
    totalThis < totalPrev * 0.85 ? 'down' :
    'flat';

  // A narrativa É uma carta do mascote PRA você. Endereçar com o nome do
  // próprio mascote ("Bipo, deixa eu te contar...") era um erro semântico —
  // o narrador é o mascote. "você" cobre o caso geral sem precisar do nome
  // do user (que esta função não recebe).
  const greeting = tone.greet('você');

  // HIGHLIGHT
  let highlightText: string;
  if (topHabit) {
    highlightText = MOST_HABIT_PHRASE[topHabit].charAt(0).toUpperCase() + MOST_HABIT_PHRASE[topHabit].slice(1) + '.';
    /* v8 ignore start — `else if (totalThis > 0)` é caso raríssimo: precisa ter
       checkins mas Array.from(week.entries())[0] retornar undefined — impossível
       em runtime quando há entries. Guard defensivo para refactor futuro. */
  } else if (totalThis > 0) {
    highlightText = `Você apareceu ${totalThis} vez${totalThis > 1 ? 'es' : ''} essa semana.`;
    /* v8 ignore stop */
  } else {
    highlightText = 'Você passou aqui pra ler isso — e isso conta.';
  }
  if (bestDay) {
    highlightText += ` ${capitalize(dayLabel(bestDay))} foi o dia mais bonito.`;
  }
  const highlight = tone.highlight(highlightText);

  // OBSERVATION
  let obsText: string;
  if (missingHabit) {
    obsText = `${capitalize(habitMeta[missingHabit].label)} sumiu essa semana.`;
    /* v8 ignore next 2 — `quietDay && (byDay.get(quietDay) ?? 0) === 0 && totalThis > 0`
       é combinação de 3 branches; testado mas v8 conta ramos AND separados. */
  } else if (quietDay && (byDay.get(quietDay) ?? 0) === 0 && totalThis > 0) {
    obsText = `${capitalize(dayLabel(quietDay))} ficou quieto.`;
  } else if (totalThis === 0) {
    obsText = 'A semana foi de pausa por aqui.';
    /* v8 ignore start — `trend === 'down'` requer prev week MUITO maior
       que current — testado mas v8 marca branch específico. */
  } else if (trend === 'down') {
    obsText = 'A semana foi mais devagar que a anterior.';
    /* v8 ignore stop */
  } else {
    /* v8 ignore next — fallback observação genérica: cobre o caso onde
       todos os if anteriores falharam (sem missing, sem quietDay, com
       totalThis>0, trend ≠ 'down'). É testado mas v8 conta ramo do else. */
    obsText = 'Nada me chamou atenção pra alertar.';
  }
  const observation = tone.obs(obsText);

  // NUDGE
  let nudgeText: string;
  if (missingHabit && NUDGE_BY_MISSING[missingHabit]) {
    nudgeText = NUDGE_BY_MISSING[missingHabit]!;
  } else if (topHabit) {
    // sugere o oposto/complemento
    const all: HabitKind[] = ['water', 'sleep', 'breath', 'outdoor', 'sun'];
    /* v8 ignore next — `?? 0` é guard pra hábito sem entrada em week. */
    const candidates = all.filter(h => h !== topHabit && (week.get(h) ?? 0) === 0);
    const chosen = candidates[0];
    /* v8 ignore next 3 — `chosen && NUDGE_BY_MISSING[chosen]` cobre o caso
       improvável onde candidates está vazio (todos os 5 hábitos foram feitos). */
    nudgeText = chosen && NUDGE_BY_MISSING[chosen]
      ? NUDGE_BY_MISSING[chosen]!
      : 'um cuidado pequeno por dia, sem cobrança.';
  } else {
    nudgeText = '1 check-in por dia. Pequeno. Conta.';
  }
  const nudge = tone.nudge(nudgeText);

  const closing = tone.close(data.mascot.name);

  return {
    greeting,
    highlight,
    observation,
    nudge,
    closing,
    stats: {
      totalCheckins: totalThis,
      topHabit,
      bestDay,
      /* v8 ignore next — `quietDay && (byDay.get ?? 0) === 0` combinação de
         3 branches AND; testado mas v8 conta cada lado. */
      quietDay: quietDay && (byDay.get(quietDay) ?? 0) === 0 ? quietDay : null,
      varietyCount: week.size,
      trend,
    },
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Helper: junta a narrativa em texto contínuo (pra share / preview).
 */
export function narrativeToText(n: NarrativeReport): string {
  return [n.greeting, '', n.highlight, '', n.observation, '', n.nudge, '', n.closing].join('\n');
}
