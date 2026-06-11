/**
 * Tabelas de drop da caixa surpresa — RARA durante eventos limitados.
 *
 * Pura (caller passa se há evento ativo) pra manter testabilidade da
 * economia. Valores raros ~2× a tabela normal: presente perceptível,
 * não inflação descontrolada (a caixa continua 1/dia).
 */

export interface BoxDrop {
  coins: number;
  gems: number;
  xp?: number;
  label: string;
}

const NORMAL_DROPS: readonly BoxDrop[] = [
  { coins: 30, gems: 0, label: '+30 🪙' },
  { coins: 75, gems: 0, label: '+75 🪙' },
  { coins: 0, gems: 2, label: '+2 💎' },
  { coins: 50, gems: 0, xp: 50, label: '+50 XP & 🪙' },
  { coins: 100, gems: 1, label: '+100 🪙 +1 💎' },
];

const RARE_DROPS: readonly BoxDrop[] = [
  { coins: 80, gems: 1, label: '+80 🪙 +1 💎' },
  { coins: 150, gems: 0, label: '+150 🪙' },
  { coins: 0, gems: 4, label: '+4 💎' },
  { coins: 100, gems: 1, xp: 50, label: '+100 🪙 +1 💎 & XP' },
  { coins: 200, gems: 2, label: '+200 🪙 +2 💎' },
];

export function mysteryBoxDrops(eventActive: boolean): readonly BoxDrop[] {
  return eventActive ? RARE_DROPS : NORMAL_DROPS;
}
