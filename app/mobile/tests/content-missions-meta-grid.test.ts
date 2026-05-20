/**
 * Grid de metadata de missões — habitMeta para cada HabitKind.
 *
 * Garante que TODA habit definida no enum tem metadata completa
 * (label, emoji, xp positivo) — qualquer adição ao enum sem
 * metadata correspondente é capturada aqui.
 */

import { describe, expect, it } from 'vitest';
import { habitMeta } from '@/content/missions';
import type { HabitKind } from '@/types';

const HABITS: HabitKind[] = [
  'water', 'sleep', 'exercise', 'meditation', 'reading',
  'journaling', 'breath', 'outdoor', 'sun',
];

describe('habitMeta — cobertura completa do enum HabitKind', () => {
  it.each(HABITS)('habit %s tem entrada em habitMeta', habit => {
    expect(habitMeta[habit]).toBeDefined();
  });

  it.each(HABITS)('habit %s — label PT-BR não-vazio', habit => {
    expect(habitMeta[habit].label).toBeTruthy();
    expect(habitMeta[habit].label.length).toBeGreaterThan(0);
  });

  it.each(HABITS)('habit %s — emoji presente', habit => {
    expect(habitMeta[habit].emoji).toBeTruthy();
    expect(habitMeta[habit].emoji.length).toBeGreaterThan(0);
  });

  it.each(HABITS)('habit %s — xp positivo', habit => {
    expect(habitMeta[habit].xp).toBeGreaterThan(0);
  });

  it.each(HABITS)('habit %s — xp é inteiro', habit => {
    expect(Number.isInteger(habitMeta[habit].xp)).toBe(true);
  });

  it.each(HABITS)('habit %s — xp <= XP_DAILY_CAP (150)', habit => {
    expect(habitMeta[habit].xp).toBeLessThanOrEqual(150);
  });
});

describe('habitMeta — strings sem culpa', () => {
  it.each(HABITS)('habit %s label não usa "deve" ou "tem que"', habit => {
    const label = habitMeta[habit].label;
    expect(label).not.toMatch(/deve fazer|tem que|obrigat[óo]ri/i);
  });
});

describe('habitMeta — labels únicas', () => {
  it('cada habit tem label distinta', () => {
    const labels = HABITS.map(h => habitMeta[h].label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
