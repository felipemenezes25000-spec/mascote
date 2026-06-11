/**
 * Zen Match — engine pura.
 *
 * Invariantes críticos:
 * - createBoard: zero match inicial + pelo menos 1 movimento (nunca dead-board).
 * - findMatches detecta linhas/colunas de 3+; nunca casa célula vazia.
 * - isValidSwap só vale se cria match (ou envolve especial).
 * - resolveBoard cascateia até estabilizar e nunca deixa match pendente.
 * - especiais nascem do formato certo (4=line, L/T=area, 5-reta=prism).
 * - reshuffle reconstrói um board jogável quando não há movimento.
 * - determinismo: mesmo seed → mesmo board.
 * - entrada corrompida (NaN/índice fora) nunca crasha.
 */

import { describe, expect, it } from 'vitest';
import {
  applySwap,
  createBoard,
  findMatches,
  findPossibleMoves,
  hasAnyMove,
  isValidSwap,
  makePiece,
  makeSpecial,
  resolveBoard,
  reshuffle,
  type Board,
  type Piece,
} from '@/game/match3';
import { PIECE_COLORS, type PieceColor } from '@/game/match3/pieces';

// ---------------------------------------------------------------------------
// Helpers de teste — montar boards à mão a partir de uma "planta" de cores.
// ---------------------------------------------------------------------------

/** Cria board a partir de matriz de letras (w/s/l/m/u/h). Sem especiais. */
function boardFrom(plan: string[]): Board {
  const map: Record<string, PieceColor> = {
    w: 'water',
    s: 'star',
    l: 'leaf',
    m: 'moon',
    u: 'sun',
    h: 'heart',
  };
  let id = 1;
  const grid: Piece[][] = plan.map(rowStr =>
    rowStr.split('').map(ch => makePiece(map[ch]!, id++)),
  );
  const colors = new Set<PieceColor>();
  grid.forEach(row => row.forEach(p => colors.add(p.color!)));
  return {
    rows: grid.length,
    cols: grid[0]!.length,
    colorCount: Math.max(3, colors.size),
    grid,
    nextId: id,
  };
}

describe('createBoard — sem match e com movimento', () => {
  it('nenhum dos primeiros 60 boards tem match inicial', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const b = createBoard(seed, 8, 8, 5);
      expect(findMatches(b).length).toBe(0);
    }
  });

  it('todo board gerado tem pelo menos 1 movimento possível', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const b = createBoard(seed, 8, 8, 5);
      expect(hasAnyMove(b)).toBe(true);
      expect(findPossibleMoves(b).length).toBeGreaterThan(0);
    }
  });

  it('respeita dimensões e nº de cores', () => {
    const b = createBoard(7, 7, 9, 4);
    expect(b.rows).toBe(7);
    expect(b.cols).toBe(9);
    expect(b.colorCount).toBe(4);
    const used = new Set(b.grid.flat().map(p => p.color));
    expect(used.size).toBeLessThanOrEqual(4);
  });

  it('determinismo: mesma seed → board idêntico', () => {
    expect(createBoard(123, 8, 8, 5)).toEqual(createBoard(123, 8, 8, 5));
    expect(createBoard(0, 7, 7, 6)).toEqual(createBoard(0, 7, 7, 6));
  });

  it('seeds diferentes divergem (na prática)', () => {
    const a = JSON.stringify(createBoard(1, 8, 8, 6).grid.map(r => r.map(p => p.color)));
    const diverges = [2, 3, 4, 5].some(
      s => JSON.stringify(createBoard(s, 8, 8, 6).grid.map(r => r.map(p => p.color))) !== a,
    );
    expect(diverges).toBe(true);
  });

  it('sanitiza entrada corrompida sem crashar', () => {
    const b = createBoard(NaN, NaN, NaN, NaN);
    expect(b.rows).toBeGreaterThanOrEqual(3);
    expect(b.cols).toBeGreaterThanOrEqual(3);
    expect(b.colorCount).toBeGreaterThanOrEqual(3);
    expect(findMatches(b).length).toBe(0);
  });
});

describe('findMatches', () => {
  it('detecta 3 em linha horizontal', () => {
    const b = boardFrom([
      'wwwsl',
      'shmus',
      'lushm',
    ]);
    const groups = findMatches(b);
    const flat = groups.flat();
    expect(flat).toContainEqual({ r: 0, c: 0 });
    expect(flat).toContainEqual({ r: 0, c: 1 });
    expect(flat).toContainEqual({ r: 0, c: 2 });
  });

  it('detecta 4 em coluna', () => {
    const b = boardFrom([
      'wsl',
      'wsl',
      'wlh',
      'wsh',
    ]);
    // coluna 0 = w,w,w,w (4 em linha)
    const groups = findMatches(b);
    const col0 = groups.find(g => g.every(p => p.c === 0));
    expect(col0?.length).toBe(4);
  });

  it('não casa célula vazia', () => {
    const b = boardFrom(['wws', 'lmh', 'uhl']);
    // Esvazia (0,2) e (0,1) — sobra só (0,0) = sem match
    b.grid[0]![1] = { color: null, special: 'none', dir: 'h', id: -1 };
    b.grid[0]![2] = { color: null, special: 'none', dir: 'h', id: -1 };
    expect(findMatches(b).length).toBe(0);
  });
});

describe('isValidSwap / applySwap', () => {
  it('troca que cria match é válida', () => {
    // tabuleiro onde trocar (0,2)<->(1,2) faz uma coluna de 3 'w'
    const b = boardFrom([
      'slw',
      'shs',  // (1,2) = 's'
      'mhw',
      'uuw',
    ]);
    // col 2: w,s,w,w → troca (1,2)s com (1,1)h não ajuda; vamos montar caso direto.
    const b2 = boardFrom([
      'wsl',
      'sws', // trocar (1,0)s e (1,1)w → col0 vira w,w,? ...
      'wlh',
      'wuh',
    ]);
    // col0 = w,s,w,w. Trocar (1,0)s ↔ (1,1)w → col0 = w,w,w,w
    expect(isValidSwap(b2, { r: 1, c: 0 }, { r: 1, c: 1 })).toBe(true);
    void b;
  });

  it('troca que NÃO cria match é inválida', () => {
    const b = boardFrom([
      'wslmu',
      'slmuw',
      'lmuws',
    ]);
    // troca de dois vizinhos que não alinham nada
    expect(isValidSwap(b, { r: 0, c: 0 }, { r: 0, c: 1 })).toBe(false);
  });

  it('troca não-adjacente é inválida', () => {
    const b = createBoard(5, 7, 7, 5);
    expect(isValidSwap(b, { r: 0, c: 0 }, { r: 2, c: 2 })).toBe(false);
  });

  it('índices fora / NaN nunca crasham', () => {
    const b = createBoard(5, 7, 7, 5);
    expect(isValidSwap(b, { r: -1, c: 0 }, { r: 0, c: 0 })).toBe(false);
    expect(isValidSwap(b, { r: NaN, c: 0 }, { r: 0, c: 0 })).toBe(false);
    expect(isValidSwap(b, { r: 99, c: 99 }, { r: 0, c: 0 })).toBe(false);
    // applySwap inválido = board inalterado
    expect(applySwap(b, { r: -1, c: 0 }, { r: 0, c: 0 })).toEqual(b);
  });
});

describe('resolveBoard — cascata até estável', () => {
  it('remove o match e estabiliza sem match pendente', () => {
    const b = boardFrom([
      'lmsu',
      'uslm',
      'wwwm', // 3 'w' na base
      'slmu',
    ]);
    const res = resolveBoard(b, 999);
    expect(res.steps.length).toBeGreaterThan(0);
    // Board final nunca tem match pendente nem célula vazia.
    expect(findMatches(res.board).length).toBe(0);
    const anyEmpty = res.board.grid.flat().some(p => p.color === null);
    expect(anyEmpty).toBe(false);
  });

  it('pontua e contabiliza coleta por cor', () => {
    const b = boardFrom([
      'lmsu',
      'uslm',
      'wwwm',
      'slmu',
    ]);
    const res = resolveBoard(b, 7);
    expect(res.totalScore).toBeGreaterThan(0);
    const totalCollected = Object.values(res.collected).reduce((a, c) => a + c, 0);
    expect(totalCollected).toBeGreaterThanOrEqual(3);
  });

  it('determinismo: mesmo board+seed → mesmo resultado', () => {
    const b = boardFrom(['lmsu', 'uslm', 'wwwm', 'slmu']);
    const r1 = resolveBoard(b, 42);
    const r2 = resolveBoard(b, 42);
    expect(r1.board).toEqual(r2.board);
    expect(r1.totalScore).toBe(r2.totalScore);
  });

  it('board sem match não muda', () => {
    const b = createBoard(11, 7, 7, 5); // garantido sem match
    const res = resolveBoard(b, 1);
    expect(res.steps.length).toBe(0);
    expect(res.totalScore).toBe(0);
    expect(res.board.grid.map(r => r.map(p => p.color))).toEqual(
      b.grid.map(r => r.map(p => p.color)),
    );
  });
});

describe('peças especiais', () => {
  it('match de 4 em linha cria uma peça-linha', () => {
    const b = boardFrom([
      'wwwwl', // 4 'w' em linha horizontal na linha 0
      'slmus',
      'lmusl',
      'mussl',
    ]);
    const res = resolveBoard(b, 3);
    const createdKinds = res.steps.flatMap(s => s.created.map(c => c.special));
    expect(createdKinds).toContain('line');
  });

  it('match de 5 em linha reta cria um prisma', () => {
    const b = boardFrom([
      'wwwww', // 5 'w' em linha
      'slmus',
      'lmusl',
      'muslm',
    ]);
    const res = resolveBoard(b, 3);
    const createdKinds = res.steps.flatMap(s => s.created.map(c => c.special));
    expect(createdKinds).toContain('prism');
  });

  it('match em L (linha+coluna cruzando) cria peça-área', () => {
    // 'w' formando um L: linha 0 cols 0-2 + coluna 0 linhas 0-2
    const b = boardFrom([
      'wwwsl',
      'wslms',
      'wmslu',
      'slmus',
    ]);
    const res = resolveBoard(b, 3);
    const createdKinds = res.steps.flatMap(s => s.created.map(c => c.special));
    expect(createdKinds).toContain('area');
  });

  it('peça-linha ativada limpa a faixa inteira', () => {
    // Monta um board com uma peça-linha horizontal na linha 1 e um match que a inclua.
    const b = boardFrom([
      'slmus',
      'wwxus'.replace('x', 'w'), // linha 1 = w w w u s → 3 w aciona; col não importa
      'lmusl',
      'muslm',
    ]);
    // Substitui a peça (1,0) por uma peça-linha 'water' horizontal.
    b.grid[1]![0] = makeSpecial('water', 'line', 777, 'h');
    const res = resolveBoard(b, 5);
    // A linha 1 inteira deve ter sido removida em algum passo (>= cols peças tocadas).
    const removedInRow1 = res.steps
      .flatMap(s => s.removed)
      .filter(p => p.r === 1).length;
    expect(removedInRow1).toBeGreaterThanOrEqual(b.cols - 1);
  });
});

describe('reshuffle — sem movimento', () => {
  it('mantém o multiset de peças e produz board jogável', () => {
    const b = createBoard(9, 7, 7, 5);
    const shuffled = reshuffle(b, 123);
    expect(findMatches(shuffled).length).toBe(0);
    expect(hasAnyMove(shuffled)).toBe(true);
    // Mesmo multiset de cores (não criou nem destruiu peça).
    const count = (board: Board) => {
      const m: Record<string, number> = {};
      board.grid.flat().forEach(p => {
        m[p.color!] = (m[p.color!] ?? 0) + 1;
      });
      return m;
    };
    expect(count(shuffled)).toEqual(count(b));
  });

  it('determinismo: mesmo board+seed → mesmo shuffle', () => {
    const b = createBoard(9, 7, 7, 5);
    expect(reshuffle(b, 55)).toEqual(reshuffle(b, 55));
  });
});

describe('robustez geral', () => {
  it('PIECE_COLORS tem 6 cores únicas', () => {
    expect(new Set(PIECE_COLORS).size).toBe(6);
  });

  it('findPossibleMoves nunca retorna par não-adjacente', () => {
    const b = createBoard(3, 7, 7, 5);
    for (const { a, c } of findPossibleMoves(b).map(m => ({ a: m.a, c: m.b }))) {
      const dr = Math.abs(a.r - c.r);
      const dc = Math.abs(a.c - c.c);
      expect(dr + dc).toBe(1);
    }
  });
});
