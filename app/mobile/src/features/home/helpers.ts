/**
 * Pequenos helpers usados só na Home — extraídos para reduzir a Home file.
 */
import { t } from '@/lib/i18n';
import type { EmotionKey } from '@/lib/themes';
import type { MascotMood } from '@/types';

export function greetingFor(hour: number): string {
  if (hour < 5) return t('home.screen.greeting_dawn');
  if (hour < 12) return t('home.screen.greeting_morning');
  if (hour < 18) return t('home.screen.greeting_afternoon');
  return t('home.screen.greeting_evening');
}

/** Saudação curta para headers estreitos (<412px) — evita truncar "BOA MADRUGADA". */
export function greetingForCompact(hour: number): string {
  if (hour < 5) return t('home.screen.greeting_dawn_compact');
  if (hour < 12) return t('home.screen.greeting_morning_compact');
  if (hour < 18) return t('home.screen.greeting_afternoon_compact');
  return t('home.screen.greeting_evening_compact');
}

export function moodToEmotionKey(mood: MascotMood): EmotionKey {
  switch (mood) {
    case 'feliz': return 'happy';
    case 'empolgado': return 'excited';
    case 'triste': return 'sad';
    case 'exausto': return 'tired';
    case 'ok':
    default: return 'idle';
  }
}

export function buildMascotStatusFallback(
  reflective: MascotMood | null,
  hasActiveEnergy: boolean,
  hasCalmAura: boolean,
): string {
  if (hasActiveEnergy) return t('home.screen.status_active_energy');
  if (hasCalmAura) return t('home.screen.status_calm_aura');
  if (reflective === 'empolgado') return t('home.screen.status_excited');
  if (reflective === 'triste') return t('home.screen.status_sad');
  if (reflective === 'exausto') return t('home.screen.status_tired');
  return t('home.screen.status_default');
}

export const HOME_HABITS = [
  'water',
  'sleep',
  'exercise',
  'breath',
  'meditation',
  'reading',
  'journaling',
  'outdoor',
  'sun',
] as const;
