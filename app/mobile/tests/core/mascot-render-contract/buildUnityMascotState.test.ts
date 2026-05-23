import { describe, expect, it } from 'vitest';
import { buildUnityMascotState } from '@/core/mascot-render-contract/buildUnityMascotState';
import { validateUnityMascotState } from '@/core/mascot-render-contract/validate';
import { mapMood, mapPhase, PERSONALITY_TO_BASE_MODEL } from '@/core/mascot-render-contract/mappings';
import { MOODS, PERSONALITIES, PHASES, mascotFixture } from './fixtures';

describe('buildUnityMascotState', () => {
  it('gera estado válido para as 4 personalidades (golden)', () => {
    for (const p of PERSONALITIES) {
      const state = buildUnityMascotState(mascotFixture(p));
      const v = validateUnityMascotState(state);
      expect(v.ok, v.issues.map(i => i.path).join(', ')).toBe(true);
      expect(state.schemaVersion).toBe(1);
      expect(state.identity.baseModel).toBe(PERSONALITY_TO_BASE_MODEL[p]);
      expect(Object.keys(state.dna)).toHaveLength(11);
    }
  });

  it('mapeia fases PT → Unity', () => {
    for (const phase of PHASES) {
      const state = buildUnityMascotState(mascotFixture('calmo', { phase }));
      expect(state.progression.phase).toBe(mapPhase(phase));
    }
  });

  it('mapeia moods PT → Unity', () => {
    for (const mood of MOODS) {
      const state = buildUnityMascotState(mascotFixture('fofo', { mood }));
      expect(state.state.mood).toBe(mapMood(mood));
    }
  });

  it('mapeia cap → cap_classic nos acessórios', () => {
    const state = buildUnityMascotState(mascotFixture('sabio'), {
      equippedAccessoryIds: ['cap'],
      unlockedAccessoryIds: ['cap'],
    });
    expect(state.accessories.some(a => a.id === 'cap_classic')).toBe(true);
  });

  it('aceita GLB keys longos (wings_angel) e deriva slot back', () => {
    const state = buildUnityMascotState(mascotFixture('motivador'), {
      equippedAccessoryIds: ['wings_angel'],
      unlockedAccessoryIds: ['wings_angel'],
    });
    const wing = state.accessories.find(a => a.id === 'wings_angel');
    expect(wing).toBeDefined();
    expect(wing?.slot).toBe('back');
  });

  it('aura_cosmic resolve para slot aura', () => {
    const state = buildUnityMascotState(mascotFixture('calmo'), {
      equippedAccessoryIds: ['aura_cosmic'],
      unlockedAccessoryIds: ['aura_cosmic'],
    });
    const aura = state.accessories.find(a => a.id === 'aura_cosmic');
    expect(aura).toBeDefined();
    expect(aura?.slot).toBe('aura');
  });

  it('GLB curto cap aponta para cap_classic.glb (não cap.glb)', () => {
    // Garante que o renderer não tentará carregar GLB inexistente
    const state = buildUnityMascotState(mascotFixture('fofo'), {
      equippedAccessoryIds: ['cap'],
      unlockedAccessoryIds: ['cap'],
    });
    expect(state.accessories[0]?.assetKey).toBe('cap_classic');
  });

  it('inclui pendingEvent de check-in recente', () => {
    const state = buildUnityMascotState(mascotFixture('motivador'), {
      recentCheckins: [
        {
          id: 'c1',
          user_id: 'u',
          habit_kind: 'water',
          value: 1,
          unit: 'glass',
          occurred_on: '2026-05-23',
          occurred_at: '2026-05-23T08:00:00Z',
          xp_awarded: 10,
          idempotency_key: 'k',
          created_at: '2026-05-23T08:00:00Z',
        },
      ],
    });
    expect(state.pendingEvent?.kind).toBe('habit');
    if (state.pendingEvent?.kind === 'habit') {
      expect(state.pendingEvent.habit).toBe('water');
    }
  });
});
