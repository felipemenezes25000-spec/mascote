/**
 * Descoberta de espécie (feedback de evolução). Quando o genoma — movido por
 * conversa (chatToGene) e hábitos (habitToGene) — cruza pra um ARQUÉTIPO novo,
 * celebramos UMA vez por espécie. Vira uma coleção crescente, nunca vira nag
 * (oscilar entre dois arquétipos próximos não re-dispara).
 *
 * Layering: detecção/persistência aqui; o STORE monta+enfileira o toast (mantém
 * este módulo livre de dependência de UI). A persistência é local (AsyncStorage),
 * sem rede.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ARCHETYPES } from './archetypes';
import { archetypeFromGenome } from './species';
import type { CreatureArchetype } from './types';
import type { Genome } from '@/lib/dna/genome';

const KEY = 'mascote:discovered_species';

/** Espécies já descobertas (ids de arquétipo). */
export async function getDiscoveredSpecies(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Registra uma descoberta. Retorna true se foi a PRIMEIRA vez dessa espécie. */
export async function recordSpeciesDiscovery(archetype: string): Promise<boolean> {
  try {
    const cur = await getDiscoveredSpecies();
    if (cur.includes(archetype)) return false;
    await AsyncStorage.setItem(KEY, JSON.stringify([...cur, archetype]));
    return true;
  } catch {
    return false;
  }
}

/**
 * Compara arquétipo antes/depois de um drift de genoma. Se mudou E é uma espécie
 * inédita, registra e retorna o novo arquétipo (pro caller celebrar). Senão null.
 */
export async function detectSpeciesDiscovery(
  prev: Genome,
  next: Genome,
): Promise<CreatureArchetype | null> {
  const prevArch = archetypeFromGenome(prev);
  const nextArch = archetypeFromGenome(next);
  if (nextArch === prevArch) return null;
  const isNew = await recordSpeciesDiscovery(nextArch);
  return isNew ? nextArch : null;
}

export type SpeciesStatus = 'current' | 'discovered' | 'undiscovered';

/**
 * Status de uma espécie pra coleção do cosmos: a forma ATUAL, uma já DESCOBERTA
 * (a criatura já foi essa), ou ainda NÃO descoberta. `current` tem precedência.
 */
export function speciesStatus(
  archetype: string,
  current: string,
  discovered: ReadonlySet<string> | readonly string[],
): SpeciesStatus {
  if (archetype === current) return 'current';
  const has = Array.isArray(discovered)
    ? discovered.includes(archetype)
    : (discovered as ReadonlySet<string>).has(archetype);
  return has ? 'discovered' : 'undiscovered';
}

/** Toast (compatível com UnlockToastData) celebrando uma nova espécie. */
export function speciesDiscoveryToast(archetype: CreatureArchetype): {
  kind: 'info';
  emoji: string;
  title: string;
  subtitle: string;
} {
  const label = ARCHETYPES[archetype]?.label ?? 'algo novo';
  return {
    kind: 'info',
    emoji: '🧬',
    title: `Nova forma: ${label}`,
    subtitle: 'Suas escolhas guiaram a criatura pra cá.',
  };
}
