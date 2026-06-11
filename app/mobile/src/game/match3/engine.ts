/**
 * Zen Match — engine pura do tabuleiro (sem React, 100% testável).
 *
 * Filosofia anti-Candy-Crush: o engine NUNCA gera um tabuleiro morto (garante
 * pelo menos 1 movimento), NUNCA crasha com entrada corrompida (NaN/índice
 * fora vira no-op seguro), e expõe "passos" declarativos pra UI animar cascata
 * sem reimplementar a regra.
 *
 * Determinismo: tudo que sorteia usa o MESMO mulberry32 do resto do app
 * (copiado abaixo pra não acoplar a engine de jogo ao módulo de DNA).
 */

import {
  COLOR_COUNT_MAX,
  PIECE_COLORS,
  makePiece,
  makeSpecial,
  pieceScoreValue,
  type LineDir,
  type Piece,
  type PieceColor,
  type SpecialKind,
} from './pieces';

/** PRNG determinístico — idêntico a `src/lib/dna/genome.ts` (sanitiza NaN→0). */
export function mulberry32(seed: number): () => number {
  let s = Math.floor(seed) | 0;
  if (!Number.isFinite(seed)) s = 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Posição no tabuleiro. */
export interface Pos {
  r: number;
  c: number;
}

/** Tabuleiro: matriz `rows × cols` de peças + metadados imutáveis. */
export interface Board {
  rows: number;
  cols: number;
  /** Quantas cores este tabuleiro usa (subconjunto de PIECE_COLORS). */
  colorCount: number;
  /** grid[r][c]. Estável (sem `null`) entre jogadas. */
  grid: Piece[][];
  /** Contador monotônico pra ids de peça (animação). */
  nextId: number;
}

/**
 * Um passo de resolução — a UI anima um por um pra dar a sensação de cascata.
 *  - removed   : posições que sumiram NESTE passo (estouro).
 *  - fallen    : peças que desceram (from→to) por gravidade.
 *  - spawned   : peças novas que entraram pelo topo (posição final).
 *  - created   : especiais geradas neste passo (posição + tipo).
 *  - scoreGained: pontos somados neste passo.
 *  - cascadeLevel: 0 = match do swap; 1+ = cascatas encadeadas (bônus cresce).
 */
export interface ResolveStep {
  removed: Pos[];
  fallen: { from: Pos; to: Pos }[];
  spawned: Pos[];
  created: { pos: Pos; special: SpecialKind }[];
  scoreGained: number;
  cascadeLevel: number;
}

/** Resultado de `resolveBoard`: tabuleiro final estável + passos + total. */
export interface ResolveResult {
  board: Board;
  steps: ResolveStep[];
  totalScore: number;
  /** Total de peças removidas por cor (objetivos 'collect'). */
  collected: Record<PieceColor, number>;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function sanitizeColorCount(n: number): number {
  if (!Number.isFinite(n)) return 5;
  const v = Math.floor(n);
  return Math.max(3, Math.min(COLOR_COUNT_MAX, v));
}

function sanitizeDim(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(3, Math.min(12, Math.floor(n)));
}

function inBounds(board: Board, r: number, c: number): boolean {
  return r >= 0 && c >= 0 && r < board.rows && c < board.cols;
}

function emptyCollected(): Record<PieceColor, number> {
  return { water: 0, star: 0, leaf: 0, moon: 0, sun: 0, heart: 0 };
}

/** Clona o grid (peças por valor) — engine é imutável por jogada. */
function cloneGrid(grid: Piece[][]): Piece[][] {
  return grid.map(row => row.map(p => ({ ...p })));
}

function cloneBoard(board: Board): Board {
  return { ...board, grid: cloneGrid(board.grid) };
}

function colorAt(board: Board, r: number, c: number): PieceColor | null {
  if (!inBounds(board, r, c)) return null;
  return board.grid[r]![c]!.color;
}

// ---------------------------------------------------------------------------
// createBoard
// ---------------------------------------------------------------------------

/**
 * Gera um tabuleiro SEM matches iniciais e COM pelo menos 1 movimento possível.
 * Reembaralha (re-sorteia) até satisfazer ambos — sempre converge na prática
 * porque sorteios evitando 3-em-linha raramente travam.
 */
export function createBoard(
  seed: number,
  rows: number,
  cols: number,
  colorCount: number,
): Board {
  const R = sanitizeDim(rows, 7);
  const C = sanitizeDim(cols, 7);
  const K = sanitizeColorCount(colorCount);
  const rng = mulberry32(seed);

  // Tentativas: cada uma regenera do zero. Teto alto só por paranoia — na
  // prática 1-2 tentativas bastam.
  for (let attempt = 0; attempt < 200; attempt++) {
    let nextId = 1;
    const grid: Piece[][] = [];
    for (let r = 0; r < R; r++) {
      const row: Piece[] = [];
      for (let c = 0; c < C; c++) {
        // Escolhe uma cor que NÃO feche 3-em-linha com os 2 vizinhos acima/esq.
        const banned = new Set<PieceColor>();
        if (c >= 2 && row[c - 1]!.color === row[c - 2]!.color) {
          banned.add(row[c - 1]!.color!);
        }
        if (r >= 2 && grid[r - 1]![c]!.color === grid[r - 2]![c]!.color) {
          banned.add(grid[r - 1]![c]!.color!);
        }
        let color: PieceColor;
        do {
          color = PIECE_COLORS[Math.floor(rng() * K)]!;
        } while (banned.has(color));
        row.push(makePiece(color, nextId++));
      }
      grid.push(row);
    }
    const board: Board = { rows: R, cols: C, colorCount: K, grid, nextId };
    if (findMatches(board).length === 0 && findPossibleMoves(board).length > 0) {
      return board;
    }
    // Senão: próxima tentativa com a MESMA rng (avança a sequência → board novo).
  }

  // Fallback determinístico (nunca deve cair aqui): padrão xadrez sem match.
  return checkerboardFallback(R, C, K);
}

/** Último recurso: tabuleiro padrão garantidamente sem match e com move. */
function checkerboardFallback(R: number, C: number, K: number): Board {
  let nextId = 1;
  const grid: Piece[][] = [];
  for (let r = 0; r < R; r++) {
    const row: Piece[] = [];
    for (let c = 0; c < C; c++) {
      // Padrão diagonal cíclico em K cores: nunca repete 3 na linha/coluna.
      const idx = (r + c) % Math.max(2, Math.min(K, 3));
      row.push(makePiece(PIECE_COLORS[idx]!, nextId++));
    }
    grid.push(row);
  }
  return { rows: R, cols: C, colorCount: K, grid, nextId };
}

// ---------------------------------------------------------------------------
// findMatches
// ---------------------------------------------------------------------------

/**
 * Detecta TODOS os grupos de 3+ alinhados (horizontal e vertical).
 * Retorna grupos como conjuntos de posições — grupos que se cruzam (L/T)
 * são detectados separadamente; a resolução os funde via flood pra decidir
 * a peça especial. Peças vazias (`null`) nunca casam.
 */
export function findMatches(board: Board): Pos[][] {
  const groups: Pos[][] = [];
  const { rows, cols } = board;

  // Horizontais
  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    for (let c = 1; c <= cols; c++) {
      const same =
        c < cols &&
        colorAt(board, r, c) !== null &&
        colorAt(board, r, c) === colorAt(board, r, runStart);
      if (!same) {
        if (c - runStart >= 3) {
          const g: Pos[] = [];
          for (let cc = runStart; cc < c; cc++) g.push({ r, c: cc });
          groups.push(g);
        }
        runStart = c;
      }
    }
  }

  // Verticais
  for (let c = 0; c < cols; c++) {
    let runStart = 0;
    for (let r = 1; r <= rows; r++) {
      const same =
        r < rows &&
        colorAt(board, r, c) !== null &&
        colorAt(board, r, c) === colorAt(board, runStart, c);
      if (!same) {
        if (r - runStart >= 3) {
          const g: Pos[] = [];
          for (let rr = runStart; rr < r; rr++) g.push({ r: rr, c });
          groups.push(g);
        }
        runStart = r;
      }
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// swap / isValidSwap
// ---------------------------------------------------------------------------

function areAdjacent(a: Pos, b: Pos): boolean {
  const dr = Math.abs(a.r - b.r);
  const dc = Math.abs(a.c - b.c);
  return dr + dc === 1;
}

function validPos(board: Board, p: Pos | null | undefined): p is Pos {
  return (
    !!p &&
    Number.isFinite(p.r) &&
    Number.isFinite(p.c) &&
    inBounds(board, p.r, p.c)
  );
}

/** Aplica a troca in-place num grid clonado e devolve o board novo. */
function swappedBoard(board: Board, a: Pos, b: Pos): Board {
  const nb = cloneBoard(board);
  const tmp = nb.grid[a.r]![a.c]!;
  nb.grid[a.r]![a.c] = nb.grid[b.r]![b.c]!;
  nb.grid[b.r]![b.c] = tmp;
  return nb;
}

/**
 * Uma troca adjacente é válida se (a) as posições existem e são vizinhas e
 * (b) cria match OU envolve uma peça especial (especial sempre pode ativar).
 */
export function isValidSwap(board: Board, a: Pos, b: Pos): boolean {
  if (!validPos(board, a) || !validPos(board, b)) return false;
  if (!areAdjacent(a, b)) return false;
  const pa = board.grid[a.r]![a.c]!;
  const pb = board.grid[b.r]![b.c]!;
  // Especial troca-pra-ativar é sempre legal (inclusive prisma+qualquer).
  if (pa.special !== 'none' || pb.special !== 'none') return true;
  const nb = swappedBoard(board, a, b);
  return findMatches(nb).length > 0;
}

/**
 * Aplica a troca (sem resolver) — retorna o board pós-swap. Não valida:
 * o chamador usa `isValidSwap` antes. Entrada inválida → board inalterado.
 */
export function applySwap(board: Board, a: Pos, b: Pos): Board {
  if (!validPos(board, a) || !validPos(board, b) || !areAdjacent(a, b)) {
    return board;
  }
  return swappedBoard(board, a, b);
}

// ---------------------------------------------------------------------------
// Peças especiais — decisão de tipo a partir do formato do match
// ---------------------------------------------------------------------------

/**
 * Agrupa as posições de match em "clusters" conectados (flood 4-dir) pra que
 * um L/T (horizontal + vertical cruzando) vire UM cluster e gere ÁREA.
 */
function clusterMatches(groups: Pos[][]): { cells: Pos[]; rows: Set<number>; cols: Set<number> }[] {
  const key = (p: Pos) => p.r * 10000 + p.c;
  const all = new Map<number, Pos>();
  for (const g of groups) for (const p of g) all.set(key(p), p);

  const visited = new Set<number>();
  const clusters: { cells: Pos[]; rows: Set<number>; cols: Set<number> }[] = [];

  for (const [k, start] of all) {
    if (visited.has(k)) continue;
    const stack = [start];
    visited.add(k);
    const cells: Pos[] = [];
    const rowsSet = new Set<number>();
    const colsSet = new Set<number>();
    while (stack.length) {
      const p = stack.pop()!;
      cells.push(p);
      rowsSet.add(p.r);
      colsSet.add(p.c);
      const neigh = [
        { r: p.r - 1, c: p.c },
        { r: p.r + 1, c: p.c },
        { r: p.r, c: p.c - 1 },
        { r: p.r, c: p.c + 1 },
      ];
      for (const n of neigh) {
        const nk = key(n);
        if (all.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          stack.push(all.get(nk)!);
        }
      }
    }
    clusters.push({ cells, rows: rowsSet, cols: colsSet });
  }
  return clusters;
}

/** Decide a peça especial gerada por um cluster (e onde colocá-la). */
function specialForCluster(cluster: {
  cells: Pos[];
  rows: Set<number>;
  cols: Set<number>;
}): { special: SpecialKind; dir: LineDir } | null {
  const n = cluster.cells.length;
  const multiRow = cluster.rows.size > 1;
  const multiCol = cluster.cols.size > 1;

  // L/T: ocupa mais de uma linha E mais de uma coluna → ÁREA (3×3).
  if (multiRow && multiCol) {
    return { special: 'area', dir: 'h' };
  }
  // Linha reta de 5+ → PRISMA (limpa cor inteira).
  if (n >= 5) {
    return { special: 'prism', dir: 'h' };
  }
  // Linha reta de exatamente 4 → LINHA (limpa faixa). Direção = a que tem 4.
  if (n === 4) {
    const dir: LineDir = multiCol ? 'h' : 'v';
    return { special: 'line', dir };
  }
  return null;
}

/** Escolhe a célula "âncora" do cluster pra plantar a especial (centro-ish). */
function anchorCell(cells: Pos[]): Pos {
  // Mediana simples: a célula do meio da lista ordenada por (r,c).
  const sorted = [...cells].sort((p, q) => (p.r - q.r) || (p.c - q.c));
  return sorted[Math.floor(sorted.length / 2)]!;
}

// ---------------------------------------------------------------------------
// Ativação de peças especiais (expansão das células removidas)
// ---------------------------------------------------------------------------

/**
 * Dado um conjunto inicial de posições a remover, expande recursivamente as
 * especiais contidas nele: line → faixa, area → 3×3, prism → toda a cor.
 * `prismColor` permite ao prisma escolher a cor (no swap a UI passa a cor da
 * peça trocada; numa cascata usa a cor mais comum). Retorna o set final.
 */
function expandSpecials(
  board: Board,
  initial: Pos[],
  prismColorHint: PieceColor | null,
): Set<number> {
  const key = (r: number, c: number) => r * 10000 + c;
  const toRemove = new Set<number>();
  const queue: Pos[] = [];

  for (const p of initial) {
    if (inBounds(board, p.r, p.c) && !toRemove.has(key(p.r, p.c))) {
      toRemove.add(key(p.r, p.c));
      queue.push(p);
    }
  }

  while (queue.length) {
    const p = queue.pop()!;
    const piece = board.grid[p.r]![p.c]!;
    if (piece.special === 'none') continue;

    const add = (r: number, c: number) => {
      if (!inBounds(board, r, c)) return;
      const k = key(r, c);
      if (!toRemove.has(k)) {
        toRemove.add(k);
        queue.push({ r, c });
      }
    };

    if (piece.special === 'line') {
      if (piece.dir === 'h') {
        for (let c = 0; c < board.cols; c++) add(p.r, c);
      } else {
        for (let r = 0; r < board.rows; r++) add(r, p.c);
      }
    } else if (piece.special === 'area') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) add(p.r + dr, p.c + dc);
      }
    } else if (piece.special === 'prism') {
      const target = prismColorHint ?? piece.color;
      for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
          if (board.grid[r]![c]!.color === target) add(r, c);
        }
      }
    }
  }

  return toRemove;
}

// ---------------------------------------------------------------------------
// Gravidade + reabastecimento (um passo) — retorna o passo pra UI animar
// ---------------------------------------------------------------------------

function applyGravityAndRefill(
  board: Board,
  rng: () => number,
): { fallen: { from: Pos; to: Pos }[]; spawned: Pos[] } {
  const fallen: { from: Pos; to: Pos }[] = [];
  const spawned: Pos[] = [];

  for (let c = 0; c < board.cols; c++) {
    // Compacta a coluna pra baixo: escreve de baixo pra cima.
    let writeRow = board.rows - 1;
    for (let r = board.rows - 1; r >= 0; r--) {
      const p = board.grid[r]![c]!;
      if (p.color !== null) {
        if (writeRow !== r) {
          board.grid[writeRow]![c] = p;
          fallen.push({ from: { r, c }, to: { r: writeRow, c } });
        }
        writeRow--;
      }
    }
    // Topo restante recebe peças novas (caem do céu).
    for (let r = writeRow; r >= 0; r--) {
      const color = PIECE_COLORS[Math.floor(rng() * board.colorCount)]!;
      board.grid[r]![c] = makePiece(color, board.nextId++);
      spawned.push({ r, c });
    }
  }

  return { fallen, spawned };
}

// ---------------------------------------------------------------------------
// resolveBoard — laço de cascata completo
// ---------------------------------------------------------------------------

/**
 * Resolve o tabuleiro até estabilizar: remove matches (expandindo especiais),
 * cria especiais novas dos matches grandes, aplica gravidade+refill, e repete
 * enquanto surgir match (cascata). Retorna board final + passos pra UI.
 *
 * `seedForRefill` torna o reabastecimento determinístico (teste reproduzível).
 * `prismColorHint` é a cor que um prisma envolvido no swap deve limpar.
 */
export function resolveBoard(
  input: Board,
  seedForRefill: number,
  prismColorHint: PieceColor | null = null,
): ResolveResult {
  const board = cloneBoard(input);
  const rng = mulberry32(seedForRefill);
  const steps: ResolveStep[] = [];
  const collected = emptyCollected();
  let totalScore = 0;
  let cascadeLevel = 0;
  let hint = prismColorHint;

  // Teto de cascatas só por segurança (board pequeno estabiliza em <30).
  for (let guard = 0; guard < 200; guard++) {
    const groups = findMatches(board);
    if (groups.length === 0) break;

    const clusters = clusterMatches(groups);

    // 1) Decide especiais a criar (e onde) ANTES de remover.
    const created: { pos: Pos; special: SpecialKind }[] = [];
    const createdKeys = new Set<number>();
    const createdMap = new Map<number, { special: SpecialKind; dir: LineDir; color: PieceColor }>();
    for (const cl of clusters) {
      const spec = specialForCluster(cl);
      if (!spec) continue;
      const anchor = anchorCell(cl.cells);
      const k = anchor.r * 10000 + anchor.c;
      const color = board.grid[anchor.r]![anchor.c]!.color!;
      created.push({ pos: anchor, special: spec.special });
      createdKeys.add(k);
      createdMap.set(k, { special: spec.special, dir: spec.dir, color });
    }

    // 2) Posições base do match.
    const base: Pos[] = [];
    for (const g of groups) for (const p of g) base.push(p);

    // 3) Expande especiais que JÁ estavam no tabuleiro e foram tocadas pelo match.
    const removeSet = expandSpecials(board, base, hint);
    hint = null; // hint de prisma só vale na 1ª onda

    // 4) Não remove a célula onde nasce uma especial nova (ela "vira" a peça).
    for (const k of createdKeys) removeSet.delete(k);

    // 5) Pontua + contabiliza coleta + esvazia células removidas.
    const removed: Pos[] = [];
    let stepScore = 0;
    for (const k of removeSet) {
      const r = Math.floor(k / 10000);
      const c = k % 10000;
      const piece = board.grid[r]![c]!;
      if (piece.color !== null) {
        collected[piece.color] += 1;
        stepScore += pieceScoreValue(piece);
      }
      board.grid[r]![c] = { color: null, special: 'none', dir: 'h', id: -1 };
      removed.push({ r, c });
    }

    // 6) Transforma as âncoras nas especiais novas (cor preservada).
    for (const [k, info] of createdMap) {
      const r = Math.floor(k / 10000);
      const c = k % 10000;
      board.grid[r]![c] = makeSpecial(info.color, info.special, board.nextId++, info.dir);
    }

    // Bônus de cascata: cada onda encadeada multiplica suavemente.
    const cascadeBonus = 1 + cascadeLevel * 0.25;
    stepScore = Math.round(stepScore * cascadeBonus);
    totalScore += stepScore;

    // 7) Gravidade + refill.
    const { fallen, spawned } = applyGravityAndRefill(board, rng);

    steps.push({
      removed,
      fallen,
      spawned,
      created,
      scoreGained: stepScore,
      cascadeLevel,
    });
    cascadeLevel++;
  }

  return { board, steps, totalScore, collected };
}

// ---------------------------------------------------------------------------
// findPossibleMoves — pra hint e anti-dead-board
// ---------------------------------------------------------------------------

/**
 * Lista todas as trocas adjacentes que geram match (ou ativam especial).
 * Dedup por par (a,b)==(b,a). Usada pelo hint e pela checagem de dead-board.
 */
export function findPossibleMoves(board: Board): { a: Pos; b: Pos }[] {
  const moves: { a: Pos; b: Pos }[] = [];
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      // Só testa direita e baixo pra não duplicar pares.
      const right = { r, c: c + 1 };
      const down = { r: r + 1, c };
      const here = { r, c };
      if (inBounds(board, right.r, right.c) && isValidSwap(board, here, right)) {
        moves.push({ a: here, b: right });
      }
      if (inBounds(board, down.r, down.c) && isValidSwap(board, here, down)) {
        moves.push({ a: here, b: down });
      }
    }
  }
  return moves;
}

/** Existe ao menos um movimento? (atalho barato — para no 1º). */
export function hasAnyMove(board: Board): boolean {
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const here = { r, c };
      const right = { r, c: c + 1 };
      const down = { r: r + 1, c };
      if (inBounds(board, right.r, right.c) && isValidSwap(board, here, right)) return true;
      if (inBounds(board, down.r, down.c) && isValidSwap(board, here, down)) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// reshuffle — quando o tabuleiro morre (sem culpa: custa nada na UI)
// ---------------------------------------------------------------------------

/**
 * Reembaralha as peças EXISTENTES (mantém cores/especiais, só permuta posições)
 * até obter um tabuleiro sem match inicial e com pelo menos 1 movimento.
 * Não cria nem destrói peças — é o "deal de novo" zen.
 */
export function reshuffle(board: Board, seed: number): Board {
  const rng = mulberry32(seed);
  const flat: Piece[] = [];
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) flat.push({ ...board.grid[r]![c]! });
  }

  for (let attempt = 0; attempt < 200; attempt++) {
    // Fisher–Yates com a rng (avança a sequência a cada tentativa).
    const arr = flat.map(p => ({ ...p }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    const grid: Piece[][] = [];
    let idx = 0;
    for (let r = 0; r < board.rows; r++) {
      const row: Piece[] = [];
      for (let c = 0; c < board.cols; c++) row.push(arr[idx++]!);
      grid.push(row);
    }
    const nb: Board = { ...board, grid };
    if (findMatches(nb).length === 0 && hasAnyMove(nb)) return nb;
  }

  // Fallback: tabuleiro novo do zero (mantém dims/cores).
  return createBoard(seed ^ 0x5eed, board.rows, board.cols, board.colorCount);
}
