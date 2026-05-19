import type { BillingTierId } from '@/content/billing';
import type { Mascot, MascotPhase } from '@/types';

export const XP_PER_CHECKIN = 10;
export const XP_DAILY_CAP = 150;
export const XP_FIRST_OF_DAY_BONUS = 5;

export const PHASE_THRESHOLDS: Array<{ phase: MascotPhase; xp: number }> = [
  { phase: 'ovo', xp: 0 },
  { phase: 'bebe', xp: 100 },
  { phase: 'crianca', xp: 500 },
  { phase: 'adolescente', xp: 2000 },
  { phase: 'adulto', xp: 8000 },
  { phase: 'evoluido', xp: 25000 },
];

/**
 * XP cumulativo necessário pra ALCANÇAR o nível n.
 * Nível 1: 0 XP (origem). Nível 2: 50. Nível 3: 150. Nível 4: 300...
 * Fórmula: 50 * (n-1) * n / 2 — soma triangular começando do 1.
 */
export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  return Math.floor((50 * (n - 1) * n) / 2);
}

// Cap defensivo para evitar loop infinito se xp não for finito.
const MAX_LEVEL = 999;

export function levelFromXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function phaseFromXp(xp: number): MascotPhase {
  let phase: MascotPhase = 'ovo';
  for (const t of PHASE_THRESHOLDS) {
    if (xp >= t.xp) phase = t.phase;
  }
  return phase;
}

export function xpToNextLevel(xp: number): { current: number; needed: number; progress: number } {
  const level = levelFromXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const current = xp - currentLevelXp;
  const needed = nextLevelXp - currentLevelXp;
  /* v8 ignore next — needed=0 só ocorre em MAX_LEVEL (xp>=xpForLevel(999));
     guard previne div-by-zero em corner case extremo. */
  return { current, needed, progress: needed > 0 ? current / needed : 1 };
}

export interface ApplyXpResult {
  mascot: Mascot;
  delta: number;
  leveledUp: boolean;
  phaseChanged: boolean;
  prevPhase: MascotPhase;
}

export function applyXp(mascot: Mascot, deltaRaw: number, dailyXpAlready: number): ApplyXpResult {
  // Sanitiza inputs: nunca aceita XP negativo, NaN, Infinity, nem ultrapassa o cap diário.
  // Math.floor(NaN) = NaN, Math.max(0, NaN) = NaN — então NaN viraria poison.
  // Trata explicitamente NaN/!finite como 0.
  const deltaFinite = Number.isFinite(deltaRaw) ? deltaRaw : 0;
  const safeDelta = Math.max(0, Math.floor(deltaFinite));
  /* v8 ignore next — dailyXpAlready vem de checkins.xpSumToday() que retorna
     soma de inteiros não-negativos; ambas branches são testadas em pentests
     mas v8 conta como 1 statement. */
  const safeAlready = Number.isFinite(dailyXpAlready) ? Math.max(0, dailyXpAlready) : 0;
  const remaining = Math.max(0, XP_DAILY_CAP - safeAlready);
  const delta = Math.min(remaining, safeDelta);
  const prevXp = mascot.xp;
  const prevLevel = mascot.level;
  const prevPhase = mascot.phase;
  const nextXp = prevXp + delta;
  const nextLevel = levelFromXp(nextXp);
  // Phase é monotonicamente crescente — NUNCA regride. Se estado persistido
  // estiver inconsistente (e.g., phase='bebe' com xp=0 vindo de seed corrompido
  // ou downgrade de threshold), `phaseFromXp(15)` retornaria 'ovo' e o
  // `phaseChanged` dispararia o modal celebrando uma evolução PRA TRÁS.
  // Aqui só promove se o derivado do XP for >= ao salvo.
  const derivedPhase = phaseFromXp(nextXp);
  const nextPhase = phaseRank(derivedPhase) >= phaseRank(prevPhase) ? derivedPhase : prevPhase;
  // Aplica energy boost ANTES de derivar mood, pra que o boost seja
  // refletido no humor (ex.: 75 → 85 deve virar 'empolgado').
  const nextEnergy = Math.min(100, Math.max(0, mascot.energy) + 10);
  const updated: Mascot = {
    ...mascot,
    xp: nextXp,
    level: nextLevel,
    phase: nextPhase,
    energy: nextEnergy,
    mood: deriveMoodFromEnergy(nextEnergy),
    last_seen_at: new Date().toISOString(),
  };
  return {
    mascot: updated,
    delta,
    leveledUp: nextLevel > prevLevel,
    // Mesmo critério monotônico: phaseChanged só celebra avanços. Se o estado
    // persistido era mais alto que o XP sustenta, mantém o phase salvo e
    // não chama de "evolução".
    phaseChanged: phaseRank(nextPhase) > phaseRank(prevPhase),
    prevPhase,
  };
}

export function phaseRank(p: MascotPhase): number {
  // Match PHASE_THRESHOLDS order. Indexar via findIndex evita repetir o array.
  const i = PHASE_THRESHOLDS.findIndex(t => t.phase === p);
  /* v8 ignore next — fallback defensivo: phase do union type sempre bate. */
  return i < 0 ? 0 : i;
}

const TIER_MAX_PHASE: Record<BillingTierId, MascotPhase> = {
  free: 'adolescente',
  plus_monthly: 'evoluido',
  plus_annual: 'evoluido',
};

/** Limita fase ao teto do tier (free = adolescente). XP continua acumulando. */
export function clampMascotPhaseForTier(mascot: Mascot, tier: BillingTierId): Mascot {
  const maxPhase = TIER_MAX_PHASE[tier] ?? 'evoluido';
  if (phaseRank(mascot.phase) <= phaseRank(maxPhase)) return mascot;
  return { ...mascot, phase: maxPhase };
}

function deriveMoodFromEnergy(energy: number): Mascot['mood'] {
  if (energy >= 80) return 'empolgado';
  if (energy >= 50) return 'feliz';
  return 'ok';
}

export function deriveMoodFromState(mascot: Mascot, hoursSinceCheckin: number): Mascot['mood'] {
  if (hoursSinceCheckin >= 72) return 'exausto';
  if (hoursSinceCheckin >= 36) return 'triste';
  if (mascot.energy < 20) return 'triste';
  if (mascot.energy >= 80) return 'empolgado';
  if (mascot.energy >= 50) return 'feliz';
  return 'ok';
}
