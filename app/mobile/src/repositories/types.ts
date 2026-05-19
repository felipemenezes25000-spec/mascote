/**
 * Interfaces de repositório — implementações locais via AsyncStorage/db.
 */

import type { Profile, Mascot, Mission, Achievement, Settings } from '@/types';
import type { PersistedEvolution } from '@/game/evolution/EvolutionPersistence';

export interface UserProfileRepository {
  get(): Promise<Profile | null>;
  save(profile: Profile): Promise<void>;
}

export interface MascotRepository {
  forUser(userId: string): Promise<Mascot | null>;
  save(mascot: Mascot): Promise<void>;
}

export interface EvolutionRepository {
  load(userId: string): Promise<PersistedEvolution | null>;
  save(userId: string, data: PersistedEvolution): Promise<void>;
}

export interface MissionRepository {
  listForUser(userId: string): Promise<Mission[]>;
  save(mission: Mission): Promise<void>;
}

export interface SubscriptionRepository {
  getTier(userId: string): Promise<'free' | 'plus_monthly' | 'plus_annual'>;
  setTier(userId: string, tier: 'free' | 'plus_monthly' | 'plus_annual'): Promise<void>;
}

export interface AchievementRepository {
  listForUser(userId: string): Promise<Achievement[]>;
  unlock(userId: string, achievementId: string): Promise<void>;
}

export interface SubscriptionState {
  tier: 'free' | 'plus_monthly' | 'plus_annual';
  trialEndsAt: string | null;
  isActive: boolean;
}

export type { StoredPersonalization, PersonalizationRepository } from './personalization';
