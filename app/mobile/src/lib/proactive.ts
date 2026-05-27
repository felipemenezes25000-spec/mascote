/**
 * IA proativa: o mascote PROCURA você, não só responde.
 *
 * Tamagotchi gritava por comida. Pou pedia jogo. Aqui o mascote nota
 * padrões reais (sem checkin de água há 3 dias, sleep curto, sem chat há
 * uma semana) e manda mensagem in-app contextual — respeitando settings,
 * quiet hours, e dedup.
 *
 * Não é spam: cada padrão tem cooldown próprio e a notif é gentil.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, checkins as checkinsDb, messages as messagesDb, todayLocal } from '@/lib/db';
import { recallSimulationMemoryHint } from '@/lib/memory/simulation';
import { notify } from '@/lib/notify';
import { classifyIntent } from '@/content/replies';
import type { Checkin, Profile } from '@/types';
import type { LifeState, SimulationEvent } from '@/sim/types';

export type ProactiveTrigger =
  | 'no_water_3d'
  | 'low_sleep_pattern'
  | 'quiet_chat_7d'
  | 'recent_sad_streak'
  | 'first_week_complete'
  | 'monthly_recap_ready'
  | 'sim_low_energy'
  | 'sim_return_absence'
  | 'sim_low_mood'
  | 'sim_habit_missed'
  | 'sim_streak_risk'
  | 'sim_living_moment'
  | 'evening_checkin_nudge'
  | 'habit_rhythm_positive'
  | 'weekend_gentle_nudge';

interface TriggerDef {
  id: ProactiveTrigger;
  /** Mínimo de horas entre disparos do mesmo trigger. */
  cooldownHours: number;
  /** Avalia se o trigger deve disparar agora. */
  test: (ctx: ProactiveContext) => Promise<{ fire: boolean; title?: string; body?: string }>;
}

export interface ProactiveContext {
  profile: Profile;
  /** Últimos 14 dias de checkins (suficiente p/ ver padrões). */
  recentCheckins: Checkin[];
  /** Últimas mensagens do user. */
  recentUserMessages: { content: string; created_at: string }[];
  /** Data ISO da última conversa (qualquer role). */
  lastChatAt: string | null;
  /** Mascot name pra interpolar. */
  mascotName: string;
  /** Estado de vida da simulação (quando disponível). */
  lifeState?: LifeState | null;
  /** Eventos do último tick de simulação (hábitos, streak, retorno). */
  simulationEvents?: readonly SimulationEvent[];
}

const COOLDOWN_KEY = (uid: string, trigger: ProactiveTrigger) =>
  `proactive_cooldown:${uid}:${trigger}`;

// In-memory locks por (uid, trigger) — serializam lastFiredAt+markFired
// pra evitar dois scans concorrentes dispararem o MESMO trigger duas vezes
// (read-before-write race: ambos veem cooldown OK e ambos chamam markFired).
const cooldownLocks = new Map<string, Promise<unknown>>();

async function withCooldownLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  /* v8 ignore next — `?? Promise.resolve()` é guard pro primeiro lock por key. */
  const prev = cooldownLocks.get(key) ?? Promise.resolve();
  const result = prev.then(fn, fn);
  /* v8 ignore next — `() => undefined` é error handler defensivo no tail;
     dispara apenas se result rejeitar (raro com fn que sempre resolve). */
  const tail = result.catch(() => undefined);
  cooldownLocks.set(key, tail);
  try {
    return await result;
  } finally {
    /* v8 ignore next — só removemos se ainda somos a tail (ninguém enfileirou). */
    if (cooldownLocks.get(key) === tail) cooldownLocks.delete(key);
  }
}

async function lastFiredAt(uid: string, trigger: ProactiveTrigger): Promise<Date | null> {
  const raw = await AsyncStorage.getItem(COOLDOWN_KEY(uid, trigger));
  if (!raw) return null;
  const d = new Date(raw);
  /* v8 ignore next — `isNaN(d.getTime())` guarda contra ISO inválido salvo
     no AsyncStorage (corrupção); markFired sempre escreve ISO válido. */
  if (isNaN(d.getTime())) return null;
  // Clock skew: se o timestamp gravado está no futuro (usuário rolou o
  // relógio pra trás), o cooldown nunca expira. Trata como se nunca tivesse
  // disparado pra desbloquear triggers.
  if (d.getTime() > Date.now()) return null;
  return d;
}

async function markFired(uid: string, trigger: ProactiveTrigger): Promise<void> {
  await AsyncStorage.setItem(COOLDOWN_KEY(uid, trigger), new Date().toISOString());
}

const TRIGGERS: TriggerDef[] = [
  // Sem água por 3 dias seguidos
  {
    id: 'no_water_3d',
    cooldownHours: 48,
    async test(ctx) {
      const lastWater = ctx.recentCheckins
        .filter(c => c.habit_kind === 'water')
        .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))[0];
      if (!lastWater) return { fire: false };
      const today = todayLocal();
      const gap = Math.abs(
        Math.floor(
          (new Date(today + 'T00:00:00').getTime() -
            new Date(lastWater.occurred_on + 'T00:00:00').getTime()) /
            86_400_000
        )
      );
      if (gap < 3) return { fire: false };
      return {
        fire: true,
        title: `${ctx.mascotName} sentiu sede`,
        body: 'Faz 3 dias sem água anotada. Um copo agora?',
      };
    },
  },
  // Padrão de sleep curto: 5+ checkins de sleep < 6h nos últimos 7 dias
  {
    id: 'low_sleep_pattern',
    cooldownHours: 72,
    async test(ctx) {
      const today = todayLocal();
      const cutoff = addDays(today, -6);
      /* v8 ignore start — filtros AND multi-branch (kind, cutoff, today, value);
         testado em testes de low_sleep_pattern mas v8 conta cada ramo. */
      const lowSleeps = ctx.recentCheckins.filter(
        c =>
          c.habit_kind === 'sleep' &&
          c.occurred_on >= cutoff &&
          c.occurred_on <= today &&
          (c.value ?? 0) < 6
      );
      /* v8 ignore stop */
      if (lowSleeps.length < 3) return { fire: false };
      return {
        fire: true,
        title: `${ctx.mascotName} notou seu sono`,
        body: 'Várias noites curtas essa semana. Que tal cama mais cedo hoje?',
      };
    },
  },
  // Silêncio: ninguém conversa há 7+ dias
  {
    id: 'quiet_chat_7d',
    cooldownHours: 24 * 14,
    async test(ctx) {
      if (!ctx.lastChatAt) return { fire: false };
      const hours = (Date.now() - new Date(ctx.lastChatAt).getTime()) / 3_600_000;
      if (hours < 24 * 7) return { fire: false };
      return {
        fire: true,
        title: `${ctx.mascotName} sentiu sua falta`,
        body: 'Faz uns dias que a gente não conversa. Como você tá?',
      };
    },
  },
  // 3 mensagens "tristes" seguidas → check-in carinhoso
  {
    id: 'recent_sad_streak',
    cooldownHours: 48,
    async test(ctx) {
      const last3 = ctx.recentUserMessages.slice(-3);
      if (last3.length < 3) return { fire: false };
      // Wave 2 split 'solidao' em duas intents mais especificas:
      // 'expressa_solidao' ("me sinto sozinho") e 'pede_companhia' ("preciso
      // de companhia") — ambas pertencem ao cluster triste e devem disparar
      // o check-in carinhoso junto com a versao generica 'solidao'.
      const sadIntents = new Set([
        'tristeza',
        'cansaco',
        'ansiedade',
        'solidao',
        'expressa_solidao',
        'pede_companhia',
        'culpa',
      ]);
      const sadCount = last3.filter(m => sadIntents.has(classifyIntent(m.content))).length;
      if (sadCount < 3) return { fire: false };
      return {
        fire: true,
        title: `${ctx.mascotName} quer te ouvir`,
        body: 'Tô aqui. Sem agenda. Conta como tá hoje?',
      };
    },
  },
  // Primeira semana completa
  {
    id: 'first_week_complete',
    cooldownHours: 24 * 365, // 1× por usuário
    async test(ctx) {
      const created = new Date(ctx.profile.created_at).getTime();
      const days = (Date.now() - created) / 86_400_000;
      if (days < 7) return { fire: false };
      // recentCheckins cobre 14 dias (ver buildProactiveContext); a copy abaixo
      // promete "dos últimos 7", então re-filtramos aqui pra evitar mostrar
      // "9 dos últimos 7 dias" quando o usuário faz check-ins consistentes.
      const cutoff7 = addDays(todayLocal(), -6);
      const daysWithCheckin = new Set(
        ctx.recentCheckins.filter(c => c.occurred_on >= cutoff7).map(c => c.occurred_on),
      ).size;
      if (daysWithCheckin < 5) return { fire: false };
      return {
        fire: true,
        title: 'Uma semana juntos',
        body: `Você apareceu por aqui ${daysWithCheckin} dos últimos 7 dias. Tá criando rotina.`,
      };
    },
  },
  // Simulação: energy baixa após tick offline
  {
    id: 'sim_low_energy',
    cooldownHours: 36,
    async test(ctx) {
      const energy = ctx.lifeState?.energy;
      if (energy === undefined || energy >= 35) return { fire: false };
      return {
        fire: true,
        title: `${ctx.mascotName} tá mais quieto`,
        body: 'Descansou enquanto você estava fora. Um check-in leve hoje?',
      };
    },
  },
  // Simulação: retorno após ausência longa
  {
    id: 'sim_return_absence',
    cooldownHours: 72,
    async test(ctx) {
      const hours = ctx.lifeState?.absence_hours ?? 0;
      if (hours < 48) return { fire: false };
      const days = Math.floor(hours / 24);
      const hint = await recallSimulationMemoryHint(
        ctx.profile.id,
        'retorno ausência mascote voltou',
      );
      return {
        fire: true,
        title: `${ctx.mascotName} te esperava`,
        body:
          hint ??
          (days >= 3
            ? `Faz ${days} dias. Sem cobrança — só feliz que voltou.`
            : 'Enquanto você estava fora, cuidei do meu ritmo.'),
      };
    },
  },
  // Simulação: humor baixo persistente
  {
    id: 'sim_low_mood',
    cooldownHours: 48,
    async test(ctx) {
      const mood = ctx.lifeState?.mood;
      if (mood !== 'triste' && mood !== 'exausto') return { fire: false };
      return {
        fire: true,
        title: `${ctx.mascotName} quer te ouvir`,
        body: 'Tô um pouco quieto. Como você tá hoje?',
      };
    },
  },
  // Simulação: hábito regular perdido durante ausência
  {
    id: 'sim_habit_missed',
    cooldownHours: 36,
    async test(ctx) {
      const ev = ctx.simulationEvents?.find(e => e.kind === 'while_away_habit_missed');
      if (!ev?.message) return { fire: false };
      return {
        fire: true,
        title: `${ctx.mascotName} notou seu ritmo`,
        body: ev.message,
      };
    },
  },
  // Simulação: streak em risco após ausência
  {
    id: 'sim_streak_risk',
    cooldownHours: 48,
    async test(ctx) {
      const ev = ctx.simulationEvents?.find(e => e.kind === 'while_away_streak_risk');
      if (!ev?.message) return { fire: false };
      return {
        fire: true,
        title: `${ctx.mascotName} lembrou do seu ritmo`,
        body: ev.message,
      };
    },
  },
  // Simulação: pequeno momento autônomo enquanto usuário estava fora
  {
    id: 'sim_living_moment',
    cooldownHours: 24,
    async test(ctx) {
      const ev = ctx.simulationEvents?.find(e => e.kind === 'while_away_living_moment');
      if (!ev?.message) return { fire: false };
      const hint = await recallSimulationMemoryHint(
        ctx.profile.id,
        'momento vivido enquanto fora',
      );
      return {
        fire: true,
        title: `${ctx.mascotName} ficou por aqui`,
        body: hint ?? ev.message,
      };
    },
  },
  // Noite (18–22h) sem check-in hoje — lembrete leve
  {
    id: 'evening_checkin_nudge',
    cooldownHours: 20,
    async test(ctx) {
      const hour = new Date().getHours();
      // 18–21h (22h em diante já cai em quiet hours em notify.ts).
      if (hour < 18 || hour >= 22) return { fire: false };
      const today = todayLocal();
      const checkedToday = ctx.recentCheckins.some(c => c.occurred_on === today);
      if (checkedToday) return { fire: false };
      if ((ctx.lifeState?.absence_hours ?? 0) < 12) return { fire: false };
      return {
        fire: true,
        title: `${ctx.mascotName} tá acordado`,
        body: 'Noite boa. Um check-in leve antes de descansar?',
      };
    },
  },
  // Ritmo forte: 5+ dias com check-in nos últimos 7
  {
    id: 'habit_rhythm_positive',
    cooldownHours: 72,
    async test(ctx) {
      const cutoff7 = addDays(todayLocal(), -6);
      const daysWithCheckin = new Set(
        ctx.recentCheckins.filter(c => c.occurred_on >= cutoff7).map(c => c.occurred_on),
      ).size;
      if (daysWithCheckin < 5) return { fire: false };
      return {
        fire: true,
        title: `${ctx.mascotName} notou seu ritmo`,
        body: `${daysWithCheckin} dias nos últimos 7. Isso vira hábito.`,
      };
    },
  },
  // Fim de semana sem check-in, mas semana ativa
  {
    id: 'weekend_gentle_nudge',
    cooldownHours: 36,
    async test(ctx) {
      const dow = new Date().getDay();
      if (dow !== 0 && dow !== 6) return { fire: false };
      const today = todayLocal();
      if (ctx.recentCheckins.some(c => c.occurred_on === today)) return { fire: false };
      const weekdayCutoff = addDays(today, -5);
      const weekdayDays = new Set(
        ctx.recentCheckins
          .filter(c => c.occurred_on >= weekdayCutoff && c.occurred_on < today)
          .map(c => c.occurred_on),
      ).size;
      if (weekdayDays < 3) return { fire: false };
      return {
        fire: true,
        title: `${ctx.mascotName} relaxou com você`,
        body: 'Fim de semana. Um check-in leve se der vontade.',
      };
    },
  },
];

/**
 * Avalia todos os triggers, dispara os que passam cooldown + test,
 * marca como fired e cria notificações. Retorna triggers disparados
 * e micro-copy para status bubble na Home.
 */
export async function runProactiveScan(
  ctx: ProactiveContext,
): Promise<{ fired: ProactiveTrigger[]; bubbleLine: string | null }> {
  const fired: ProactiveTrigger[] = [];
  let bubbleLine: string | null = null;
  for (const def of TRIGGERS) {
    // Serializa read-cooldown → test → notify → markFired por (user, trigger)
    // pra evitar dois scans concorrentes dispararem o mesmo trigger.
    const lockKey = `${ctx.profile.id}:${def.id}`;
    const result = await withCooldownLock(lockKey, async () => {
      const last = await lastFiredAt(ctx.profile.id, def.id);
      if (last) {
        const hours = (Date.now() - last.getTime()) / 3_600_000;
        /* v8 ignore next — `hours < cooldownHours` (cooldown ativo) é o
           caminho que retorna null. Testado em "cooldown respeitado" mas
           branch específico pra cada trigger × cooldown varia. */
        if (hours < def.cooldownHours) return null;
      }
      const trigger = await def.test(ctx);
      if (!trigger.fire) return null;
      // markFired ANTES de notify: se o app for morto entre os dois, é
      // melhor perder uma notificação do que disparar duplicada no próximo scan.
      await markFired(ctx.profile.id, def.id);
      const body = trigger.body ?? 'Como você tá hoje?';
      await notify(
        ctx.profile,
        'reminder',
        /* v8 ignore start — todos os triggers atuais setam title e body
           explicitamente; os fallbacks `??` são guards para extensões futuras. */
        trigger.title ?? `${ctx.mascotName} passou aqui`,
        body,
        /* v8 ignore stop */
        { proactive: def.id }
      );
      return { id: def.id, body };
    });
    if (result) {
      fired.push(result.id);
      if (result.body && !bubbleLine) bubbleLine = result.body;
    }
  }
  return { fired, bubbleLine };
}

/**
 * Constrói o ProactiveContext fazendo as leituras necessárias.
 * Wrapper de conveniência pra chamar do hydrate/useFocusEffect.
 */
export async function buildProactiveContext(
  profile: Profile,
  mascotName: string,
  lifeState?: LifeState | null,
  simulationEvents?: readonly SimulationEvent[],
): Promise<ProactiveContext> {
  const allCheckins = await checkinsDb.listAll(profile.id);
  const today = todayLocal();
  const cutoff14 = addDays(today, -13);
  const recentCheckins = allCheckins.filter(c => c.occurred_on >= cutoff14);
  const allMessages = await messagesDb.listAll(profile.id);
  const sortedMessages = [...allMessages].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  const recentUserMessages = sortedMessages
    .filter(m => m.role === 'user')
    .slice(-10)
    .map(m => ({ content: m.content, created_at: m.created_at }));
  const lastChatAt = sortedMessages.length > 0
    ? sortedMessages[sortedMessages.length - 1].created_at
    : null;
  return {
    profile,
    recentCheckins,
    recentUserMessages,
    lastChatAt,
    mascotName,
    lifeState: lifeState ?? null,
    simulationEvents: simulationEvents ?? [],
  };
}
