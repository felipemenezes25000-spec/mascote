/**
 * Zen Match — 1000 fases procedurais.
 *
 * Invariantes:
 * - LEVEL_COUNT === 1000; getLevel(1..1000) sempre válido (dims/cores/target sanos).
 * - moves > 0 em toda fase; target > 0 exceto 'zen' (target 0).
 * - 'zen' a cada 10 fases (respiro garantido).
 * - difficultyScore ~não-decrescente por MÉDIA de capítulo (curva suave).
 * - determinismo: getLevel(n) só depende de n.
 * - 20 capítulos com identidade; chapterFor coerente.
 */

import { describe, expect, it } from 'vitest';
import {
  CHAPTER_COUNT,
  CHAPTER_SIZE,
  CHAPTERS,
  chapterFor,
  difficultyScore,
  getLevel,
  LEVEL_COUNT,
  levelsInChapter,
  objectiveLabel,
} from '@/game/match3/levels';
import { PIECE_COLORS } from '@/game/match3/pieces';

describe('estrutura — 1000 fases / 20 capítulos', () => {
  it('LEVEL_COUNT === 1000 e 20 capítulos de 50', () => {
    expect(LEVEL_COUNT).toBe(1000);
    expect(CHAPTER_COUNT).toBe(20);
    expect(CHAPTER_SIZE).toBe(50);
    expect(CHAPTERS.length).toBe(20);
  });

  it('cada capítulo tem identidade (nome, hue válido, mecânica)', () => {
    CHAPTERS.forEach((ch, i) => {
      expect(ch.index).toBe(i);
      expect(ch.name.length).toBeGreaterThan(2);
      expect(ch.hue).toBeGreaterThanOrEqual(0);
      expect(ch.hue).toBeLessThanOrEqual(360);
      expect(ch.mechanic.length).toBeGreaterThan(4);
    });
  });

  it('nomes de capítulo são únicos', () => {
    expect(new Set(CHAPTERS.map(c => c.name)).size).toBe(20);
  });
});

describe('getLevel — validade de todas as 1000 fases', () => {
  it('toda fase 1..1000 é estruturalmente sã', () => {
    for (let n = 1; n <= LEVEL_COUNT; n++) {
      const lvl = getLevel(n);
      expect(lvl.n).toBe(n);
      expect(lvl.chapter).toBe(chapterFor(n));
      expect(lvl.rows).toBeGreaterThanOrEqual(7);
      expect(lvl.rows).toBeLessThanOrEqual(9);
      expect(lvl.cols).toBeGreaterThanOrEqual(7);
      expect(lvl.cols).toBeLessThanOrEqual(9);
      expect(lvl.colorCount).toBeGreaterThanOrEqual(3);
      expect(lvl.colorCount).toBeLessThanOrEqual(6);
      expect(lvl.moves).toBeGreaterThan(0);
      expect(lvl.theme).toBe(CHAPTERS[lvl.chapter]);
      if (lvl.objective === 'zen') {
        expect(lvl.target).toBe(0);
      } else {
        expect(lvl.target).toBeGreaterThan(0);
      }
      if (lvl.objective === 'collect') {
        expect(lvl.collectColor).not.toBeNull();
        expect(PIECE_COLORS).toContain(lvl.collectColor!);
      } else {
        expect(lvl.collectColor).toBeNull();
      }
    }
  });

  it('movimentos são generosos (>= 18 fora do respiro)', () => {
    for (let n = 1; n <= LEVEL_COUNT; n++) {
      const lvl = getLevel(n);
      if (lvl.objective !== 'zen') expect(lvl.moves).toBeGreaterThanOrEqual(18);
    }
  });
});

describe('respiro zen a cada 10 fases', () => {
  it('toda fase múltipla de 10 é zen, nenhuma outra é', () => {
    for (let n = 1; n <= LEVEL_COUNT; n++) {
      const lvl = getLevel(n);
      if (n % 10 === 0) expect(lvl.objective).toBe('zen');
      else expect(lvl.objective).not.toBe('zen');
    }
  });

  it('existem fases zen suficientes (1 a cada 10 → 100)', () => {
    let count = 0;
    for (let n = 1; n <= LEVEL_COUNT; n++) if (getLevel(n).objective === 'zen') count++;
    expect(count).toBe(100);
  });
});

describe('variedade de objetivos', () => {
  it('usa pelo menos 4 tipos de objetivo ao longo da jornada', () => {
    const kinds = new Set<string>();
    for (let n = 1; n <= LEVEL_COUNT; n++) kinds.add(getLevel(n).objective);
    expect(kinds.size).toBeGreaterThanOrEqual(4);
    expect(kinds.has('score')).toBe(true);
    expect(kinds.has('collect')).toBe(true);
    expect(kinds.has('zen')).toBe(true);
  });
});

describe('curva de dificuldade ~suave e crescente', () => {
  it('média de dificuldade por capítulo é não-decrescente', () => {
    const avgByChapter: number[] = [];
    for (let ch = 0; ch < CHAPTER_COUNT; ch++) {
      const lvls = levelsInChapter(ch);
      const avg = lvls.reduce((a, l) => a + difficultyScore(l.n), 0) / lvls.length;
      avgByChapter.push(avg);
    }
    for (let i = 1; i < avgByChapter.length; i++) {
      expect(avgByChapter[i]!).toBeGreaterThan(avgByChapter[i - 1]!);
    }
  });

  it('board e cores não diminuem entre capítulos', () => {
    let prevSize = 0;
    let prevColors = 0;
    for (let ch = 0; ch < CHAPTER_COUNT; ch++) {
      const first = getLevel(ch * CHAPTER_SIZE + 1);
      const size = first.rows * first.cols;
      expect(size).toBeGreaterThanOrEqual(prevSize);
      expect(first.colorCount).toBeGreaterThanOrEqual(prevColors);
      prevSize = size;
      prevColors = first.colorCount;
    }
  });
});

describe('determinismo e robustez', () => {
  it('getLevel(n) só depende de n', () => {
    for (const n of [1, 10, 137, 500, 999, 1000]) {
      expect(getLevel(n)).toEqual(getLevel(n));
    }
  });

  it('entrada fora de faixa é clampeada sem crashar', () => {
    expect(getLevel(0).n).toBe(1);
    expect(getLevel(-5).n).toBe(1);
    expect(getLevel(99999).n).toBe(LEVEL_COUNT);
    expect(getLevel(NaN).n).toBe(1);
  });

  it('chapterFor coerente nos limites', () => {
    expect(chapterFor(1)).toBe(0);
    expect(chapterFor(50)).toBe(0);
    expect(chapterFor(51)).toBe(1);
    expect(chapterFor(1000)).toBe(19);
  });

  it('objectiveLabel devolve texto não-vazio em todo objetivo', () => {
    for (const n of [1, 10, 4, 50, 250, 600]) {
      expect(objectiveLabel(getLevel(n)).length).toBeGreaterThan(3);
    }
  });
});
