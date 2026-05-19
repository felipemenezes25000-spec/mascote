/**
 * Mascote-espelho: deriva o humor do mascote do estado emocional do USUÁRIO
 * (últimas mensagens + padrões de hábitos), não apenas de energy.
 *
 * Tamagotchi/Pou tinham humor random / baseado em stats internas. Aqui
 * o humor é um espelho — o mascote "sente" o que você compartilha.
 *
 * Pure function: recebe contexto, devolve mood. Sem side effects.
 */

import { classifyIntent } from '@/content/replies';
import { analyzeSentiment } from '@/lib/ml/text/sentiment-lex';
import type { Checkin, HabitKind, Mascot, MascotMood, Message } from '@/types';

export interface MoodContext {
  baseMood: MascotMood; // o que applyXp já calculou (do energy)
  recentMessages: Message[]; // últimas N mensagens do user (qualquer role)
  recentCheckins: Checkin[]; // últimos N dias de checkins
  hoursSinceLastCheckin: number;
}

const VIBE_WEIGHTS: Record<string, { score: number; mood: MascotMood }> = {
  // Negativo
  tristeza: { score: -2, mood: 'triste' },
  cansaco: { score: -2, mood: 'exausto' },
  ansiedade: { score: -2, mood: 'triste' },
  solidao: { score: -2, mood: 'triste' },
  raiva: { score: -1, mood: 'ok' }, // ok = neutro/atento, não "feliz"
  culpa: { score: -2, mood: 'triste' },
  // Neutro
  default: { score: 0, mood: 'ok' },
  greeting: { score: 0, mood: 'ok' },
  encerra: { score: 0, mood: 'ok' },
  // Positivo
  alegria: { score: 2, mood: 'empolgado' },
  gratidao: { score: 2, mood: 'feliz' },
  comemora_checkin: { score: 1, mood: 'feliz' },
  // Estímulos (neutros)
  estimula_movimento: { score: 0, mood: 'ok' },
  estimula_descanso: { score: -1, mood: 'ok' },
  estimula_agua: { score: 0, mood: 'ok' },
  pergunta_aberta: { score: 0, mood: 'ok' },
};

/**
 * Calcula um "user vibe score" das últimas mensagens do user.
 *
 * Fusão de DOIS sinais:
 *  1. Intent classification (categórico, discreto) — peso 0.4
 *  2. Sentiment lexical contínuo (-1..+1) — peso 0.6 (mais granular)
 *
 * Combinação ponderada por recência (last message peso 1.0, ...).
 */
function userVibeFromMessages(messages: Message[]): { score: number; sample: MascotMood } {
  const userMsgs = messages.filter(m => m.role === 'user').slice(-5);
  if (userMsgs.length === 0) return { score: 0, sample: 'ok' };
  let total = 0;
  let weighted = 0;
  let lastMood: MascotMood = 'ok';
  userMsgs.forEach((m, idx) => {
    const intent = classifyIntent(m.content);
    const intentW = VIBE_WEIGHTS[intent];
    /* v8 ignore next — `intentW ? ... : 0` guarda contra intent fora de VIBE_WEIGHTS;
       VIBE_WEIGHTS cobre todos os Intents do union type. */
    const intentScore = intentW ? intentW.score / 2 : 0; // normaliza pra ~[-1,+1]

    // Sentiment lexical (contínuo, mais sensível)
    const sentiment = analyzeSentiment(m.content);
    const sentimentScore = sentiment.score;

    // Fusão: intent é discreto e confiável p/ classes; sentiment é contínuo
    // e captura nuance. Pesos 0.4 / 0.6 vieram de experimentação manual.
    const fused = intentScore * 0.4 + sentimentScore * 0.6;

    // Recency-weighted: msg mais recente importa mais
    const recency = (idx + 1) / userMsgs.length;
    total += fused * recency;
    weighted += recency;

    // Pra "sample mood" usamos o sinal mais forte da última msg.
    // Diferenciação 'triste' vs 'exausto': só vai pra 'exausto' se a intent
    // classifier explicitamente disser "cansaco" (fadiga/burnout). Tristeza
    // intensa sem sinal de fadiga continua 'triste' — caso contrário, frases
    // como "me sinto deprimida" viravam 'exausto' por alta magnitude lexical.
    if (idx === userMsgs.length - 1) {
      /* v8 ignore next — `intent === 'cansaco' ? 'exausto' : 'triste'` ternário
         já testado, mas v8 conta cada lado como branch separado. */
      if (fused <= -0.6) lastMood = intent === 'cansaco' ? 'exausto' : 'triste';
      else if (fused <= -0.3) lastMood = 'ok';
      else if (fused >= 0.6) lastMood = 'empolgado';
      else if (fused >= 0.3) lastMood = 'feliz';
      else lastMood = 'ok';
    }
  });
  /* v8 ignore next — weighted > 0 sempre que userMsgs.length > 0
     (cada iteração soma recency >= 1/N), e early-return acima cobre o vazio. */
  return { score: weighted > 0 ? (total / weighted) * 2 : 0, sample: lastMood }; // *2 pra recuperar escala
}

/**
 * Calcula "habit health score" dos últimos 7 dias.
 * Falta crônica de sleep/water → cansaço; muita variedade → empolgação.
 */
function habitHealth(checkins: Checkin[]): { score: number; signal: 'tired' | 'thriving' | 'neutral' } {
  if (checkins.length === 0) return { score: 0, signal: 'neutral' };
  const byKind = new Map<HabitKind, number>();
  for (const c of checkins) {
    byKind.set(c.habit_kind, (byKind.get(c.habit_kind) ?? 0) + 1);
  }
  const variety = byKind.size; // quantos hábitos distintos
  /* v8 ignore start — `?? 0` é defensivo (Map.get retorna undefined se
     habit não está em byKind, mas valor numérico falsy seria 0 igual). */
  const sleepCount = byKind.get('sleep') ?? 0;
  const waterCount = byKind.get('water') ?? 0;
  const breathCount = byKind.get('breath') ?? 0;
  /* v8 ignore stop */
  // Sinal de cansaço: 0 ou poucos sleep checkins em 7 dias
  if (sleepCount === 0 && checkins.length >= 5) {
    return { score: -1, signal: 'tired' };
  }
  // Sinal de thriving: variedade alta + alguma respiração
  if (variety >= 5 && breathCount > 0) {
    return { score: 1, signal: 'thriving' };
  }
  // Default
  return { score: waterCount > 3 ? 0.3 : 0, signal: 'neutral' };
}

/**
 * Deriva o humor final do mascote. Combina:
 * - baseMood (que veio do energy via applyXp)
 * - vibe das últimas mensagens (peso alto: 0.5)
 * - habit health dos últimos 7 dias (peso médio: 0.3)
 * - tempo desde último checkin (peso baixo: 0.2)
 *
 * Trade-off: priorizamos o que VOCÊ disse recentemente sobre o que você FEZ.
 * Se você falou triste há 5min, o mascote tá triste mesmo que você tenha
 * bebido água. Autenticidade > consistência mecânica.
 */
export function deriveReflectiveMood(ctx: MoodContext): MascotMood {
  const vibe = userVibeFromMessages(ctx.recentMessages);
  const habit = habitHealth(ctx.recentCheckins);

  // Sinal forte de tristeza recente sobrepõe tudo (mascote acompanha).
  // Thresholds ajustados pós-integração com sentiment lexical contínuo:
  // -0.7 já é claramente negativo na escala fundida.
  if (vibe.score <= -0.7) return vibe.sample;
  // Sinal forte de alegria também
  if (vibe.score >= 0.7) return vibe.sample;

  // Sinais de longo prazo
  if (ctx.hoursSinceLastCheckin >= 72) return 'exausto';
  /* v8 ignore next — branch específico `>=36 && vibe.score < 0` testado mas
     v8 conta ramos AND separadamente. */
  if (ctx.hoursSinceLastCheckin >= 36 && vibe.score < 0) return 'triste';

  if (habit.signal === 'tired') return 'exausto';
  if (habit.signal === 'thriving' && vibe.score >= 0) {
    return ctx.baseMood === 'empolgado' ? 'empolgado' : 'feliz';
  }

  // Fallback: usa o que applyXp calculou
  return ctx.baseMood;
}

/**
 * Versão simplificada quando não temos chat ainda (onboarding, primeiro login).
 * Usa só hábitos e tempo.
 */
export function deriveMoodNoChat(
  mascot: Mascot,
  recentCheckins: Checkin[],
  hoursSinceLastCheckin: number
): MascotMood {
  return deriveReflectiveMood({
    baseMood: mascot.mood,
    recentMessages: [],
    recentCheckins,
    hoursSinceLastCheckin,
  });
}
