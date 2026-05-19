/**
 * Persistência formal de PersonalizationInput — vínculo, tom, estilo, metas.
 */

import type { PersonalizationInput } from '@/game/evolution/EvolutionTypes';

export type MascotPronoun = 'ele' | 'ela' | 'elu';

export interface StoredPersonalization extends PersonalizationInput {
  pronoun: MascotPronoun;
  initialSceneId?: string;
  updatedAt: string;
}

export interface PersonalizationRepository {
  get(userId: string): Promise<StoredPersonalization | null>;
  save(userId: string, data: StoredPersonalization): Promise<void>;
}
