/**
 * Geração procedural de missões via heurísticas locais (sem API).
 */

import type { HabitKind, Personality } from '@/types';
import { missionCatalog, type MissionTemplate } from '@/content/missions';
import { mulberry32 } from '@/lib/dna/genome';

export function generateMissionSuggestion(
  personality: Personality,
  seed: number,
  recentHabits: HabitKind[] = [],
): MissionTemplate {
  const rng = mulberry32(seed);
  const preferred = missionCatalog.filter(m =>
    m.preferred_personalities.includes(personality),
  );
  const pool = preferred.length > 0 ? preferred : [...missionCatalog];

  if (recentHabits.length > 0) {
    const habit = recentHabits[Math.floor(rng() * recentHabits.length)]!;
    const habitPool = pool.filter(m => m.habit_kind === habit);
    if (habitPool.length > 0) {
      return habitPool[Math.floor(rng() * habitPool.length)]!;
    }
  }
  return pool[Math.floor(rng() * pool.length)]!;
}
