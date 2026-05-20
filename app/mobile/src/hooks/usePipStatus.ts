/**
 * usePipStatus — fonte ÚNICA da verdade para o status do mascote (Pip).
 *
 * Por que existe: a UI hoje espalha 3 representações do mesmo dado em vários
 * componentes (HomeHeader, EvolutionModal, profile.tsx, mascot.tsx):
 *  - "bebê" (phase label)
 *  - "nível 4 · Pip" (level + name)
 *  - "nv 4 · Cristal 15%" (level + archetype)
 *
 * O crítico externo notou essa inconsistência. Esse hook consolida tudo numa
 * struct única + helpers de formatação. Componentes novos devem usar o hook;
 * componentes antigos podem migrar gradualmente.
 *
 * Não persiste estado — só DERIVA do `useStore.mascot` + `xp` + `dna`.
 */

import { useMemo } from 'react';
import { getArchetype, sanitizeGenome } from '@/lib/dna';
import type { ArchetypeKey, Genome } from '@/lib/dna';
import { phaseLabels } from '@/lib/phaseLabels';
import { levelFromXp, phaseFromXp, xpToNextLevel } from '@/lib/xp';
import { useStore } from '@/store';
import type { Mascot, MascotMood, MascotPhase } from '@/types';

export interface PipStatus {
  /** Existe um mascote hidratado? */
  ready: boolean;
  /** Nome dado pelo usuário no onboarding. */
  name: string;
  /** Phase macro derivada do XP (NUNCA regride). */
  phase: MascotPhase;
  /** Label PT-BR da phase ("bebê", "criança", ...). */
  phaseLabel: string;
  /** Level numérico derivado da fórmula triangular. */
  level: number;
  /** XP cumulativo (mesmo do persistido). */
  xp: number;
  /** Progresso pro próximo level: { current, needed, progress: 0..1 }. */
  nextLevel: { current: number; needed: number; progress: number };
  /** Arquétipo emergente (gene dominante). */
  archetype: ArchetypeKey;
  /** Nome PT-BR do arquétipo ("O Acolhedor", "O Guardião", ...). */
  archetypeName: string;
  /** Porcentagem 0..100 do gene dominante. */
  archetypePct: number;
  /** Humor atual (snake_case). */
  mood: MascotMood;
  /** Energy 0..100. */
  energy: number;
  /** Linha compacta para chips ("nv 4 · O Acolhedor 65%"). */
  compactLine: string;
  /** Genome sanitizado (defensive). */
  genome: Genome | null;
  /** Mascote bruto pra casos que precisam. */
  mascot: Mascot | null;
}

const EMPTY: PipStatus = {
  ready: false,
  name: '',
  phase: 'ovo',
  phaseLabel: 'ovo',
  level: 1,
  xp: 0,
  nextLevel: { current: 0, needed: 50, progress: 0 },
  archetype: 'empathy',
  archetypeName: 'O Acolhedor',
  archetypePct: 50,
  mood: 'ok',
  energy: 50,
  compactLine: '',
  genome: null,
  mascot: null,
};

/**
 * Hook reativo — re-renderiza quando mascot muda na store.
 * Use em qualquer screen que mostre nome/level/phase/archetype.
 */
export function usePipStatus(): PipStatus {
  const mascot = useStore(s => s.mascot);
  return useMemo(() => derivePipStatus(mascot), [mascot]);
}

/**
 * Pura — útil para testes ou cálculos fora de React. Mesma lógica do hook.
 */
export function derivePipStatus(mascot: Mascot | null): PipStatus {
  if (!mascot) return EMPTY;

  const xp = mascot.xp;
  const level = levelFromXp(xp);
  const phase = phaseFromXp(xp);
  const phaseLabel = phaseLabels[phase] ?? phase;
  const nextLevel = xpToNextLevel(xp);

  const genome = mascot.dna ? sanitizeGenome(mascot.dna) : null;
  const archetypeInfo = genome ? getArchetype(genome) : null;
  const archetype = archetypeInfo?.key ?? 'empathy';
  const archetypeName = archetypeInfo?.name ?? 'O Acolhedor';
  const archetypePct = genome ? Math.round(genome[archetype] * 100) : 50;

  const compactLine = genome
    ? `nv ${level} · ${archetypeName} ${archetypePct}%`
    : `nv ${level} · ${phaseLabel}`;

  return {
    ready: true,
    name: mascot.name,
    phase,
    phaseLabel,
    level,
    xp,
    nextLevel,
    archetype,
    archetypeName,
    archetypePct,
    mood: mascot.mood,
    energy: mascot.energy,
    compactLine,
    genome,
    mascot,
  };
}
