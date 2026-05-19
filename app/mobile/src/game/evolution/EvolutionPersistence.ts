/**
 * Persistência local do estado de evolução (AsyncStorage).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EvolutionState, MicroEvolution } from './EvolutionTypes';

const KEY = (userId: string) => `mascote:evolution:${userId}`;

export interface PersistedEvolution {
  microEvolutions: MicroEvolution[];
  microEvolutionLevel: number;
  version: number;
}

const CURRENT_VERSION = 1;

export async function loadEvolutionState(userId: string): Promise<PersistedEvolution | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedEvolution;
    if (parsed.version !== CURRENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveEvolutionState(
  userId: string,
  partial: Pick<PersistedEvolution, 'microEvolutions' | 'microEvolutionLevel'>,
): Promise<void> {
  const payload: PersistedEvolution = {
    ...partial,
    version: CURRENT_VERSION,
  };
  await AsyncStorage.setItem(KEY(userId), JSON.stringify(payload));
}

export function evolutionStateToPersisted(state: EvolutionState): PersistedEvolution {
  return {
    microEvolutions: state.microEvolutions,
    microEvolutionLevel: state.phenotype.microEvolutionLevel,
    version: CURRENT_VERSION,
  };
}
