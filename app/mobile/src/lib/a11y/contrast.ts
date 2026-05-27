/**
 * WCAG 2.1 contrast helpers.
 *
 * Implementa o algoritmo de luminância relativa do WCAG 2.1 — usado pra
 * validar que tokens de cor (text vs bg) atingem AA/AAA contra fundo escuro
 * ou claro. Mantido sem dependência externa pra ficar utilizável em testes
 * vitest (Node) e em runtime do app sem custo de bundle.
 *
 * Refs:
 * - https://www.w3.org/TR/WCAG21/#contrast-minimum (AA 4.5:1 normal, 3:1 large)
 * - https://www.w3.org/TR/WCAG21/#contrast-enhanced (AAA 7:1 normal, 4.5:1 large)
 *
 * "Texto grande" = >=18pt (~24px) OU >=14pt bold (~18.66px bold). O argumento
 * `isLarge` em `meetsAA`/`meetsAAA` reflete essa regra.
 */

const HEX_PATTERN = /^#?([0-9a-fA-F]{6})$/;

function normalizeHex(hex: string): string {
  const m = HEX_PATTERN.exec(hex.trim());
  if (!m) {
    // Mantém igual ao `hexToRgba` em themes.ts (que silenciosamente cai pra
    // preto) — preferimos throw aqui pra os testes pegarem token corrompido
    // em vez de retornar contraste fake.
    throw new Error(`Invalid 6-digit hex color: ${hex}`);
  }
  return `#${m[1].toLowerCase()}`;
}

function relativeLuminance(hex: string): number {
  const h = normalizeHex(hex);
  const r = parseInt(h.slice(1, 3), 16) / 255;
  const g = parseInt(h.slice(3, 5), 16) / 255;
  const b = parseInt(h.slice(5, 7), 16) / 255;
  const f = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/**
 * Retorna a razão de contraste WCAG entre duas cores hex (#RRGGBB).
 * Sempre >= 1 (1 = mesma cor; 21 = preto puro vs branco puro).
 */
export function contrast(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * WCAG AA: 4.5:1 para texto normal, 3:1 para texto grande
 * (>=18pt OU >=14pt bold).
 */
export function meetsAA(fg: string, bg: string, isLarge = false): boolean {
  return contrast(fg, bg) >= (isLarge ? 3 : 4.5);
}

/**
 * WCAG AAA: 7:1 para texto normal, 4.5:1 para texto grande.
 * Usado em níveis enhanced — não exigido por launch mas útil em chips
 * críticos (warnings de crise, valores de plano).
 */
export function meetsAAA(fg: string, bg: string, isLarge = false): boolean {
  return contrast(fg, bg) >= (isLarge ? 4.5 : 7);
}
