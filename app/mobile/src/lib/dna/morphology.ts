/**
 * DNA → parâmetros de morfologia.
 *
 * Pura função do Genome — converte os 11 floats em ~20 parâmetros
 * geométricos que o renderer R3F consome (altura, largura, número de
 * membros, tamanho dos olhos, etc).
 *
 * Mantém renderer SEM lógica de DNA: o `Mascot3D.tsx` lê apenas estes
 * parâmetros derivados. Facilita teste, simulação e fallback.
 */

import type { Genome } from './genome';

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

/** Deriva todos os parâmetros morfológicos do Genome. */
export function morphologyFromGenome(g: Genome): Morphology {
  return {
    // Corpo
    bodyHeightStretch: 0.7 + g.intelligence * 0.7 + g.empathy * 0.35,
    bodyWidthSquash: 0.85 + g.resilience * 0.45 - g.discipline * 0.15,
    bodyBottomBias: 0.3 + g.resilience * 0.5,
    bodyChaosBumps: g.chaos * 0.35,
    bodyCreativityBumps: g.creativity * 0.25,
    bodyEmissiveIntensity: 0.05 + g.socialEnergy * 0.15,
    bodyRoughness: 0.55 - g.discipline * 0.3,
    bodyMetalness: 0.05 + g.discipline * 0.18,
    bodyFlatShading: g.chaos > 0.65,

    // Olhos
    eyeSize: 0.16 + g.empathy * 0.12 + g.intelligence * 0.05,
    eyeSpread: 0.32 + (1 - g.intelligence) * 0.1,
    eyeY: 0.45 + g.intelligence * 0.25,
    eyeZ: 0.72,
    pupilSize: 0.4 + g.curiosity * 0.25,
    pupilEmissive: 0.4 + g.intelligence * 0.5,
    trackingSpeed: 0.04 + g.curiosity * 0.1,

    // Membros
    limbCount: Math.floor(g.creativity * 3 + g.chaos * 2),
    limbLength: 0.4 + g.creativity * 0.3,
    limbThickness: 0.07 + g.resilience * 0.07,
    limbSwayAmplitude: 0.15 + g.socialEnergy * 0.2,

    // Cauda
    hasTail: g.creativity >= 0.4,
    tailSegments: 8,
    tailLength: 0.18 + g.creativity * 0.5,

    // Espinhos
    hasSpikes: g.aggression >= 0.55,
    spikeCount: Math.floor(3 + g.aggression * 7),
    spikeLength: 0.18 + g.aggression * 0.15,

    // Antenas
    hasAntennae: g.curiosity >= 0.55,
    antennaLength: 0.5 + g.curiosity * 0.4,
    antennaWiggle: 0.15 * g.curiosity,

    // Aura
    auraParticleCount: Math.floor(40 + g.socialEnergy * 80 + g.creativity * 60),
    auraOpacity: 0.55 + g.socialEnergy * 0.3,
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
