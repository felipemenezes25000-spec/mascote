/**
 * Personality biases pros morph influences — assina visualmente cada personality
 * pra que mascotes da mesma personality compartilhem traços, sem perder unicidade
 * do DNA.
 *
 * Boosts sutis (≤0.2) — não dominam a customização ou mutations.
 * Composição: base + custom + mutations + personality bias (todos clamped final).
 *
 * Decisão de design: Calmo é menor/quietinho, Motivador é alto/inclinado pra
 * frente, Fofo é wider/short, Sábio é tall/upright. Bate com voz + comportamento
 * já estabelecido em outros lados do app.
 */

import type { Personality } from '@/types';

export const PERSONALITY_MORPH_BIAS: Record<Personality, Record<string, number>> = {
  calmo: {
    // Postura levemente pra trás (relaxado), olhos um pouco maiores (acolhedor)
    posture_back: 0.12,
    eye_big: 0.08,
    body_short: 0.06,
  },
  motivador: {
    // Postura pra frente (ativo), corpo mais alto (presente), pattern denso (animado)
    posture_forward: 0.18,
    body_tall: 0.1,
    pattern_dense: 0.08,
  },
  fofo: {
    // Wide + short (achatadinho fofo), aura suave
    body_wide: 0.15,
    body_short: 0.12,
    eye_big: 0.12,
  },
  sabio: {
    // Alto + reto (presença), aura forte (sábio brilha)
    body_tall: 0.15,
    aura_strong: 0.1,
    eye_small: 0.05, // olhar mais maduro
  },
};

/**
 * Retorna o dicionário de boosts pra uma personality.
 * Sempre retorna um objeto novo (defensive — consumidores podem mutar).
 */
export function personalityMorphBias(personality: Personality): Record<string, number> {
  return { ...(PERSONALITY_MORPH_BIAS[personality] ?? {}) };
}
