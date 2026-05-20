/**
 * DNA → paleta HSL.
 *
 * Cor é função pura do Genome — nenhum dado externo.
 * Hue rotaciona com criatividade + empatia. Saturação com energia social.
 * Lightness com resiliência.
 */

import type { Genome } from './genome';

export interface Palette {
  /** Cor do corpo (HSL string CSS). */
  body: string;
  bodyHSL: [number, number, number];
  /** Cor de detalhes (cauda, espinhos). */
  accent: string;
  accentHSL: [number, number, number];
  /** Cor da bioluminescência (aura, olhos brilhantes). */
  glow: string;
  glowHSL: [number, number, number];
}

/**
 * Deriva paleta determinística do Genome.
 * Mesma genome = mesma paleta SEMPRE.
 */
export function paletteFromGenome(g: Genome): Palette {
  // Tons wellness (pêssego, coral, menta) — evita roxo neon “blob alienígena”.
  const hue =
    (18 + g.empathy * 42 + g.creativity * 38 + g.socialEnergy * 28 + g.chaos * 12) % 360;
  const sat = clamp(32 + g.socialEnergy * 28 + g.emotionalDepth * 10, 24, 68);
  const light = clamp(54 + g.resilience * 10 - g.aggression * 6, 46, 68);
  const accentHue = (hue + 22 + g.creativity * 18) % 360;
  const glowHue = (hue + 48) % 360;
  const accentSat = clamp(sat + 8, 28, 72);
  const accentLight = clamp(light + 10, 48, 78);
  return {
    body: `hsl(${hue.toFixed(1)}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%)`,
    bodyHSL: [hue, sat, light],
    accent: `hsl(${accentHue.toFixed(1)}, ${accentSat.toFixed(1)}%, ${accentLight.toFixed(1)}%)`,
    accentHSL: [accentHue, accentSat, accentLight],
    glow: `hsl(${glowHue.toFixed(1)}, 55%, 72%)`,
    glowHSL: [glowHue, 55, 72],
  };
}

/**
 * Converte HSL → hex RGB. Útil pra passar pro Three.js (que prefere hex).
 */
export function hslToHex(h: number, s: number, l: number): number {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)      { r = c; g = x; b = 0; }
  else if (h < 120){ r = x; g = c; b = 0; }
  else if (h < 180){ r = 0; g = c; b = x; }
  else if (h < 240){ r = 0; g = x; b = c; }
  else if (h < 300){ r = x; g = 0; b = c; }
  else             { r = c; g = 0; b = x; }
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return (R << 16) | (G << 8) | B;
}

/** Hex RGB do corpo da criatura, conveniente pro Three.js. */
export function bodyHex(p: Palette): number {
  return hslToHex(p.bodyHSL[0], p.bodyHSL[1], p.bodyHSL[2]);
}
export function accentHex(p: Palette): number {
  return hslToHex(p.accentHSL[0], p.accentHSL[1], p.accentHSL[2]);
}
export function glowHex(p: Palette): number {
  return hslToHex(p.glowHSL[0], p.glowHSL[1], p.glowHSL[2]);
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return (lo + hi) / 2;
  return Math.max(lo, Math.min(hi, v));
}
