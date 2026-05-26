/**
 * Theme presets — catálogo + apply + match.
 *
 * Invariantes:
 *  - Todo preset tem patch que respeita os caps [0.7, 1.3]
 *  - applyPreset substitui (não merge parcial)
 *  - matchPreset acha de volta o preset que acabou de ser aplicado
 *  - ids únicos no catálogo
 */

import { describe, expect, it } from 'vitest';
import { MAX_MULT, MIN_MULT } from '@/lib/dna/customization';
import {
  applyPreset,
  findPreset,
  matchPreset,
  THEME_PRESETS,
} from '@/lib/dna/themePresets';
import type { MascotCustomization } from '@/types';

type DraftFields = Omit<MascotCustomization, 'user_id' | 'updated_at'>;

const baseDraft: DraftFields = {
  eye_size: 1,
  eye_spread: 1,
  body_height: 1,
  body_width: 1,
  aura_intensity: 1,
  pattern_density: 1,
  preferred_pattern: 'plain',
  posture_lean: 0,
  force_hide_tail: false,
  force_hide_antennae: false,
  force_hide_spikes: false,
};

describe('THEME_PRESETS catalog', () => {
  it('tem pelo menos 4 presets', () => {
    expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(4);
  });

  it('todos têm id, label, emoji, description, patch', () => {
    for (const p of THEME_PRESETS) {
      expect(p.id).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.emoji).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.patch).toBeTruthy();
    }
  });

  it('ids são únicos', () => {
    const ids = THEME_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todos os multiplicadores nos patches respeitam [0.7, 1.3]', () => {
    const fields = [
      'eye_size',
      'eye_spread',
      'body_height',
      'body_width',
      'aura_intensity',
      'pattern_density',
    ] as const;
    for (const p of THEME_PRESETS) {
      for (const f of fields) {
        const v = p.patch[f];
        if (v === undefined) continue;
        expect(v, `${p.id}.${f}`).toBeGreaterThanOrEqual(MIN_MULT);
        expect(v, `${p.id}.${f}`).toBeLessThanOrEqual(MAX_MULT);
      }
    }
  });
});

describe('applyPreset', () => {
  it('aplica patch sobre o draft', () => {
    const preset = THEME_PRESETS[0];
    const result = applyPreset(baseDraft, preset);
    if (preset.patch.eye_size !== undefined) {
      expect(result.eye_size).toBe(preset.patch.eye_size);
    }
  });

  it('não muta o draft original', () => {
    const draft: DraftFields = { ...baseDraft };
    const before = JSON.stringify(draft);
    applyPreset(draft, THEME_PRESETS[0]);
    expect(JSON.stringify(draft)).toBe(before);
  });

  it('preserva campos não-cobertos pelo patch', () => {
    // Constrói preset parcial (só toca eye_size).
    const partialPreset = {
      id: 'test',
      label: 'Test',
      emoji: '🧪',
      description: 'test',
      patch: { eye_size: 1.2 },
    };
    const customDraft = { ...baseDraft, body_height: 1.15, force_hide_tail: true };
    const result = applyPreset(customDraft, partialPreset);
    expect(result.eye_size).toBe(1.2);
    expect(result.body_height).toBe(1.15);
    expect(result.force_hide_tail).toBe(true);
  });
});

describe('findPreset', () => {
  it('acha preset existente por id', () => {
    const first = THEME_PRESETS[0];
    expect(findPreset(first.id)?.id).toBe(first.id);
  });

  it('retorna undefined pra id inexistente', () => {
    expect(findPreset('nope-' + Date.now())).toBeUndefined();
  });
});

describe('matchPreset', () => {
  it('acha o preset após apply (round-trip)', () => {
    for (const p of THEME_PRESETS) {
      const applied = applyPreset(baseDraft, p);
      const found = matchPreset(applied);
      expect(found?.id, `round-trip ${p.id}`).toBe(p.id);
    }
  });

  it('retorna undefined pra draft sem match', () => {
    const oddDraft: DraftFields = {
      ...baseDraft,
      eye_size: 0.83,
      body_width: 1.27,
      preferred_pattern: 'cells',
    };
    expect(matchPreset(oddDraft)).toBeUndefined();
  });

  it('tolerância 0.005 no match (não exato)', () => {
    const p = THEME_PRESETS[0];
    const applied = applyPreset(baseDraft, p);
    if (applied.eye_size !== undefined) {
      // Perturbação dentro da tolerância
      const perturbed = { ...applied, eye_size: applied.eye_size + 0.003 };
      expect(matchPreset(perturbed)?.id).toBe(p.id);
    }
  });
});
