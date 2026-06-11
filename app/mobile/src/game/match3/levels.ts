/**
 * Zen Match — 1000 fases procedurais determinísticas.
 *
 * 20 capítulos temáticos (50 fases cada). Cada capítulo tem identidade (nome,
 * hue, uma mecânica nova) e a dificuldade média sobe SUAVE por capítulo —
 * mais cores, alvo maior, board maior — sempre vencível com folga.
 *
 * Anti-Candy-Crush embutido nos números:
 *  - Movimentos GENEROSOS: o alvo é alcançável com ~60-70% deles num jogo médio.
 *  - Fases 'zen' (sem alvo, só relaxar N movimentos) a cada 10 fases = respiro.
 *  - Determinismo total: getLevel(n) só depende de n (mulberry32 seeded).
 */

import { mulberry32 } from './engine';
import { PIECE_COLORS, type PieceColor } from './pieces';

export const LEVEL_COUNT = 1000;
export const CHAPTER_SIZE = 50;
export const CHAPTER_COUNT = LEVEL_COUNT / CHAPTER_SIZE; // 20

/** Tipos de objetivo. 'zen' não tem alvo numérico — é fase de respiro. */
export type Objective = 'score' | 'collect' | 'clear-jelly' | 'bring-down' | 'zen';

export interface ChapterTheme {
  /** Índice 0-based do capítulo. */
  index: number;
  /** Nome temático PT-BR. */
  name: string;
  /** Hue base (0-360) pra UI tingir o capítulo. */
  hue: number;
  /** Mecânica nova introduzida (texto curto pra teaser). */
  mechanic: string;
}

/** Os 20 capítulos — nome + hue + mecânica. Ordem = progressão da jornada. */
export const CHAPTERS: readonly ChapterTheme[] = [
  { index: 0,  name: 'Lago Sereno',          hue: 205, mechanic: 'O básico: combine 3 e respire.' },
  { index: 1,  name: 'Jardim das Estrelas',  hue: 265, mechanic: 'Combine 4 e nasce uma peça-linha.' },
  { index: 2,  name: 'Bosque da Lua',        hue: 230, mechanic: 'Colete folhas pra acordar o bosque.' },
  { index: 3,  name: 'Campo de Sol',         hue: 45,  mechanic: 'Match em L cria a peça-área (3×3).' },
  { index: 4,  name: 'Vale do Orvalho',      hue: 160, mechanic: 'Limpe o orvalho das células.' },
  { index: 5,  name: 'Costa Tranquila',      hue: 190, mechanic: 'Traga conchas até a base.' },
  { index: 6,  name: 'Montanha Calma',       hue: 25,  mechanic: 'Combine 5 em linha: nasce o prisma.' },
  { index: 7,  name: 'Floresta de Névoa',    hue: 150, mechanic: 'Mais cores, mais cuidado.' },
  { index: 8,  name: 'Céu de Cristal',       hue: 200, mechanic: 'Cascatas mais longas, mais brilho.' },
  { index: 9,  name: 'Rio das Luzes',        hue: 280, mechanic: 'Combine especiais pra ondas maiores.' },
  { index: 10, name: 'Deserto Dourado',      hue: 40,  mechanic: 'Alvos generosos, tempo todo seu.' },
  { index: 11, name: 'Aurora Boreal',        hue: 175, mechanic: 'Orvalho duplo: paciência rende.' },
  { index: 12, name: 'Pântano Sereno',       hue: 130, mechanic: 'Coletas combinadas de duas cores.' },
  { index: 13, name: 'Cordilheira Azul',     hue: 215, mechanic: 'Boards maiores, respiro garantido.' },
  { index: 14, name: 'Vulcão Adormecido',    hue: 15,  mechanic: 'Prismas encadeados iluminam tudo.' },
  { index: 15, name: 'Geleira Silente',      hue: 195, mechanic: 'Orvalho profundo, jogadas calmas.' },
  { index: 16, name: 'Savana ao Entardecer', hue: 35,  mechanic: 'Trazer e coletar no mesmo fôlego.' },
  { index: 17, name: 'Bosque Encantado',     hue: 290, mechanic: 'Seis cores em harmonia.' },
  { index: 18, name: 'Templo das Nuvens',    hue: 220, mechanic: 'Desafios amplos, sempre acolhedores.' },
  { index: 19, name: 'Constelação Final',    hue: 255, mechanic: 'Tudo que você aprendeu, em paz.' },
];

export interface Level {
  /** Número da fase (1-based). */
  n: number;
  /** Capítulo (0-based). */
  chapter: number;
  rows: number;
  cols: number;
  /** Quantas cores este nível usa (3..6). */
  colorCount: number;
  objective: Objective;
  /**
   * Movimentos disponíveis. Em 'zen' é o "alvo de relaxamento" (jogue N e
   * receba a recompensa cheia) — nunca um limite punitivo.
   */
  moves: number;
  /**
   * Alvo numérico do objetivo:
   *  - score      → pontos a alcançar.
   *  - collect    → quantas peças da `collectColor` coletar.
   *  - clear-jelly→ quantas células de orvalho limpar.
   *  - bring-down → quantos itens trazer até a base.
   *  - zen        → 0 (sem alvo).
   */
  target: number;
  /** Cor a coletar (só 'collect'); senão null. */
  collectColor: PieceColor | null;
  /** Tema do capítulo (espelhado pra UI não recomputar). */
  theme: ChapterTheme;
}

/** Capítulo (0-based) de uma fase 1-based. Sanitiza entrada fora de faixa. */
export function chapterFor(n: number): number {
  const idx = clampLevel(n);
  return Math.floor((idx - 1) / CHAPTER_SIZE);
}

function clampLevel(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(LEVEL_COUNT, Math.floor(n)));
}

/** Posição da fase dentro do capítulo (0..49). */
function posInChapter(n: number): number {
  return (clampLevel(n) - 1) % CHAPTER_SIZE;
}

/**
 * Score de dificuldade ~monotônico por capítulo (usado em teste e na curva).
 * Cresce com o capítulo e, dentro dele, com a posição — fases 'zen' baixam de
 * propósito (são respiro), então o monotônico vale por MÉDIA de capítulo.
 */
export function difficultyScore(n: number): number {
  const lvl = getLevel(n);
  if (lvl.objective === 'zen') {
    // Respiro: dificuldade baixa-de-propósito, mas ancorada no capítulo pra
    // não ficar abaixo do início do próprio capítulo na média.
    return lvl.chapter * 10 + 1;
  }
  const chapterBase = lvl.chapter * 10;
  const sizeFactor = (lvl.rows * lvl.cols) / 12; // ~4 (7×7) .. ~7 (9×9)
  const colorFactor = (lvl.colorCount - 3) * 1.5; // 0..4.5
  const within = posInChapter(n) / CHAPTER_SIZE; // 0..1
  return chapterBase + sizeFactor + colorFactor + within * 4;
}

/** É uma fase de respiro (a cada 10)? Sempre 'zen'. */
function isBreather(n: number): boolean {
  return clampLevel(n) % 10 === 0;
}

/**
 * Rotação de objetivos por fase (exceto respiro). Capítulos liberam tipos
 * gradualmente: os primeiros só 'score'/'collect', tipos novos entram quando
 * o capítulo correspondente os "introduz".
 */
function objectiveFor(n: number, chapter: number, rng: () => number): Objective {
  if (isBreather(n)) return 'zen';

  // Pool de objetivos liberados por progresso (capítulo).
  const pool: Objective[] = ['score', 'collect'];
  if (chapter >= 3) pool.push('clear-jelly'); // orvalho introduzido no cap. 4 (Vale do Orvalho = idx 4) — libera 1 antes pra suavizar
  if (chapter >= 5) pool.push('bring-down');

  // Garante variedade: usa a posição pra alternar, com leve aleatoriedade.
  const pick = Math.floor(rng() * pool.length);
  return pool[pick]!;
}

/** Dimensão do board cresce por capítulo: 7×7 → 9×9. */
function boardSize(chapter: number): { rows: number; cols: number } {
  // 0-6: 7, 7-13: 8, 14-19: 9 — degraus suaves.
  const dim = chapter < 7 ? 7 : chapter < 14 ? 8 : 9;
  return { rows: dim, cols: dim };
}

/** Número de cores cresce por capítulo: 4 → 6, com piso 4 (3 só em fallback). */
function colorCountFor(chapter: number): number {
  // cap 0-3: 4 cores, 4-9: 5 cores, 10+: 6 cores.
  if (chapter < 4) return 4;
  if (chapter < 10) return 5;
  return 6;
}

/**
 * Retorna a fase `n` (1..1000) totalmente especificada e determinística.
 * Entrada fora de faixa é clampeada (nunca crasha).
 */
export function getLevel(n: number): Level {
  const lvl = clampLevel(n);
  const chapter = Math.floor((lvl - 1) / CHAPTER_SIZE);
  const theme = CHAPTERS[chapter]!;
  const rng = mulberry32(lvl * 2654435761); // seed = fase * knuth → bem espalhado
  const within = posInChapter(lvl); // 0..49

  const { rows, cols } = boardSize(chapter);
  const colorCount = colorCountFor(chapter);
  const objective = objectiveFor(lvl, chapter, rng);

  // Dificuldade interna (0..1) cresce com a posição no capítulo.
  const ramp = within / (CHAPTER_SIZE - 1);

  if (objective === 'zen') {
    // Respiro: movimentos = "relaxe N", sem alvo. Generoso e fixo-ish.
    const moves = 20 + chapter; // sobe leve só pra sensação de jornada
    return {
      n: lvl,
      chapter,
      rows,
      cols,
      colorCount,
      objective,
      moves,
      target: 0,
      collectColor: null,
      theme,
    };
  }

  // Movimentos generosos: base alta que cresce devagar com o capítulo.
  const baseMoves = 18 + chapter; // 18..37
  const moves = baseMoves + Math.round(ramp * 6); // +0..6 dentro do capítulo

  let target: number;
  let collectColor: PieceColor | null = null;

  switch (objective) {
    case 'score': {
      // Pontos alcançáveis com ~60-65% dos movimentos (cada jogada média rende
      // ~6-9 pts com cascatas). Cresce com capítulo+posição.
      const perMove = 7;
      const target0 = Math.round(moves * 0.62 * perMove);
      target = target0 + chapter * 12 + Math.round(ramp * 40);
      break;
    }
    case 'collect': {
      // Coletar N de UMA cor. ~2-3 por jogada útil → alcançável em ~55% dos moves.
      collectColor = PIECE_COLORS[Math.floor(rng() * colorCount)]!;
      target = 14 + chapter * 2 + Math.round(ramp * 10);
      break;
    }
    case 'clear-jelly': {
      // Orvalho: ~1 célula por jogada bem colocada. Quantidade modesta.
      target = 10 + chapter + Math.round(ramp * 8);
      break;
    }
    case 'bring-down': {
      // Trazer itens até a base — poucos, mas exige planejar a coluna.
      target = 3 + Math.floor(chapter / 4) + Math.round(ramp * 3);
      break;
    }
    default: {
      target = 100;
    }
  }

  return {
    n: lvl,
    chapter,
    rows,
    cols,
    colorCount,
    objective,
    moves,
    target,
    collectColor,
    theme,
  };
}

/** Todas as fases de um capítulo (0-based). Útil pra UI do hub. */
export function levelsInChapter(chapter: number): Level[] {
  const safe = Math.max(0, Math.min(CHAPTER_COUNT - 1, Math.floor(chapter)));
  const out: Level[] = [];
  for (let i = 0; i < CHAPTER_SIZE; i++) out.push(getLevel(safe * CHAPTER_SIZE + i + 1));
  return out;
}

/** Label PT-BR curto do objetivo (pra HUD). */
export function objectiveLabel(level: Level): string {
  switch (level.objective) {
    case 'zen':
      return `Relaxe por ${level.moves} jogadas`;
    case 'score':
      return `Alcance ${level.target} pontos`;
    case 'collect':
      return `Colete ${level.target}`;
    case 'clear-jelly':
      return `Limpe ${level.target} de orvalho`;
    case 'bring-down':
      return `Traga ${level.target} até a base`;
    default:
      return 'Combine e relaxe';
  }
}
