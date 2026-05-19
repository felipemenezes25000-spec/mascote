/**
 * Presets de DNA para as 4 personalidades base do app.
 *
 * **Essência preservada:** Bipo, Zip, Lulu, Aro continuam sendo as 4
 * personalidades que o usuário escolhe no onboarding. O DNA procedural
 * AMPLIFICA cada uma, ele não substitui. Cada personalidade tem um
 * perfil genético base + variação procedural por usuário (semente do
 * userId).
 */

import type { Genome } from './genome';
import { clampGene } from './genome';
import type { Personality } from '@/types';

/**
 * Bipo — O Calmo.
 * Alta empatia, alta resiliência, baixíssima agressão. Disciplinado.
 * Adaptável. Respiração medida. Voz tranquilizadora.
 */
const BIPO: Genome = {
  empathy: 0.82,
  curiosity: 0.45,
  creativity: 0.50,
  discipline: 0.70,
  chaos: 0.15,
  aggression: 0.08,
  resilience: 0.78,
  emotionalDepth: 0.70,
  socialEnergy: 0.55,
  adaptability: 0.75,
  intelligence: 0.62,
};

/**
 * Zip — O Motivador.
 * Curiosidade alta, energia social explosiva, criativo. Otimista.
 * Celebra cada conquista pequena. Aura quente e larga.
 */
const ZIP: Genome = {
  empathy: 0.65,
  curiosity: 0.85,
  creativity: 0.72,
  discipline: 0.55,
  chaos: 0.40,
  aggression: 0.18,
  resilience: 0.65,
  emotionalDepth: 0.58,
  socialEnergy: 0.92,
  adaptability: 0.70,
  intelligence: 0.65,
};

/**
 * Lulu — O Fofo.
 * Empatia máxima, profundidade emocional altíssima. Doce e próximo.
 * Olhos grandes. Mudanças sutis de cor com humor do usuário.
 */
const LULU: Genome = {
  empathy: 0.95,
  curiosity: 0.60,
  creativity: 0.55,
  discipline: 0.40,
  chaos: 0.22,
  aggression: 0.05,
  resilience: 0.55,
  emotionalDepth: 0.88,
  socialEnergy: 0.78,
  adaptability: 0.65,
  intelligence: 0.50,
};

/**
 * Aro — O Sábio.
 * Inteligência máxima, disciplina alta, observador. Mentor antigo.
 * Olhar profundo, brilho dos olhos forte, postura ereta.
 */
const ARO: Genome = {
  empathy: 0.75,
  curiosity: 0.78,
  creativity: 0.62,
  discipline: 0.82,
  chaos: 0.18,
  aggression: 0.10,
  resilience: 0.80,
  emotionalDepth: 0.72,
  socialEnergy: 0.45,
  adaptability: 0.68,
  intelligence: 0.95,
};

const TABLE: Record<Personality, Genome> = {
  calmo: BIPO,
  motivador: ZIP,
  fofo: LULU,
  sabio: ARO,
};

/**
 * Retorna o genoma base (preset) para uma personalidade.
 * Genome retornado é uma cópia — mutar não afeta a tabela.
 */
export function genomeForPersonality(p: Personality): Genome {
  const base = TABLE[p];
  // defensive copy + clamp por segurança (presets garantidamente válidos
  // pelos testes, mas clamp protege contra edição acidental).
  const out = {} as Genome;
  (Object.keys(base) as (keyof Genome)[]).forEach(k => {
    out[k] = clampGene(base[k]);
  });
  return out;
}

/** Mapeia o ID do mascote oficial (Bipo/Zip/Lulu/Aro) pra Personality. */
export const MASCOT_TO_PERSONALITY: Record<'Bipo' | 'Zip' | 'Lulu' | 'Aro', Personality> = {
  Bipo: 'calmo',
  Zip: 'motivador',
  Lulu: 'fofo',
  Aro: 'sabio',
};

/** Lista todas as personalidades + seu genoma base. */
export function listPersonalityPresets(): Array<{ personality: Personality; genome: Genome }> {
  return (Object.keys(TABLE) as Personality[]).map(p => ({
    personality: p,
    genome: genomeForPersonality(p),
  }));
}
