import { describe, expect, it } from 'vitest';
import { validateUnityMascotState } from '@/core/mascot-render-contract/validate';
import { buildUnityMascotState } from '@/core/mascot-render-contract/buildUnityMascotState';
import { mascotFixture } from './fixtures';

describe('validateUnityMascotState', () => {
  it('aceita estado golden', () => {
    const state = buildUnityMascotState(mascotFixture('calmo'));
    expect(validateUnityMascotState(state).ok).toBe(true);
  });

  it('rejeita schemaVersion incorreto', () => {
    const state = buildUnityMascotState(mascotFixture('calmo'));
    const bad = { ...state, schemaVersion: 2 as 1 };
    const result = validateUnityMascotState(bad);
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.path === 'schemaVersion')).toBe(true);
  });

  it('rejeita gene fora de [0, 1]', () => {
    const state = buildUnityMascotState(mascotFixture('calmo'));
    const bad = {
      ...state,
      dna: { ...state.dna, chaos: 1.5 },
    };
    const result = validateUnityMascotState(bad);
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.path === 'dna.chaos')).toBe(true);
  });
});
