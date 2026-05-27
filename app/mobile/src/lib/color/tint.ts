/**
 * tint.ts — Identity color preservation with mood tint.
 *
 * **Por que existe:** auditoria 2026-05-27 reportou que o mascote parecia
 * "criatura diferente" em telas distintas (home roxo, evolução verde, closet
 * branco com boné). Investigação mostrou que a paleta DNA já era estável
 * (`paletteFromGenome` é determinística do genoma), mas mood + acentos +
 * cores derivadas diferentes por tela bagunçavam a percepção.
 *
 * **Decisão:** lock-in de cor de identidade (baseHue/baseSat/baseLight)
 * derivada do genome. Mood modula como tint SUTIL (delta de hue ≤ 20,
 * delta de sat ≤ 15), nunca substitui a cor base.
 *
 * **Reuso da paleta existente:** `MascotIdentity` é o mesmo trio HSL que
 * `paletteFromGenome().bodyHSL` produz. Não criamos state paralelo no store
 * — a identidade É a paleta. Este helper só converte HSL → hex e aplica
 * tint determinístico por mood.
 */
import type { MascotMood } from '@/types';

/**
 * Trio HSL que define a cor canônica do mascote.
 *
 * baseHue: 0-360 (matiz)
 * baseSaturation: 20-95 (saturação CSS-style %, recomendado 30-80)
 * baseLightness: 25-80 (luminância CSS-style %, recomendado 45-70)
 *
 * Origem usual: `paletteFromGenome(dna).bodyHSL` — determinístico do DNA.
 */
export interface MascotIdentity {
  baseHue: number;
  baseSaturation: number;
  baseLightness: number;
}

/**
 * Converte HSL (0-360, 0-100, 0-100) → hex string `#rrggbb`.
 *
 * Implementação inspirada no algoritmo HSL→RGB do CSS Color spec
 * (https://www.w3.org/TR/css-color-4/#hsl-to-rgb). Pura, sem dependências.
 */
export function hslToHex(h: number, s: number, l: number): string {
  // Normaliza para floats em [0,1]
  const hNorm = ((h % 360) + 360) % 360; // wrap negativos
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;
  const k = (n: number) => (n + hNorm / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) =>
    lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => {
    const v = Math.round(x * 255);
    const clamped = Math.max(0, Math.min(255, v));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/**
 * Tabela de modulação por mood. Valores intencionalmente pequenos —
 * a identidade DOMINA, mood é um tempero (~±20 em hue, ±15 em sat).
 *
 * - triste:    desliza hue pra azul (-10), dessatura, escurece
 * - ok:        identidade pura, sem delta
 * - feliz:     hue +10 (mais quente), satura, clareia levemente
 * - empolgado: hue +20, saturação alta, clareia
 * - exausto:   hue -15 (mais frio), dessatura forte, escurece
 */
const MOOD_TINTS: Record<MascotMood, { dh: number; ds: number; dl: number }> = {
  triste: { dh: -10, ds: -10, dl: -5 },
  ok: { dh: 0, ds: 0, dl: 0 },
  feliz: { dh: 10, ds: 10, dl: 5 },
  empolgado: { dh: 20, ds: 15, dl: 5 },
  exausto: { dh: -15, ds: -15, dl: -10 },
};

/**
 * Aplica mood como tint sutil sobre a identidade base — retorna hex final.
 *
 * **Invariantes:**
 * - mood 'ok' SEMPRE retorna `hslToHex(baseHue, baseSat, baseLight)` exato.
 * - hue é wrappado em [0, 360) — nunca negativo, nunca > 360.
 * - saturação é clampada em [20, 95] — evita cores cinzas (<20) ou neon (>95).
 * - lightness é clampada em [25, 80] — evita preto puro ou branco lavado.
 *
 * **Uso:** chamado por Mascot2D e Mascot3D pra colorir o CORPO (não acentos
 * nem olhos). Acentos/olhos derivam de `tintIdentity(identity, 'ok')` pra
 * manter cor fixa independente do humor.
 */
export function tintIdentity(
  identity: MascotIdentity,
  mood: MascotMood | undefined,
): string {
  const tint = (mood && MOOD_TINTS[mood]) || MOOD_TINTS.ok;
  const h = ((identity.baseHue + tint.dh) % 360 + 360) % 360;
  const s = Math.max(20, Math.min(95, identity.baseSaturation + tint.ds));
  const l = Math.max(25, Math.min(80, identity.baseLightness + tint.dl));
  return hslToHex(h, s, l);
}

/**
 * Helper: gera identidade a partir do trio bodyHSL da paleta.
 *
 * Útil pra reusar `paletteFromGenome(dna).bodyHSL` direto sem código
 * de adaptação espalhado nos renderers.
 */
export function identityFromHSL(hsl: readonly [number, number, number]): MascotIdentity {
  return {
    baseHue: hsl[0],
    baseSaturation: hsl[1],
    baseLightness: hsl[2],
  };
}

/**
 * Fallback de identidade quando o mascote ainda não tem DNA — derivado
 * da paleta brand do app (laranja-pêssego, wellness-vibe).
 *
 * Esses valores foram escolhidos pra "Pip" se parecer com a brand mesmo
 * antes do genome existir. Migration v1→v2 popula DNA, então isso é só
 * pra renders muito iniciais (onboarding pre-genome, error boundaries).
 */
export const DEFAULT_IDENTITY: MascotIdentity = {
  baseHue: 30,
  baseSaturation: 70,
  baseLightness: 55,
};
