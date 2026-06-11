/**
 * Zen Match — barrel do módulo match-3.
 *
 * Reexporta engine pura, peças, geração de níveis, e o helperzinho de
 * progresso (maior fase liberada por usuário, em AsyncStorage). Mantido aqui
 * pra não tocar em src/lib/db e conflitar com outros agentes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEVEL_COUNT } from './levels';

export * from './pieces';
export * from './engine';
export * from './levels';

/** Chave por usuário (anônimo cai em 'local'). */
function progressKey(userId: string | null | undefined): string {
  const id = userId && userId.length ? userId : 'local';
  return `mascote:zenmatch:${id}`;
}

/**
 * Lê a maior fase liberada (1-based). Default 1 (todo mundo começa na fase 1).
 * Nunca crasha: storage ausente/corrompido → 1.
 */
export async function loadZenProgress(userId: string | null | undefined): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(progressKey(userId));
    if (!raw) return 1;
    const v = parseInt(raw, 10);
    if (!Number.isFinite(v) || v < 1) return 1;
    return Math.min(LEVEL_COUNT, v);
  } catch {
    return 1;
  }
}

/**
 * Libera a próxima fase: grava `max(atual, completedLevel + 1)`.
 * Idempotente e monotônico (nunca regride o progresso). Best-effort: falha de
 * storage é silenciosa (o jogo continua jogável).
 */
export async function unlockNextLevel(
  userId: string | null | undefined,
  completedLevel: number,
): Promise<number> {
  const completed = Number.isFinite(completedLevel)
    ? Math.max(1, Math.min(LEVEL_COUNT, Math.floor(completedLevel)))
    : 1;
  const nextUnlocked = Math.min(LEVEL_COUNT, completed + 1);
  try {
    const current = await loadZenProgress(userId);
    const merged = Math.max(current, nextUnlocked);
    await AsyncStorage.setItem(progressKey(userId), String(merged));
    return merged;
  } catch {
    return nextUnlocked;
  }
}
