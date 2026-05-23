import { describe, expect, it } from 'vitest';
import {
  ACCESSORY_ID_TO_UNITY,
  ACCESSORY_LEGACY_ALIASES,
  mapMood,
  mapPhase,
  MOOD_TO_UNITY,
  PHASE_TO_UNITY,
  UNITY_GLB_ACCESSORIES,
} from '@/core/mascot-render-contract/mappings';

describe('mascot-render-contract mappings', () => {
  it('fases cobrem ovo → evolved', () => {
    expect(mapPhase('ovo')).toBe('egg');
    expect(mapPhase('evoluido')).toBe('evolved');
    expect(Object.keys(PHASE_TO_UNITY)).toHaveLength(6);
  });

  it('moods cobrem os 5 estados', () => {
    expect(mapMood('empolgado')).toBe('excited');
    expect(mapMood('exausto')).toBe('exhausted');
    expect(Object.keys(MOOD_TO_UNITY)).toHaveLength(5);
  });

  it('cap mapeia para cap_classic', () => {
    expect(ACCESSORY_ID_TO_UNITY.cap).toBe('cap_classic');
  });

  it('tabela unificada cobre 18 GLBs', () => {
    expect(Object.keys(UNITY_GLB_ACCESSORIES)).toHaveLength(18);
  });

  it('aliases legados resolvem para GLB real', () => {
    expect(ACCESSORY_LEGACY_ALIASES.scarf_green).toBe('scarf_cozy');
    expect(ACCESSORY_LEGACY_ALIASES.bow_classic).toBe('bow_tie');
  });
});
