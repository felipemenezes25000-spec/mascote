/**
 * Missões adicionais — catálogo expandido (300+ total com missions.ts).
 * Geradas proceduralmente por combinação hábito × variação × personalidade.
 */

import type { HabitKind, Personality } from '@/types';
import type { MissionTemplate } from './missions';
import type { MissionCategory } from './mission-meta';

const HABITS: HabitKind[] = [
  'water', 'sleep', 'exercise', 'meditation', 'reading',
  'journaling', 'breath', 'outdoor', 'sun',
];

const VARIATIONS: Record<HabitKind, string[]> = {
  water: ['Manhã', 'Tarde', 'Noite', 'Pós-exercício', 'Com refeição'],
  sleep: ['Cedo', 'Rotina', 'Sem tela', 'Escuro', 'Relaxante'],
  exercise: ['Leve', 'Moderado', 'Alongar', 'Caminhar', 'Dançar'],
  meditation: ['Curta', 'Guiada', 'Silenciosa', 'Respiração', 'Presença'],
  reading: ['1 página', '5 páginas', 'Artigo', 'Poesia', 'Sem feed'],
  journaling: ['Gratidão', 'Sentimento', 'Carta', 'Diário', 'Reflexão'],
  breath: ['3 vezes', '4-7-8', 'Caixa', 'Suspiro', 'Consciente'],
  outdoor: ['Janela', 'Esquina', 'Parque', 'Natureza', 'Ar livre'],
  sun: ['Manhã', 'Tarde', 'Pôr-do-sol', 'Vitamina D', 'Rosto'],
};

const ALL_PERSONALITIES: Personality[] = ['calmo', 'motivador', 'fofo', 'sabio'];

function xpForHabit(h: HabitKind): number {
  const map: Partial<Record<HabitKind, number>> = {
    exercise: 25, meditation: 25, sleep: 25, reading: 15, sun: 15,
  };
  return map[h] ?? 10;
}

const SPECIAL_CATEGORIES: { suffix: string; category: MissionCategory; xpBonus: number }[] = [
  { suffix: 'return', category: 'return_after_failure', xpBonus: 5 },
  { suffix: 'weekly', category: 'weekly_challenge', xpBonus: 15 },
  { suffix: 'surprise', category: 'surprise', xpBonus: 8 },
];

/** Gera entradas únicas até atingir `count`. */
export function generateExtendedMissions(count: number): MissionTemplate[] {
  const result: MissionTemplate[] = [];
  let i = 0;
  while (result.length < count) {
    const habit = HABITS[i % HABITS.length]!;
    const vars = VARIATIONS[habit];
    const variation = vars[Math.floor(i / HABITS.length) % vars.length]!;
    const special = i % 17 === 0 ? SPECIAL_CATEGORIES[i % SPECIAL_CATEGORIES.length]! : null;
    const id = special
      ? `m-ext-${habit}-${special.suffix}-${i}`
      : `m-ext-${habit}-${i}`;
    if (!result.some(r => r.id === id)) {
      const xp = xpForHabit(habit) + (i % 10) + (special?.xpBonus ?? 0);
      result.push({
        id,
        title: `${habitMetaLabel(habit)} — ${variation}`,
        description: `Micro-missão de ${habitMetaLabel(habit).toLowerCase()} (${variation}).`,
        habit_kind: habit,
        target_value: i % 3 === 0 ? null : (i % 5) + 1,
        xp_reward: xp,
        preferred_personalities: [ALL_PERSONALITIES[i % 4]!],
        category: special?.category,
        tier: xp >= 40 ? 'premium' : 'free',
        repeatable: special?.category !== 'weekly_challenge',
        cooldown_hours: special?.category === 'weekly_challenge' ? 168 : 24,
        tags: [habit, special?.category ?? habit],
      });
    }
    i += 1;
    if (i > count * 3) break;
  }
  return result;
}

function habitMetaLabel(h: HabitKind): string {
  const labels: Record<HabitKind, string> = {
    water: 'Água', sleep: 'Sono', exercise: 'Movimento', meditation: 'Meditação',
    reading: 'Leitura', journaling: 'Escrita', breath: 'Respiração',
    outdoor: 'Ar livre', sun: 'Sol',
  };
  return labels[h];
}

export const extendedMissionCatalog: MissionTemplate[] = generateExtendedMissions(250);
