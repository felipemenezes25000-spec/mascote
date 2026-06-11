/**
 * Peças do Zen Match — tema bem-estar (nada de doces).
 *
 * Seis cores básicas + camada de peças ESPECIAIS criadas por matches grandes.
 * Tudo aqui é puro e sem React: a engine consome estes tipos, a UI mapeia
 * `color` → ícone/cor do theme (jamais hardcode de cor mora aqui).
 */

/** As 6 cores básicas. Ordem é parte do contrato (índice = cor). */
export const PIECE_COLORS = ['water', 'star', 'leaf', 'moon', 'sun', 'heart'] as const;
export type PieceColor = (typeof PIECE_COLORS)[number];

/** Quantas cores existem no total (teto de `colorCount` por nível). */
export const COLOR_COUNT_MAX = PIECE_COLORS.length;

/**
 * Tipo de peça especial — o "tudo que o match-3 precisa":
 *  - none   : peça comum.
 *  - line   : criada por match de 4 — limpa a linha OU coluna inteira.
 *  - area   : criada por match em L/T (5 em formato) — limpa um 3×3.
 *  - prism  : criada por match de 5 em linha reta — limpa TODAS de uma cor.
 */
export type SpecialKind = 'none' | 'line' | 'area' | 'prism';

/**
 * Orientação de uma peça `line`. A peça limpa a faixa correspondente.
 * Peças não-`line` ignoram este campo (fica 'h' por default, inerte).
 */
export type LineDir = 'h' | 'v';

/**
 * Uma célula do tabuleiro.
 *
 * `color === null` representa uma célula VAZIA transitória (durante a remoção,
 * antes da gravidade reabastecer). Tabuleiro estável nunca tem `null`.
 * O prisma é a única peça cuja cor é "coringa": guarda a cor de origem só
 * pra estética, mas ativa contra qualquer cor escolhida no swap.
 */
export interface Piece {
  /** Cor básica. `null` = vazio transitório. */
  color: PieceColor | null;
  /** Camada especial. */
  special: SpecialKind;
  /** Direção da faixa pra `special === 'line'`. */
  dir: LineDir;
  /** Id estável pra animação de "mesma peça que caiu" na UI (key do reanimated). */
  id: number;
}

/** Cria uma peça comum. */
export function makePiece(color: PieceColor, id: number): Piece {
  return { color, special: 'none', dir: 'h', id };
}

/** Cria uma peça especial a partir de uma cor + tipo (e direção, se line). */
export function makeSpecial(
  color: PieceColor,
  special: SpecialKind,
  id: number,
  dir: LineDir = 'h',
): Piece {
  return { color, special, dir, id };
}

/** É uma peça vazia (slot transitório durante resolução)? */
export function isEmpty(p: Piece | null | undefined): boolean {
  return !p || p.color === null;
}

/** É especial (qualquer tipo ativável)? */
export function isSpecial(p: Piece | null | undefined): boolean {
  return !!p && p.special !== 'none';
}

/** Pontuação base por peça removida — especiais valem mais (recompensa o combo). */
export function pieceScoreValue(p: Piece): number {
  switch (p.special) {
    case 'prism':
      return 12;
    case 'area':
      return 8;
    case 'line':
      return 6;
    default:
      return 1;
  }
}
