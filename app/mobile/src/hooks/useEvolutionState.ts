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

  const refresh = useCallback(async () => {
    if (!profile || !mascot) {
      setState(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const stored = await loadStoredPersonalization(profile.id);
      const merged = { ...storedToPartial(stored), ...stablePersonalization };
      const allCheckins = await checkinsDb.listAll(profile.id);
      const persistedEvolution = await loadEvolutionState(profile.id);
      const built = buildEvolutionState({
        mascot,
        checkins: allCheckins,
        streak,
        unlockedMicroIds: persistedEvolution?.microEvolutions.map(m => m.id) ?? [],
        mood: mascot.mood,
        personalization: Object.keys(merged).length > 0 ? merged : undefined,
      });
      setState(built);
    } catch (e) {
      setState(null);
      setError(e instanceof Error ? e.message : 'Não foi possível carregar a evolução.');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, mascot, streak, stablePersonalization]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visuals = useMemo(
    () => (state ? phenotypeToMascotVisuals(state.phenotype) : null),
    [state],
  );

  return { state, visuals, loading, error, refresh };
}
