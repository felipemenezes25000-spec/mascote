/**
 * Deriva VoiceProfile a partir do Genome — pura, determinística.
 *
 * Mapeamento gene → parâmetro de voz:
 *  - socialEnergy   → baseFreq (alto = voz mais brilhante/aguda)
 *  - aggression     → baseFreq (negativo — agressão grava)
 *  - chaos          → vibrato (instabilidade)
 *  - curiosity      → vibrato (sutil, curiosa)
 *  - intelligence   → brightness + syllables (mais complexo)
 *  - creativity     → brightness + escala não-padrão
 *  - emotionalDepth → decay (notas mais longas, expressivas)
 *  - discipline     → noteSpacing (ritmo regular vs solto)
 *
 * Escala musical:
 *  - creativity > 0.7: blues pentatônica (suspense, sofisticação)
 *  - chaos > 0.7: dissonante (assimetria)
 *  - default: maior pentatônica (consonante, agradável)
 */

import type { Genome } from '@/lib/dna/genome';
import type { VoiceProfile } from './types';

// Escalas pré-definidas (semitons sobre a fundamental).
// Pentatônica major: consonante, "fofo" (C-D-E-G-A)
// Pentatônica blues: misterioso, criativo (C-Eb-F-G-Bb)
// Dissonante: caótico (C-Db-E-F#-A)
const SCALE_MAJOR: readonly number[] = [0, 2, 4, 7, 9, 12];
const SCALE_BLUES: readonly number[] = [0, 3, 5, 7, 10, 12];
const SCALE_DISSONANT: readonly number[] = [0, 1, 4, 6, 9, 11];

export function voiceProfileFromGenome(g: Genome): VoiceProfile {
  // baseFreq: 140-380 Hz. Aggression empurra grave (mais ameaçador);
  // socialEnergy empurra agudo (mais brilhante/aberto)
  const baseFreq = clamp(
    220 + g.socialEnergy * 160 - g.aggression * 80 + g.curiosity * 40,
    140,
    380,
  );
  // Vibrato: chaos é principal driver; curiosity adiciona toque sutil
  const vibrato = clamp(g.chaos * 0.55 + g.curiosity * 0.2, 0, 0.9);
  // Brightness: intelligence + creativity. Alto → sawtooth (mais harmônicos);
  // baixo → sine (puro, suave)
  const brightness = clamp(g.intelligence * 0.55 + g.creativity * 0.4, 0, 1);
  // Decay: emotionalDepth dá expressividade. Aggression reduz (corte abrupto).
  const decay = clamp(0.13 + g.emotionalDepth * 0.27 - g.aggression * 0.05, 0.08, 0.45);
  // Number of notes: intelligence dita complexidade (2-5)
  const syllables = clamp(Math.floor(2 + g.intelligence * 3.5), 2, 5);
  // Note spacing: discipline = ritmo regular (curto); chaos = irregular (longo)
  const noteSpacing = clamp(decay * (0.55 + g.chaos * 0.35 - g.discipline * 0.15), 0.06, 0.4);
  // Escolha de escala
  let scale: readonly number[];
  if (g.chaos > 0.75) scale = SCALE_DISSONANT;
  else if (g.creativity > 0.7) scale = SCALE_BLUES;
  else scale = SCALE_MAJOR;

  return { baseFreq, vibrato, brightness, decay, scale, syllables, noteSpacing };
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return (lo + hi) / 2;
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Modificadores por tipo de VoiceLine — aplicados em cima do perfil base.
 * Exposto pra debug/test; player consome internamente.
 */
export function modifiersForKind(kind: import('./types').VoiceLine['kind']): {
  freqMult: number;
  decayMult: number;
  syllableDelta: number;
} {
  switch (kind) {
    case 'greet':     return { freqMult: 1.0,  decayMult: 1.0, syllableDelta:  0 };
    case 'react':     return { freqMult: 1.15, decayMult: 0.6, syllableDelta: -1 }; // curta, aguda
    case 'curious':   return { freqMult: 1.1,  decayMult: 1.2, syllableDelta:  1 }; // exploratória
    case 'sleepy':    return { freqMult: 0.75, decayMult: 1.5, syllableDelta: -1 }; // grave, longa
    case 'celebrate': return { freqMult: 1.2,  decayMult: 0.9, syllableDelta:  1 }; // brilhante
    case 'attention': return { freqMult: 1.3,  decayMult: 0.4, syllableDelta: -2 }; // agudo, curta
  }
}
