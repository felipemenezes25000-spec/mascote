/**
 * Subscriber CreatureMomentService → Unity bridge.
 *
 * Inscreve handlers no bus de moments e converte cada um em `event.play`
 * postado na ponte Unity. Idempotente: registrar duas vezes é no-op.
 *
 * Princípio: Unity NÃO consome moments diretos (que são PT-BR + opacos pro C#).
 * O subscriber traduz para o vocabulário canônico do contrato (`UnityHabitKind`,
 * `UnityMascotPhase`, etc.) antes de enviar.
 */

import { creatureMoments } from '@/lib/moments';
import type { Moment } from '@/lib/moments/types';
import { mapHabit, mapPhase } from '@/core/mascot-render-contract';
import type {
  UnityHabitKind,
  UnityMascotEvent,
  UnityMascotPhase,
} from '@/core/mascot-render-contract';
import { sendEventPlay } from './unityMessageMapper';
import { unityMascotBridge } from './UnityMascotBridge';
import { logger } from '@/lib/logger';
import type { HabitKind, MascotPhase } from '@/types';

let registered = false;
let unsubscribers: Array<() => void> = [];

/**
 * Mapeia o nome do moment ao tipo `UnityHabitKind` quando aplicável.
 * Retorna null se o moment não é de hábito.
 */
function momentToHabitKind(name: string): UnityHabitKind | null {
  if (!name.startsWith('habit.')) return null;
  const suffix = name.slice('habit.'.length) as HabitKind;
  try {
    return mapHabit(suffix);
  } catch {
    return null;
  }
}

function momentToUnityEvent(moment: Moment): UnityMascotEvent | null {
  // Hábitos individuais (habit.water, habit.sleep, etc.)
  const habit = momentToHabitKind(moment.name);
  if (habit) {
    const intensity =
      'intensity' in moment.payload && typeof moment.payload.intensity === 'number'
        ? moment.payload.intensity
        : undefined;
    return { kind: 'habit', habit, intensity };
  }

  if (moment.name === 'checkin.completed') {
    const p = moment.payload as { habit: HabitKind; xpGained: number };
    return { kind: 'checkin.completed', habit: mapHabit(p.habit), xpGained: p.xpGained };
  }

  if (moment.name === 'phase.advanced') {
    const p = moment.payload as { from: string; to: string };
    return {
      kind: 'phase.advanced',
      from: tryMapPhase(p.from),
      to: tryMapPhase(p.to),
    };
  }

  if (moment.name === 'mutation.unlocked') {
    const p = moment.payload as { mutationId: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' };
    return { kind: 'mutation.unlocked', mutationId: p.mutationId, rarity: p.rarity };
  }

  if (moment.name === 'accessory.equipped') {
    const p = moment.payload as { accessoryId: string };
    return { kind: 'custom', name: 'accessory.equipped', payload: { accessoryId: p.accessoryId } };
  }

  if (moment.name === 'streak.milestone') {
    const p = moment.payload as { days: number; isFirst: boolean };
    return { kind: 'custom', name: 'streak.milestone', payload: { days: p.days, isFirst: p.isFirst } };
  }

  // Moments puramente de UI (chat.reply_received, customization.changed, etc.)
  // não disparam reação Unity por enquanto — voltam à mesa quando houver
  // animação dedicada.
  return null;
}

function tryMapPhase(raw: string): UnityMascotPhase {
  try {
    const mapped = mapPhase(raw as MascotPhase);
    // mapPhase retorna undefined em chave inválida (não throw) — pega aqui.
    return mapped ?? 'adult';
  } catch {
    return 'adult';
  }
}

/**
 * Registra todos os handlers necessários. Chamado uma vez no startup da app
 * (ex: dentro do `_layout.tsx` raiz). Devolve unsubscribe para desligar em tests.
 */
export function registerUnityMomentSubscriber(): () => void {
  if (registered) {
    return () => {};
  }
  registered = true;

  const handler = (moment: Moment): void => {
    if (!unityMascotBridge.isNativeAvailable() && !__DEV__) {
      // Em produção sem Unity nativo, não custa nada — postToUnity é no-op no stub.
      // Mas evitamos o trabalho de mapeamento.
      return;
    }
    const event = momentToUnityEvent(moment);
    if (!event) return;
    try {
      sendEventPlay(event);
    } catch (err) {
      logger.warn('[unityMomentSubscriber] failed to post event', {
        moment: moment.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Inscreve em TODOS os moments (filter:null). O handler decide se converte.
  const unsub = creatureMoments.subscribe({
    filter: null,
    handler,
    label: 'unity-bridge',
  });

  unsubscribers.push(unsub);

  return () => {
    for (const u of unsubscribers) u();
    unsubscribers = [];
    registered = false;
  };
}

/** Test helper — reseta estado interno. */
export function _resetUnitySubscriberForTests(): void {
  for (const u of unsubscribers) u();
  unsubscribers = [];
  registered = false;
}
