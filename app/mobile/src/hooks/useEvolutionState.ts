/**
 * Hook — carrega EvolutionState a partir do mascote + checkins persistidos.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildEvolutionState } from '@/game/evolution/EvolutionEngine';
import { loadEvolutionState } from '@/game/evolution/EvolutionPersistence';
import { phenotypeToMascotVisuals, type MascotEvolutionVisuals } from '@/game/evolution/PhenotypeRenderer';
import type { EvolutionState, PersonalizationInput } from '@/game/evolution/EvolutionTypes';
import { checkins as checkinsDb } from '@/lib/db';
import { storedToPartial, loadStoredPersonalization } from '@/lib/personalization-service';
import { useStore } from '@/store';

export interface UseEvolutionStateResult {
  state: EvolutionState | null;
  visuals: MascotEvolutionVisuals | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Re-export para uso em features (`@/hooks/useEvolutionState`). */
export type EvolutionVisuals = MascotEvolutionVisuals;

export function useEvolutionState(
  personalization?: Partial<PersonalizationInput>,
): UseEvolutionStateResult {
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const [state, setState] = useState<EvolutionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const personalizationKey = useMemo(
    () => (personalization ? JSON.stringify(personalization) : ''),
    [personalization],
  );

  const stablePersonalization = useMemo(
    () => (personalizationKey ? (JSON.parse(personalizationKey) as Partial<PersonalizationInput>) : undefined),
    [personalizationKey],
  );

  // IDs primitivos no deps — refs de objeto do Zustand mudam toda render
  // (set() reemite mesmo se conteúdo é igual), e isso recriava `refresh`
  // a cada hidratação parcial do store, alimentando loop "Maximum update
  // depth exceeded" detectado via Playwright em 2026-05-27.
  const profileId = profile?.id;
  const mascotId = mascot?.id;
  const mascotXp = mascot?.xp;
  const mascotPhase = mascot?.phase;
  const mascotMood = mascot?.mood;
  const streakDays = streak?.current_streak;

  const refresh = useCallback(async () => {
    // Captura snapshot atual fora do closure pra evitar stale data depois
    // do early-return.
    const currentProfile = useStore.getState().profile;
    const currentMascot = useStore.getState().mascot;
    const currentStreak = useStore.getState().streak;
    if (!currentProfile || !currentMascot) {
      // setState idempotente: só dispara se mudou. Evita loop quando hydrate
      // reemite null repetidamente.
      setState(prev => (prev === null ? prev : null));
      setError(prev => (prev === null ? prev : null));
      setLoading(prev => (prev === false ? prev : false));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const stored = await loadStoredPersonalization(currentProfile.id);
      const merged = { ...storedToPartial(stored), ...stablePersonalization };
      const allCheckins = await checkinsDb.listAll(currentProfile.id);
      const persistedEvolution = await loadEvolutionState(currentProfile.id);
      const built = buildEvolutionState({
        mascot: currentMascot,
        checkins: allCheckins,
        streak: currentStreak,
        // Passa array completo (com unlockedAt original) em vez de só IDs —
        // assim buildEvolutionState preserva o timestamp histórico de cada
        // micro em vez de re-stampar com `now()` toda hidratação.
        persistedMicroEvolutions: persistedEvolution?.microEvolutions ?? [],
        mood: currentMascot.mood,
        personalization: Object.keys(merged).length > 0 ? merged : undefined,
      });
      setState(built);
    } catch (e) {
      setState(null);
      setError(e instanceof Error ? e.message : 'Não foi possível carregar a evolução.');
    } finally {
      setLoading(false);
    }
  }, [profileId, mascotId, mascotXp, mascotPhase, mascotMood, streakDays, stablePersonalization]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visuals = useMemo(
    () => (state ? phenotypeToMascotVisuals(state.phenotype) : null),
    [state],
  );

  return { state, visuals, loading, error, refresh };
}
