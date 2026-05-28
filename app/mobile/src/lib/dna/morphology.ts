/**
 * DNA → parâmetros de morfologia.
 *
 * Pura função do Genome — converte os 11 floats em ~20 parâmetros
 * geométricos que o renderer 2D consome (altura, largura, número de
 * membros, tamanho dos olhos, etc).
 *
 * Mantém renderer SEM lógica de DNA: o `Mascot2D.tsx` lê apenas estes
 * parâmetros derivados. Facilita teste, simulação e fallback.
 */

import type { Genome } from './genome';

/** Padrão corporal visual — desbloqueado por mutações ou customização. */
export type MorphPattern = 'plain' | 'stripes' | 'spots' | 'fractal' | 'cells';

export interface Morphology {
  // Corpo
  bodyHeightStretch: number;
  bodyWidthSquash: number;
  bodyBottomBias: number;
  bodyChaosBumps: number;
  bodyCreativityBumps: number;
  bodyEmissiveIntensity: number;
  bodyRoughness: number;
  bodyMetalness: number;
  bodyFlatShading: boolean;
  /**
   * Padrão visual aplicado ao body shader/material. 'plain' = sem padrão.
   * Default vem do DNA (creativity + chaos altos → 'spots' emergem naturalmente).
   * Mutations + customization podem sobrescrever via aggregator/overlay.
   */
  pattern: MorphPattern;

  // Olhos
  eyeSize: number;
  eyeSpread: number;
  eyeY: number;
  eyeZ: number;
  pupilSize: number;
  pupilEmissive: number;
  trackingSpeed: number;

  // Membros
  limbCount: number;        // 0..6 (×2 espelhado)
  limbLength: number;
  limbThickness: number;
  limbSwayAmplitude: number;

  // Cauda
  hasTail: boolean;
  tailSegments: number;
  tailLength: number;

  // Espinhos
  hasSpikes: boolean;
  spikeCount: number;
  spikeLength: number;

  // Antenas
  hasAntennae: boolean;
  antennaLength: number;
  antennaWiggle: number;

  // Aura
  auraParticleCount: number;
  auraOpacity: number;
  auraSize: number;

  // Animação geral
  breathFreq: number;
  breathAmp: number;
  idleWobble: number;
  swayAmplitude: number;
}

/** Deriva todos os parâmetros morfológicos do Genome.
 *
 * v3 (2026-05-22): polish "slime rancher" alinhado ao prototipo v8.
 *  - bodyFlatShading: sempre false (smooth shading) — era g.chaos > 0.88,
 *    causava facets hostis em criaturas chaóticas.
 *  - bodyRoughness: 0.42 (era 0.78) + emissive forte = look gel translúcido.
 *  - pupilSize: 0.62 (era 0.36) — pupila cartoon Slime Rancher.
 *  - limbCount: cap em 2 pares (era 5) — silhueta limpa, não porco-espinho.
 */
export function morphologyFromGenome(g: Genome): Morphology {
  return {
    // Corpo — proporções CHIBI (cabeça grande + cintura + corpo menor).
    // Antes: heightStretch 0.7→1.75 (variação enorme, criatura achatada/longa
    // demais em extremos). Agora: 1.05→1.58 (consistente chibi com pequena
    // variação por DNA). bottomBias menor pra não exagerar a "pera".
    bodyHeightStretch: 1.05 + g.intelligence * 0.35 + g.empathy * 0.18,
    bodyWidthSquash: 0.92 + g.resilience * 0.20 - g.discipline * 0.08,
    bodyBottomBias: 0.15 + g.resilience * 0.25,
    bodyChaosBumps: g.chaos * 0.1,
    bodyCreativityBumps: g.creativity * 0.07,
    // Emissive forte = "inner glow" gel. Sem isso o corpo fica opaco plástico.
    bodyEmissiveIntensity: 0.18 + g.socialEnergy * 0.25,
    // Roughness baixa + metalness sutil = highlight especular crisp (jelly).
    bodyRoughness: 0.42 - g.discipline * 0.15,
    bodyMetalness: 0.08 + g.discipline * 0.10,
    // Smooth shading SEMPRE — facets viravam "geode quebrado" hostil.
    bodyFlatShading: false,
    // Pattern emerge organicamente do DNA — alta creativity+chaos vira spots;
    // alta creativity sem chaos vira cells (organizado); alta disciplina+chaos
    // baixo deixa plain. Mutations/customization sobrescrevem em pipeline.
    pattern: g.creativity > 0.75 && g.chaos > 0.5 ? 'spots'
           : g.creativity > 0.7 ? 'cells'
           : g.chaos > 0.75 ? 'stripes'
           : 'plain',

    // Olhos — cartoon Slime Rancher: pupila grande 62-78% do sclera.
    eyeSize: 0.22 + g.empathy * 0.12 + g.intelligence * 0.04,
    eyeSpread: 0.36 + (1 - g.intelligence) * 0.08,
    eyeY: 0.42 + g.intelligence * 0.22,
    eyeZ: 0.78,
    pupilSize: 0.62 + g.curiosity * 0.16,
    pupilEmissive: 0.55 + g.intelligence * 0.40,
    trackingSpeed: 0.04 + g.curiosity * 0.1,

    // Membros — cap em 2 pares (4 cilindros) pra silhueta limpa.
    limbCount: Math.min(2, Math.floor(g.creativity * 1.5 + g.chaos * 1)),
    limbLength: 0.4 + g.creativity * 0.3,
    limbThickness: 0.07 + g.resilience * 0.07,
    limbSwayAmplitude: 0.15 + g.socialEnergy * 0.2,

    // Cauda
    hasTail: g.creativity >= 0.4,
    tailSegments: 8,
    tailLength: 0.18 + g.creativity * 0.5,

    // Espinhos
    hasSpikes: g.aggression >= 0.72,
    spikeCount: Math.floor(3 + g.aggression * 7),
    spikeLength: 0.18 + g.aggression * 0.15,

    // Antenas
    hasAntennae: g.curiosity >= 0.55,
    antennaLength: 0.5 + g.curiosity * 0.4,
    antennaWiggle: 0.15 * g.curiosity,

    // Aura
    auraParticleCount: Math.floor(12 + g.socialEnergy * 28 + g.creativity * 20),
    auraOpacity: 0.28 + g.socialEnergy * 0.18,
    auraSize: 0.045 + g.socialEnergy * 0.04,

    // Animação geral
    breathFreq: 1.0 - g.emotionalDepth * 0.4,
    breathAmp: 0.04 + g.empathy * 0.04,
    idleWobble: 0.05 + g.chaos * 0.06,
    swayAmplitude: g.adaptability * 0.18,
  };
}

/**
 * "Resumo morfológico" pra UI — lista os traços visíveis emergentes
 * sem expor vocabulário científico (DNA/genoma).
 */
export function morphologySummary(g: Genome): string[] {
  const out: string[] = [];
  const m = morphologyFromGenome(g);
  if (m.hasTail) out.push('cauda segmentada');
  if (m.hasSpikes) out.push(`${m.spikeCount} cristas defensivas`);
  if (m.hasAntennae) out.push('antenas luminescentes');
  if (g.chaos > 0.65) out.push('forma assimétrica');
  if (g.intelligence > 0.7) out.push('cabeça alongada');
  if (g.resilience > 0.7) out.push('base densa');
  if (m.limbCount > 0) out.push(`${m.limbCount * 2} braços`);
  if (g.discipline > 0.7) out.push('superfície refinada');
  if (g.socialEnergy > 0.75) out.push('aura ampla');
  if (g.empathy > 0.75) out.push('olhos grandes');
  if (out.length === 0) out.push('forma essencial');
  return out;
}
