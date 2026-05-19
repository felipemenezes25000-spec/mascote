/**
 * Humor composto derivado do Genome.
 *
 * Compõe um único score [0..1] que sintetiza "como a criatura está
 * se sentindo" a partir do balanço entre genes positivos e tensos.
 *
 * NÃO é estado mental do USUÁRIO. É estado expressivo da criatura.
 * Importante: nunca usado pra diagnosticar ou interpretar nada sobre
 * o usuário — só pra modular animação/cor da criatura.
 */

import type { Genome } from './genome';
import type { MascotMood } from '@/types';

/** Score [0..1] — 1 = radiante, 0 = retraída. */
export function moodScore(g: Genome): number {
  const positive = (g.empathy + g.socialEnergy + g.resilience + g.adaptability) / 4;
  const tense = (g.aggression + g.chaos) / 2;
  const raw = positive - tense * 0.5;
  // remap (-0.5..1) → (0..1)
  return Math.max(0, Math.min(1, (raw + 0.3) / 1.0));
}

/** Label PT-BR curto pra UI. */
export function moodLabel(g: Genome): string {
  const s = moodScore(g);
  if (s > 0.75) return 'radiante · alta receptividade';
  if (s > 0.55) return 'serena · disposta a interagir';
  if (s > 0.4)  return 'curiosa · observando você';
  if (s > 0.25) return 'inquieta · processando estímulos';
  return 'retraída · pedindo espaço';
}

/**
 * Mapeia para o tipo legado MascotMood (mantém compatibilidade com
 * 45+ telas que já consomem mood enum).
 */
export function moodToLegacy(g: Genome): MascotMood {
  const s = moodScore(g);
  if (s > 0.78) return 'empolgado';
  if (s > 0.6)  return 'feliz';
  if (s > 0.35) return 'ok';
  if (s > 0.15) return 'triste';
  return 'exausto';
}

/**
 * Comentário comportamental — descrições curtas de COMO a criatura
 * reage ao mundo dado seu genoma. Usado em UI explicativa.
 */
export function behaviorTraits(g: Genome): string[] {
  const out: string[] = [];
  if (g.empathy > 0.6) out.push('inclina a cabeça quando você se aproxima');
  if (g.curiosity > 0.5) out.push('os olhos seguem seu toque mais rápido');
  if (g.aggression > 0.6) out.push('postura mais rígida e contraída');
  if (g.socialEnergy > 0.65) out.push('a aura se expande quando você interage');
  if (g.chaos > 0.6) out.push('movimentos imprevisíveis');
  if (g.discipline > 0.65) out.push('respiração quase ritmada');
  if (g.emotionalDepth > 0.7) out.push('cor muda sutilmente com seu silêncio');
  if (g.intelligence > 0.7) out.push('observa antes de reagir');
  if (g.adaptability > 0.7) out.push('absorve mudanças sem hesitar');
  if (g.resilience > 0.75) out.push('mantém presença mesmo em pausas longas');
  if (out.length === 0) out.push('processando ambiente em silêncio');
  return out.slice(0, 4);
}
