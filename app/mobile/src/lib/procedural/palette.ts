/**
 * Conversores HSL → hex para o ProceduralGenome ser consumido em SVG fill/stroke.
 *
 * Helpers puros, sem dep externa.
 */

import type { HSL, ProceduralGenome } from '@/types';

export function hslToHex([h, s, l]: HSL): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v: number) => {
    const n = Math.round((v + m) * 255);
    return n.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Aplica userOverrides em cima do genome IA. Overrides sempre vencem. */
export function applyUserOverrides(g: ProceduralGenome): ProceduralGenome {
  if (!g.userOverrides) return g;
  const overrides = g.userOverrides;
  let palette = g.palette;
  if (overrides.bodyHue !== undefined) {
    const [, s, l] = g.palette.body;
    palette = { ...palette, body: [overrides.bodyHue, s, l] };
  }
  if (overrides.accentSaturation !== undefined) {
    const [h, , l] = palette.accent;
    palette = { ...palette, accent: [h, overrides.accentSaturation, l] };
  }
  let marks = g.marks;
  if (overrides.markCount !== undefined) {
    marks = g.marks.slice(0, overrides.markCount);
  }
  let accessories = g.accessories;
  if (overrides.disabledAccessories && overrides.disabledAccessories.length > 0) {
    const disabled = new Set(overrides.disabledAccessories);
    accessories = accessories.filter(a => !disabled.has(a.id));
  }
  return { ...g, palette, marks, accessories };
}
