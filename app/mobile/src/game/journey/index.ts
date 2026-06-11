import { accessoryCatalog } from '@/content/accessories';
import { scenesCatalog } from '@/content/scenes';
import { xpForLevel } from '@/lib/xp';
import type { BillingTierId } from '@/content/billing';
import type { JourneyPhase, JourneyProgress, WorldMeta } from './types';
import { getWorld, JOURNEY_PHASES, JOURNEY_WORLDS } from './worlds';

export * from './types';
export {
  getPhase,
  getWorld,
  JOURNEY_PHASES,
  JOURNEY_WORLDS,
  MINIGAME_UNLOCK_PHASES,
  phasesForWorld,
} from './worlds';

/**
 * Fase da jornada como função PURA do XP cumulativo.
 * Monotônica, defensiva contra NaN (mesmo princípio de phaseFromXp).
 */
export function journeyPhaseFromXp(xp: number): JourneyPhase {
  const safe = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  let current = JOURNEY_PHASES[0];
  for (const p of JOURNEY_PHASES) {
    if (safe >= p.xp) current = p;
    else break;
  }
  return current;
}

/** Progresso completo: fase, mundo, próxima fase e barra 0..1. */
export function journeyProgress(xp: number): JourneyProgress {
  const safe = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const phase = journeyPhaseFromXp(safe);
  const world = getWorld(phase.worldId);
  const nextPhase = phase.n < JOURNEY_PHASES.length ? JOURNEY_PHASES[phase.n] : null;
  const xpIntoPhase = safe - phase.xp;
  const xpNeededForNext = nextPhase ? nextPhase.xp - phase.xp : 0;
  return {
    phase,
    world,
    nextPhase,
    xpIntoPhase,
    xpNeededForNext,
    progress: nextPhase && xpNeededForNext > 0
      ? Math.min(1, xpIntoPhase / xpNeededForNext)
      : 1,
  };
}

/**
 * Mundos 9-10 são premium: o resgate das recompensas dessas fases exige
 * entitlement. XP continua acumulando pra todos — assinar depois libera
 * tudo retroativamente (sem perda, sem punição).
 */
export function isPhaseClaimableForTier(phase: JourneyPhase, tier: BillingTierId): boolean {
  const world = getWorld(phase.worldId);
  if (!world.premium) return true;
  return tier !== 'free';
}

export interface CatalogMilestone {
  /** Fase aproximada da jornada onde este item do catálogo destrava. */
  phaseN: number;
  kind: 'accessory' | 'scene';
  id: string;
  name: string;
  emoji: string;
  /** Condição real do unlock (level/streak) — exibida como está. */
  unlockLabel: string;
  premium: boolean;
}

/**
 * Posiciona acessórios e cenários EXISTENTES (unlock por level) no mapa da
 * jornada, traduzindo o nível do unlock pro XP cumulativo correspondente e
 * daí pra fase. Itens de streak não têm fase determinística (dependem de
 * constância, não de XP) — ficam fora do mapa e continuam no closet.
 *
 * Importante: isso NÃO cria caminho novo de unlock. O closet continua dono
 * da regra; o mapa apenas mostra "o que vem por aí" pra alimentar o
 * sentimento de "estou quase desbloqueando algo".
 */
export function catalogMilestones(): CatalogMilestone[] {
  const out: CatalogMilestone[] = [];
  for (const a of accessoryCatalog) {
    if (a.unlock.kind !== 'level') continue;
    const phase = journeyPhaseFromXp(xpForLevel(a.unlock.value));
    out.push({
      phaseN: phase.n,
      kind: 'accessory',
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      unlockLabel: a.unlock.label,
      premium: a.premium === true,
    });
  }
  for (const s of scenesCatalog) {
    if (s.unlock.kind !== 'level' || s.isDefault) continue;
    const phase = journeyPhaseFromXp(xpForLevel(s.unlock.value));
    out.push({
      phaseN: phase.n,
      kind: 'scene',
      id: s.id,
      name: s.name,
      emoji: s.emoji,
      unlockLabel: s.unlock.label,
      premium: s.premium,
    });
  }
  return out.sort((a, b) => a.phaseN - b.phaseN);
}

/**
 * O "próximo desbloqueio" pra Home: o que vem primeiro entre a próxima
 * fase da jornada e o próximo marco de catálogo. É a peça central da
 * sensação "falta pouco".
 */
export interface NextUnlockTeaser {
  /** Ex.: "Fase 7 · Voz descoberta" ou "Coroa dourada". */
  title: string;
  /** Ex.: "Baú especial te esperando" ou "Alcance o nível 10". */
  detail: string;
  emoji: string;
  /** XP que falta (quando derivável de XP; null pra marcos de streak). */
  xpRemaining: number | null;
}

export function nextUnlockTeaser(xp: number): NextUnlockTeaser | null {
  const prog = journeyProgress(xp);
  if (!prog.nextPhase) return null;
  const next = prog.nextPhase;
  const world = getWorld(next.worldId);
  const milestone = catalogMilestones().find(m => m.phaseN === next.n);
  if (milestone) {
    return {
      title: milestone.name,
      detail: milestone.unlockLabel,
      emoji: milestone.emoji,
      xpRemaining: next.xp - xp,
    };
  }
  return {
    title: `Fase ${next.n} · ${next.title}`,
    detail: next.reward.label,
    emoji: next.n % 10 === 0 ? world.emoji : next.reward.kind === 'chest' ? '🎁' : '✨',
    xpRemaining: next.xp - xp,
  };
}

/** Títulos honoríficos já conquistados (derivado puro do XP). */
export function earnedTitles(xp: number): string[] {
  const phase = journeyPhaseFromXp(xp);
  return JOURNEY_PHASES
    .filter(p => p.n <= phase.n && p.reward.kind === 'title' && p.reward.title)
    .map(p => p.reward.title as string);
}

/** Minigames desbloqueados pelo XP atual (derivado puro). */
export function unlockedMinigames(xp: number): string[] {
  const phase = journeyPhaseFromXp(xp);
  return JOURNEY_PHASES
    .filter(p => p.n <= phase.n && p.reward.kind === 'minigame' && p.reward.minigameId)
    .map(p => p.reward.minigameId as string);
}

/** Mundo atual + todos os mundos com estado (pra tela do mapa). */
export interface WorldMapEntry {
  world: WorldMeta;
  state: 'completed' | 'current' | 'locked';
}

export function worldMap(xp: number): WorldMapEntry[] {
  const current = journeyPhaseFromXp(xp);
  return JOURNEY_WORLDS.map(w => ({
    world: w,
    state: current.n > w.lastPhase
      ? 'completed' as const
      : current.n >= w.firstPhase
        ? 'current' as const
        : 'locked' as const,
  }));
}
