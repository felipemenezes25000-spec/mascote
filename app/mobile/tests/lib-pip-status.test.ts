/**
 * Testes do derivePipStatus — fonte única do status do mascote.
 *
 * O hook usePipStatus apenas envolve com useMemo. derivePipStatus contém toda
 * a lógica pura — testar isso cobre 100% do comportamento.
 */
import { describe, expect, it } from 'vitest';
import { derivePipStatus } from '@/hooks/usePipStatus';
import { neutralGenome, generateGenome } from '@/lib/dna';
import type { Mascot } from '@/types';

function makeMascot(overrides: Partial<Mascot> = {}): Mascot {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Pip',
    personality: 'calmo',
    phase: 'bebe',
    mood: 'feliz',
    xp: 150,
    level: 3,
    energy: 80,
    health: 100,
    created_at: '2026-05-01T10:00:00.000Z',
    last_seen_at: '2026-05-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('derivePipStatus', () => {
  it('mascot null retorna struct vazia com ready=false', () => {
    const s = derivePipStatus(null);
    expect(s.ready).toBe(false);
    expect(s.name).toBe('');
    expect(s.level).toBe(1);
  });

  it('mascot básico retorna ready=true', () => {
    const s = derivePipStatus(makeMascot());
    expect(s.ready).toBe(true);
    expect(s.name).toBe('Pip');
  });

  it.each([
    [0, 1],
    [50, 2],
    [100, 2],
    [150, 3],
    [500, 5],
    [2000, 9],
  ])('xp=%i → level=%i', (xp, expectedLevel) => {
    const s = derivePipStatus(makeMascot({ xp }));
    expect(s.level).toBe(expectedLevel);
  });

  it.each([
    [0, 'ovo'],
    [99, 'ovo'],
    [100, 'bebe'],
    [500, 'crianca'],
    [2000, 'adolescente'],
    [8000, 'adulto'],
    [25000, 'evoluido'],
  ])('xp=%i → phase=%s', (xp, expectedPhase) => {
    const s = derivePipStatus(makeMascot({ xp }));
    expect(s.phase).toBe(expectedPhase);
  });

  it('phaseLabel é PT-BR para cada phase', () => {
    const labels = new Set<string>();
    for (const xp of [0, 100, 500, 2000, 8000, 25000]) {
      labels.add(derivePipStatus(makeMascot({ xp })).phaseLabel);
    }
    // Pelo menos 5 labels distintas (ovo, bebê, criança, ...)
    expect(labels.size).toBeGreaterThanOrEqual(5);
  });

  it('archetype é determinado pelo gene dominante do genome', () => {
    const dna = { ...neutralGenome(), curiosity: 0.95 };
    const s = derivePipStatus(makeMascot({ dna }));
    expect(s.archetype).toBe('curiosity');
    expect(s.archetypeName).toContain('Explorador');
  });

  it('mascot sem dna usa fallback "O Acolhedor" / empathy', () => {
    const s = derivePipStatus(makeMascot({ dna: undefined }));
    expect(s.archetype).toBe('empathy');
    expect(s.archetypeName).toBe('O Acolhedor');
  });

  it('archetypePct em [0, 100]', () => {
    for (const seed of [1, 42, 999, 12345]) {
      const dna = generateGenome(seed);
      const s = derivePipStatus(makeMascot({ dna }));
      expect(s.archetypePct).toBeGreaterThanOrEqual(2);
      expect(s.archetypePct).toBeLessThanOrEqual(98);
    }
  });

  it('compactLine inclui level + archetypeName + pct quando há dna', () => {
    const dna = { ...neutralGenome(), discipline: 0.92 };
    const s = derivePipStatus(makeMascot({ xp: 500, dna }));
    expect(s.compactLine).toMatch(/nv 5/);
    expect(s.compactLine).toMatch(/Refinado/);
    expect(s.compactLine).toMatch(/\d+%/);
  });

  it('compactLine fallback usa phaseLabel quando não há dna', () => {
    const s = derivePipStatus(makeMascot({ xp: 500, dna: undefined }));
    expect(s.compactLine).toMatch(/nv \d+ · criança/i);
  });

  it('nextLevel.progress está em [0, 1]', () => {
    for (const xp of [0, 25, 50, 99, 100, 150, 500, 1000]) {
      const s = derivePipStatus(makeMascot({ xp }));
      expect(s.nextLevel.progress).toBeGreaterThanOrEqual(0);
      expect(s.nextLevel.progress).toBeLessThanOrEqual(1);
    }
  });

  it('mood é repassado intacto', () => {
    expect(derivePipStatus(makeMascot({ mood: 'empolgado' })).mood).toBe('empolgado');
    expect(derivePipStatus(makeMascot({ mood: 'triste' })).mood).toBe('triste');
  });
});

describe('derivePipStatus — defensividade', () => {
  it('dna corrompida (string) ainda gera archetype válido via sanitize', () => {
    const s = derivePipStatus(makeMascot({ dna: 'garbage' as any }));
    expect(s.ready).toBe(true);
    expect(s.archetype).toBeDefined();
  });

  it('xp negativo retorna level 1', () => {
    const s = derivePipStatus(makeMascot({ xp: -100 }));
    expect(s.level).toBe(1);
  });

  it('name vazio retorna string vazia mas ready=true', () => {
    const s = derivePipStatus(makeMascot({ name: '' }));
    expect(s.ready).toBe(true);
    expect(s.name).toBe('');
  });
});
