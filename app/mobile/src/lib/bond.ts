/**
 * Vínculo do usuário com o mascote — XP de carinho acumulado.
 *
 * Diferente do XP de check-in (que vem de hábitos), o bond_xp soma com
 * gestos: tap, double-tap, long-press, pet (carinho contínuo). É o que
 * faz a criatura sentir "minha" — interações pequenas que constroem afeto
 * ao longo de semanas.
 *
 * Princípios:
 * - Sempre aditivo (sem culpa — gestos não regridem)
 * - Cap diário (impede grind: máx 100 XP/dia por gestos)
 * - Persistido em AsyncStorage por user_id
 * - Tracking por kind permite milestones tipo "1000 tappinhos"
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MascotGestureKind } from '@/analytics';

const TOTAL_KEY = (userId: string) => `mascote:bond:total:${userId}`;
const BY_KIND_KEY = (userId: string) => `mascote:bond:by_kind:${userId}`;
const DAILY_KEY = (userId: string, day: string) => `mascote:bond:daily:${userId}:${day}`;

const DAILY_CAP = 100;

const GESTURE_WEIGHT: Record<MascotGestureKind, number> = {
  tap: 1,
  double: 3,
  long: 2,
  pet: 1,
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function readNumber(key: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

async function readObject<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export interface BondTotals {
  total: number;
  today: number;
  todayCapped: boolean;
  byKind: Partial<Record<MascotGestureKind, number>>;
}

export async function getBondTotals(userId: string): Promise<BondTotals> {
  const today = todayKey();
  const [total, todayXp, byKind] = await Promise.all([
    readNumber(TOTAL_KEY(userId)),
    readNumber(DAILY_KEY(userId, today)),
    readObject<Partial<Record<MascotGestureKind, number>>>(BY_KIND_KEY(userId)),
  ]);
  return {
    total,
    today: todayXp,
    todayCapped: todayXp >= DAILY_CAP,
    byKind: byKind ?? {},
  };
}

/**
 * Incrementa vínculo. Respeita cap diário — gestos extras "anotam" pra
 * tracking por kind mas NÃO entram no total se já bateu cap.
 * Retorna o que efetivamente foi adicionado ao total.
 */
export async function incrementBond(
  userId: string,
  kind: MascotGestureKind,
): Promise<{ added: number; capped: boolean }> {
  const weight = GESTURE_WEIGHT[kind] ?? 1;
  const today = todayKey();
  const todayXp = await readNumber(DAILY_KEY(userId, today));
  const room = Math.max(0, DAILY_CAP - todayXp);
  const added = Math.min(weight, room);
  const capped = added < weight;

  try {
    if (added > 0) {
      const total = await readNumber(TOTAL_KEY(userId));
      await Promise.all([
        AsyncStorage.setItem(TOTAL_KEY(userId), String(total + added)),
        AsyncStorage.setItem(DAILY_KEY(userId, today), String(todayXp + added)),
      ]);
    }
    // by-kind cresce sempre — útil pra "interagiu 500 vezes" mesmo
    // depois do cap diário (pra não desencorajar quem brinca demais).
    const byKind = (await readObject<Partial<Record<MascotGestureKind, number>>>(BY_KIND_KEY(userId))) ?? {};
    byKind[kind] = (byKind[kind] ?? 0) + 1;
    await AsyncStorage.setItem(BY_KIND_KEY(userId), JSON.stringify(byKind));
  } catch {
    /* persistência é otimização — não trava UX */
  }
  return { added, capped };
}

/** Label de tier amigável pra UI. Limiares conservadores. */
export function bondTierLabel(total: number): string {
  if (total < 50) return 'Conhecendo';
  if (total < 200) return 'Conectados';
  if (total < 500) return 'Próximos';
  if (total < 1500) return 'Companheiros';
  return 'Inseparáveis';
}

export async function __resetBond(userId: string): Promise<void> {
  const today = todayKey();
  await Promise.all([
    AsyncStorage.removeItem(TOTAL_KEY(userId)),
    AsyncStorage.removeItem(DAILY_KEY(userId, today)),
    AsyncStorage.removeItem(BY_KIND_KEY(userId)),
  ]);
}
