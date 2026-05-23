import type { Mascot, Personality } from '@/types';
import { genomeForPersonality } from '@/lib/dna/personalities';

const BASE: Omit<Mascot, 'personality' | 'dna'> = {
  id: 'mascot-test',
  user_id: 'user-test',
  name: 'Teste',
  phase: 'adulto',
  mood: 'feliz',
  xp: 120,
  level: 5,
  energy: 80,
  health: 90,
  dna_seed: 42,
  last_seen_at: '2026-05-23T12:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
};

export function mascotFixture(personality: Personality, overrides: Partial<Mascot> = {}): Mascot {
  return {
    ...BASE,
    personality,
    dna: genomeForPersonality(personality),
    ...overrides,
  };
}

export const PERSONALITIES: Personality[] = ['calmo', 'motivador', 'fofo', 'sabio'];

export const PHASES = [
  'ovo',
  'bebe',
  'crianca',
  'adolescente',
  'adulto',
  'evoluido',
] as const;

export const MOODS = ['triste', 'ok', 'feliz', 'empolgado', 'exausto'] as const;
