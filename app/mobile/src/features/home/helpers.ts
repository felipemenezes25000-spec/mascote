/**
 * Pequenos helpers usados só na Home — extraídos para reduzir a Home file.
 */
import type { EmotionKey } from '@/lib/themes';
import type { MascotMood } from '@/types';

export function greetingFor(hour: number): string {
  if (hour < 5) return 'BOA MADRUGADA';
  if (hour < 12) return 'BOM DIA';
  if (hour < 18) return 'BOA TARDE';
  return 'BOA NOITE';
}

/** Saudação curta para headers estreitos (<380px) — evita truncar "BOA MADRUGADA". */
export function greetingForCompact(hour: number): string {
  if (hour < 5) return 'Madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
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
  if (hasActiveEnergy) return 'Com energia — seus hábitos ativos brilham nele.';
  if (hasCalmAura) return 'Calmo e presente — respira com você.';
  if (reflective === 'empolgado') return 'Radiante — sentiu sua energia hoje!';
  if (reflective === 'triste') return 'Um pouco quieto... mas aqui por você.';
  if (reflective === 'exausto') return 'Precisando de descanso — sem pressa.';
  return 'Aqui, no seu ritmo.';
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
