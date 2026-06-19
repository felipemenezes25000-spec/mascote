/**
 * Descoberta de espécie (feedback de evolução). Quando o genoma — movido por
 * conversa (chatToGene) e hábitos (habitToGene) — cruza pra um ARQUÉTIPO novo,
 * celebramos UMA vez por espécie. Vira uma coleção crescente, nunca vira nag
 * (oscilar entre dois arquétipos próximos não re-dispara).
 *
 * Layering: detecção/persistência aqui; o STORE monta+enfileira o toast (mantém
 * este módulo livre de dependência de UI). A persistência é local (AsyncStorage),
 * sem rede.
 *
 * POR-USUÁRIO: a chave inclui o userId — descobertas não vazam entre perfis, e
 * como o store chama detectSpeciesDiscovery DENTRO do lock `mascot_logic:${uid}`,
 * o read-modify-write da chave do usuário fica serializado (sem race/lost-update).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ARCHETYPES } from './archetypes';
import { archetypeFromGenome } from './species';
import type { CreatureArchetype } from './types';
import type { Genome } from '@/lib/dna/genome';

const keyFor = (userId: string) => `mascote:discovered_species:${userId}`;

/** Espécies já descobertas por este usuário (ids de arquétipo). */
export async function getDiscoveredSpecies(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Registra uma descoberta. Retorna true se foi a PRIMEIRA vez dessa espécie. */
export async function recordSpeciesDiscovery(userId: string, archetype: string): Promise<boolean> {
  try {
    const cur = await getDiscoveredSpecies(userId);
    if (cur.includes(archetype)) return false;
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify([...cur, archetype]));
    return true;
  } catch {
    return false;
  }
}

/**
 * Compara arquétipo antes/depois de um drift de genoma. Se mudou E é uma espécie
 * inédita pra este usuário, registra e retorna o novo arquétipo (pro caller
 * celebrar). Senão null. Chamar DENTRO do lock mascot_logic:${userId}.
 */
export async function detectSpeciesDiscovery(
  userId: string,
  prev: Genome,
  next: Genome,
): Promise<CreatureArchetype | null> {
  const prevArch = archetypeFromGenome(prev);
  const nextArch = archetypeFromGenome(next);
  if (nextArch === prevArch) return null;
  const isNew = await recordSpeciesDiscovery(userId, nextArch);
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
