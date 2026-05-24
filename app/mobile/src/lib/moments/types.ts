/**
 * Moments — eventos semânticos do mascote.
 *
 * Em vez de cada handler decidir solo "anima, toca som, salva memória,
 * trackeia analytics", o caller emite um MOMENT e inscritos reagem em
 * paralelo. Acopla menos, conecta mais.
 *
 * **Filosofia:** moments NUNCA são "infra" (network errors, log levels).
 * São coisas que o mascote VIVENCIA — um check-in, uma mutação, uma
 * memória nova. Se for evento puramente técnico, use logger/telemetry.
 */

import type { HabitKind, MascotMood, SafetyFlag } from '@/types';

/**
 * Catálogo de moments. Cada caller usa `emit('habit.water', { ... })`.
 * Adicionar novos: estenda o objeto + o tipo de payload abaixo.
 */
export const MOMENT_NAMES = {
  // Núcleo de check-in/hábito
  'checkin.completed': 'checkin.completed',
  'habit.water': 'habit.water',
  'habit.sleep': 'habit.sleep',
  'habit.exercise': 'habit.exercise',
  'habit.meditation': 'habit.meditation',
  'habit.reading': 'habit.reading',
  'habit.breath': 'habit.breath',
  'habit.outdoor': 'habit.outdoor',
  'habit.sun': 'habit.sun',
  'habit.journaling': 'habit.journaling',

  // Conversação
  'chat.memory_saved': 'chat.memory_saved',
  'chat.reply_received': 'chat.reply_received',

  // Engajamento
  'mission.completed': 'mission.completed',
  'streak.milestone': 'streak.milestone',
  'streak.recovered': 'streak.recovered',

  // Evolução
  'mutation.unlocked': 'mutation.unlocked',
  'phase.advanced': 'phase.advanced',
  'microevolution.observed': 'microevolution.observed',

  // Personalização / Mundo
  'customization.changed': 'customization.changed',
  'scene.changed': 'scene.changed',
  'accessory.equipped': 'accessory.equipped',

  // Retorno
  'user.returned': 'user.returned',

  // Gestos na Home (pet, double-tap)
  'gesture.pet': 'gesture.pet',
  'gesture.double': 'gesture.double',
} as const;

export type MomentName = keyof typeof MOMENT_NAMES;

/** Payload tipado por moment — adicionar novos aqui pra forçar contrato. */
export interface MomentPayloads {
  'checkin.completed': { habit: HabitKind; intensity?: number; xpGained: number };
  'habit.water': { intensity?: number };
  'habit.sleep': { intensity?: number; hoursLogged?: number };
  'habit.exercise': { intensity?: number };
  'habit.meditation': { intensity?: number; minutes?: number };
  'habit.reading': { intensity?: number; minutes?: number };
  'habit.breath': { intensity?: number; cycles?: number };
  'habit.outdoor': { intensity?: number; minutes?: number };
  'habit.sun': { intensity?: number };
  'habit.journaling': { intensity?: number; wordCount?: number };

  'chat.memory_saved': { kind: string; summary: string };
  'chat.reply_received': { source: 'mock' | 'fallback' | 'openai' | 'proxy'; safety_flag: SafetyFlag };

  'mission.completed': { missionId: string; xpGained: number; coinsGained: number };
  'streak.milestone': { days: number; isFirst: boolean };
  'streak.recovered': { previousDays: number; gapDays: number };

  'mutation.unlocked': { mutationId: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' };
  'phase.advanced': { from: string; to: string };
  'microevolution.observed': { kind: string; description: string };

  'customization.changed': { field: string; from: unknown; to: unknown };
  'scene.changed': { sceneId: string };
  'accessory.equipped': { accessoryId: string };

  'user.returned': { daysAway: number; mood?: MascotMood };

  'gesture.pet': { intensity?: number };
  'gesture.double': Record<string, never>;
}

/** Helper: combina nome + payload tipado em uma união discriminada. */
export type Moment = {
  [K in MomentName]: { name: K; payload: MomentPayloads[K]; ts: number };
}[MomentName];

/**
 * Handler genérico — recebe moment tipado, decide o que fazer.
 * Handlers DEVEM ser puros / no-throw — se quebrar, o bus segue chamando os
 * outros. (Try/catch interno no dispatcher.)
 */
export type MomentHandler = (moment: Moment) => void | Promise<void>;

/**
 * Subscriber pode filtrar por nome ou listar — null = todos.
 */
export interface MomentSubscription {
  /** Lista de moments que interessam, ou null pra todos. */
  filter: readonly MomentName[] | null;
  /** Função invocada. */
  handler: MomentHandler;
  /** Identificador legível pra debug — opcional. */
  label?: string;
}
