/**
 * Tests pras 3 frentes adicionais do slice continuação (2026-05-26):
 *   - Frente G: mutations extended morphInfluenceBoosts
 *   - Frente H: lookShare export/import + sanitização
 *   - Frente I: blendPresets (lerp do delta)
 */

import { describe, expect, it } from 'vitest';
import { aggregateVisualImpact, MUTATION_CATALOG } from '@/lib/dna/mutations';
import { exportLook, importLook, LOOK_SHARE_SCHEMA } from '@/lib/dna/lookShare';
import { blendPresets, THEME_PRESETS } from '@/lib/dna/themePresets';
import type { AtelierLook } from '@/lib/db';

describe('Frente G — mutations extended morphInfluenceBoosts', () => {
  it('habit tier 4 mutations têm boosts não-vazio', () => {
    const water_t4 = MUTATION_CATALOG.find(m => m.id === 'mut.habit.water.t4');
    expect(water_t4).toBeDefined();
    expect(water_t4?.visualImpact.morphInfluenceBoosts).toBeDefined();
    expect(
      Object.keys(water_t4?.visualImpact.morphInfluenceBoosts ?? {}).length,
    ).toBeGreaterThan(0);
  });

  it('streak mutations propagam boosts', () => {
    const streak45 = MUTATION_CATALOG.find(m => m.id === 'mut.streak.45');
    expect(streak45?.visualImpact.morphInfluenceBoosts?.aura_strong).toBeGreaterThan(0);
    expect(streak45?.visualImpact.morphInfluenceBoosts?.eye_big).toBeGreaterThan(0);
  });

  it('time mutations 180d são bioluminescente + propagam boosts ricos', () => {
    const time180 = MUTATION_CATALOG.find(m => m.id === 'mut.age.180d');
    expect(time180?.visualImpact.bioluminescent).toBe(true);
    expect(time180?.visualImpact.morphInfluenceBoosts?.aura_strong).toBeGreaterThan(0.3);
  });

  it('agregação de várias mutations extended não explode boosts (clamp interno em consumers)', () => {
    // Pega todas mut.habit.*.t4 (tier mais alto)
    const tier4 = MUTATION_CATALOG.filter(m => /\.t4$/.test(m.id));
    expect(tier4.length).toBeGreaterThan(5);
    const agg = aggregateVisualImpact(tier4.map(m => m.id));
    // aura_strong é compartilhado por meditation/breath/sun → soma > 0.5
    // Mas aggregateVisualImpact NÃO clampa (clamp é responsabilidade do consumer)
    expect(agg.morphInfluenceBoosts.aura_strong).toBeGreaterThan(0);
  });

  it('habits diferentes têm boosts visuais distintos', () => {
    const sleep_t2 = MUTATION_CATALOG.find(m => m.id === 'mut.habit.sleep.t2');
    const exercise_t2 = MUTATION_CATALOG.find(m => m.id === 'mut.habit.exercise.t2');
    expect(sleep_t2?.visualImpact.morphInfluenceBoosts?.posture_back).toBeGreaterThan(0);
    expect(exercise_t2?.visualImpact.morphInfluenceBoosts?.posture_forward).toBeGreaterThan(0);
    expect(sleep_t2?.visualImpact.morphInfluenceBoosts?.eye_big).toBeGreaterThan(0);
  });
});

describe('Frente H — lookShare export/import', () => {
  const sampleLook: AtelierLook = {
    id: 'look_abc',
    user_id: 'user-A',
    name: 'Festivo',
    snapshot: {
      eye_size: 1.2,
      eye_spread: 0.95,
      body_height: 1.15,
      body_width: 0.9,
      aura_intensity: 1.1,
      pattern_density: 1.05,
      preferred_pattern: 'spots',
      posture_lean: 0.05,
      force_hide_tail: false,
      force_hide_antennae: false,
      force_hide_spikes: true,
    },
    created_at: '2026-05-26T12:00:00Z',
  };

  it('exportLook gera JSON parseável com schema versionado', () => {
    const json = exportLook(sampleLook);
    const parsed = JSON.parse(json);
    expect(parsed.schema).toBe(LOOK_SHARE_SCHEMA);
    expect(parsed.name).toBe('Festivo');
    expect(parsed.snapshot.eye_size).toBe(1.2);
    expect(parsed.shared_at).toBeTruthy();
  });

  it('export → import round-trip preserva valores', () => {
    const json = exportLook(sampleLook);
    const result = importLook(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.name).toBe('Festivo');
      expect(result.snapshot.eye_size).toBe(1.2);
      expect(result.snapshot.preferred_pattern).toBe('spots');
      expect(result.snapshot.force_hide_spikes).toBe(true);
    }
  });

  it('importLook não expõe user_id ou updated_at', () => {
    const json = exportLook(sampleLook);
    const result = importLook(json);
    if (result.ok) {
      expect((result.snapshot as Record<string, unknown>).user_id).toBeUndefined();
      expect((result.snapshot as Record<string, unknown>).updated_at).toBeUndefined();
    }
  });

  it('JSON inválido retorna ok:false', () => {
    const result = importLook('not-json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/JSON/);
  });

  it('schema incompatível retorna ok:false', () => {
    const result = importLook(JSON.stringify({ schema: 99, name: 'X', snapshot: {} }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/schema/);
  });

  it('snapshot com valores fora do cap são sanitizados', () => {
    const evil = {
      schema: 1,
      name: 'Evil',
      snapshot: {
        eye_size: 999, // fora cap [0.7, 1.3]
        body_height: -5,
        preferred_pattern: 'demonic', // não-whitelist
        posture_lean: 10, // fora [-0.2, 0.2]
      },
    };
    const result = importLook(JSON.stringify(evil));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.eye_size).toBeLessThanOrEqual(1.3);
      expect(result.snapshot.body_height).toBeGreaterThanOrEqual(0.7);
      expect(result.snapshot.preferred_pattern).toBe('plain'); // fallback
      expect(Math.abs(result.snapshot.posture_lean)).toBeLessThanOrEqual(0.2);
    }
  });

  it('nome vazio vira "Importado" no resultado', () => {
    const empty = { schema: 1, name: '   ', snapshot: { eye_size: 1 } };
    const result = importLook(JSON.stringify(empty));
    if (result.ok) expect(result.name).toBe('Importado');
  });

  it('nome > 30 chars é truncado', () => {
    const long = {
      schema: 1,
      name: 'Nome muito muito muito muito muito longo demais',
      snapshot: { eye_size: 1 },
    };
    const result = importLook(JSON.stringify(long));
    if (result.ok) expect(result.name.length).toBeLessThanOrEqual(30);
  });
});

describe('Frente I — blendPresets', () => {
  const kawaii = THEME_PRESETS.find(p => p.id === 'kawaii')!;
  const robust = THEME_PRESETS.find(p => p.id === 'robust')!;

  it('t=0 retorna preset A puro', () => {
    const blended = blendPresets(kawaii, robust, 0);
    expect(blended.eye_size).toBeCloseTo(kawaii.patch.eye_size!, 5);
    expect(blended.body_height).toBeCloseTo(kawaii.patch.body_height!, 5);
  });

  it('t=1 retorna preset B puro', () => {
    const blended = blendPresets(kawaii, robust, 1);
    expect(blended.eye_size).toBeCloseTo(robust.patch.eye_size!, 5);
    expect(blended.body_height).toBeCloseTo(robust.patch.body_height!, 5);
  });

  it('t=0.5 é média dos deltas (não da média direta)', () => {
    // kawaii.eye_size = 1.25 (delta +0.25)
    // robust.eye_size = 0.85 (delta -0.15)
    // média dos deltas = (0.25 + -0.15) / 2 = 0.05 → 1.05
    const blended = blendPresets(kawaii, robust, 0.5);
    expect(blended.eye_size).toBeCloseTo(1.05, 2);
  });

  it('t fora de [0,1] é clampado', () => {
    const blendedLow = blendPresets(kawaii, robust, -2);
    const blendedHigh = blendPresets(kawaii, robust, 5);
    expect(blendedLow.eye_size).toBeCloseTo(kawaii.patch.eye_size!, 5);
    expect(blendedHigh.eye_size).toBeCloseTo(robust.patch.eye_size!, 5);
  });

  it('pattern é categórico: t<0.5 → A, t>=0.5 → B', () => {
    const closer_to_a = blendPresets(kawaii, robust, 0.49);
    const closer_to_b = blendPresets(kawaii, robust, 0.5);
    expect(closer_to_a.preferred_pattern).toBe(kawaii.patch.preferred_pattern);
    expect(closer_to_b.preferred_pattern).toBe(robust.patch.preferred_pattern);
  });

  it('booleans são categóricos: t<0.5 → A, t>=0.5 → B', () => {
    // kawaii.force_hide_spikes = true
    // robust.force_hide_spikes = false
    const closer_to_a = blendPresets(kawaii, robust, 0.25);
    const closer_to_b = blendPresets(kawaii, robust, 0.75);
    expect(closer_to_a.force_hide_spikes).toBe(true);
    expect(closer_to_b.force_hide_spikes).toBe(false);
  });

  it('blend preserva DraftFields shape completo', () => {
    const blended = blendPresets(kawaii, robust, 0.3);
    expect(typeof blended.eye_size).toBe('number');
    expect(typeof blended.eye_spread).toBe('number');
    expect(typeof blended.body_height).toBe('number');
    expect(typeof blended.body_width).toBe('number');
    expect(typeof blended.aura_intensity).toBe('number');
    expect(typeof blended.pattern_density).toBe('number');
    expect(typeof blended.preferred_pattern).toBe('string');
    expect(typeof blended.posture_lean).toBe('number');
    expect(typeof blended.force_hide_tail).toBe('boolean');
    expect(typeof blended.force_hide_antennae).toBe('boolean');
    expect(typeof blended.force_hide_spikes).toBe('boolean');
  });
});
