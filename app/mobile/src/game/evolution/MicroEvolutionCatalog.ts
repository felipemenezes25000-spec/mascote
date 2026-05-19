/**
 * Catálogo de microevoluções — mudanças visuais incrementais por hábito.
 */

import type { HabitKind } from '@/types';

export interface MicroEvolutionEntry {
  id: string;
  label: string;
  magnitude: number;
  habitAffinity?: HabitKind;
  requiredCheckins: number;
}

export const MICRO_EVOLUTION_CATALOG: readonly MicroEvolutionEntry[] = [
  // água
  { id: 'micro-water-shimmer', label: 'Brilho hidratado', magnitude: 0.08, habitAffinity: 'water', requiredCheckins: 1 },
  { id: 'micro-water-ripple', label: 'Ondas suaves na aura', magnitude: 0.12, habitAffinity: 'water', requiredCheckins: 5 },
  { id: 'micro-water-crystal', label: 'Cristais de orvalho', magnitude: 0.18, habitAffinity: 'water', requiredCheckins: 15 },
  { id: 'micro-water-tide', label: 'Maré gentil no corpo', magnitude: 0.22, habitAffinity: 'water', requiredCheckins: 30 },
  // sono
  { id: 'micro-sleep-drowse', label: 'Olhos sonolentos', magnitude: 0.08, habitAffinity: 'sleep', requiredCheckins: 1 },
  { id: 'micro-sleep-cloud', label: 'Nuvem de descanso', magnitude: 0.14, habitAffinity: 'sleep', requiredCheckins: 5 },
  { id: 'micro-sleep-moon', label: 'Marca lunar', magnitude: 0.2, habitAffinity: 'sleep', requiredCheckins: 15 },
  { id: 'micro-sleep-dream', label: 'Partículas de sonho', magnitude: 0.25, habitAffinity: 'sleep', requiredCheckins: 30 },
  // exercício
  { id: 'micro-exercise-warm', label: 'Calor pós-movimento', magnitude: 0.08, habitAffinity: 'exercise', requiredCheckins: 1 },
  { id: 'micro-exercise-stride', label: 'Passo mais firme', magnitude: 0.14, habitAffinity: 'exercise', requiredCheckins: 5 },
  { id: 'micro-exercise-spark', label: 'Faíscas de energia', magnitude: 0.2, habitAffinity: 'exercise', requiredCheckins: 15 },
  { id: 'micro-exercise-peak', label: 'Contorno atlético', magnitude: 0.26, habitAffinity: 'exercise', requiredCheckins: 30 },
  // meditação
  { id: 'micro-meditation-breath', label: 'Respiração visível', magnitude: 0.08, habitAffinity: 'meditation', requiredCheckins: 1 },
  { id: 'micro-meditation-lotus', label: 'Aura de lótus', magnitude: 0.14, habitAffinity: 'meditation', requiredCheckins: 5 },
  { id: 'micro-meditation-still', label: 'Centro calmo', magnitude: 0.2, habitAffinity: 'meditation', requiredCheckins: 15 },
  { id: 'micro-meditation-zen', label: 'Partículas zen', magnitude: 0.25, habitAffinity: 'meditation', requiredCheckins: 30 },
  // respiração
  { id: 'micro-breath-flow', label: 'Fluxo de ar suave', magnitude: 0.08, habitAffinity: 'breath', requiredCheckins: 1 },
  { id: 'micro-breath-wave', label: 'Ondas respiratórias', magnitude: 0.14, habitAffinity: 'breath', requiredCheckins: 5 },
  { id: 'micro-breath-calm', label: 'Calma profunda', magnitude: 0.2, habitAffinity: 'breath', requiredCheckins: 15 },
  // leitura
  { id: 'micro-reading-glow', label: 'Brilho curioso', magnitude: 0.08, habitAffinity: 'reading', requiredCheckins: 1 },
  { id: 'micro-reading-pages', label: 'Páginas flutuantes', magnitude: 0.16, habitAffinity: 'reading', requiredCheckins: 10 },
  // journaling
  { id: 'micro-journal-ink', label: 'Tinta emocional', magnitude: 0.08, habitAffinity: 'journaling', requiredCheckins: 1 },
  { id: 'micro-journal-heart', label: 'Coração expressivo', magnitude: 0.16, habitAffinity: 'journaling', requiredCheckins: 10 },
  // outdoor
  { id: 'micro-outdoor-leaf', label: 'Folhas na aura', magnitude: 0.08, habitAffinity: 'outdoor', requiredCheckins: 1 },
  { id: 'micro-outdoor-wind', label: 'Brisa no pelo', magnitude: 0.16, habitAffinity: 'outdoor', requiredCheckins: 10 },
  // sol
  { id: 'micro-sun-warm', label: 'Calor solar', magnitude: 0.08, habitAffinity: 'sun', requiredCheckins: 1 },
  { id: 'micro-sun-ray', label: 'Raios dourados', magnitude: 0.16, habitAffinity: 'sun', requiredCheckins: 10 },
  // streak / geral
  { id: 'micro-streak-ember', label: 'Brasa de constância', magnitude: 0.12, requiredCheckins: 7 },
  { id: 'micro-streak-flame', label: 'Chama de streak', magnitude: 0.2, requiredCheckins: 14 },
  { id: 'micro-streak-crown', label: 'Coroa de presença', magnitude: 0.28, requiredCheckins: 30 },
  { id: 'micro-recovery-bloom', label: 'Florescer de retorno', magnitude: 0.15, requiredCheckins: 3 },
];
