/**
 * Descoberta de espécie — celebra UMA vez por espécie quando o genoma (movido por
 * conversa/hábitos) cruza pra um arquétipo novo. Vira coleção, nunca vira nag.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  detectSpeciesDiscovery,
  getDiscoveredSpecies,
  recordSpeciesDiscovery,
  speciesDiscoveryToast,
} from '@/game/creatures';
import { archetypeFromGenome } from '@/game/creatures';
import { GENE_KEYS, type Genome } from '@/lib/dna/genome';

const KEY = 'mascote:discovered_species';

function genome(over: Partial<Genome>): Genome {
  const base = Object.fromEntries(GENE_KEYS.map(k => [k, 0.5])) as Genome;
  return { ...base, ...over };
}

const gSlime = genome({}); // achatado → slime
const gDiff = genome({ intelligence: 0.95, curiosity: 0.9, creativity: 0.88, discipline: 0.92, chaos: 0.12, aggression: 0.1, socialEnergy: 0.15 });

beforeEach(async () => {
  await AsyncStorage.removeItem(KEY);
});

describe('recordSpeciesDiscovery', () => {
  it('primeira vez → true; repetida → false; persiste na coleção', async () => {
    expect(await recordSpeciesDiscovery('feline')).toBe(true);
    expect(await recordSpeciesDiscovery('feline')).toBe(false);
    expect(await recordSpeciesDiscovery('avian')).toBe(true);
    expect((await getDiscoveredSpecies()).sort()).toEqual(['avian', 'feline']);
  });
});

describe('detectSpeciesDiscovery', () => {
  it('sanidade: os dois genomas têm arquétipos diferentes', () => {
    expect(archetypeFromGenome(gSlime)).not.toBe(archetypeFromGenome(gDiff));
  });

  it('transição pra espécie nova → retorna o arquétipo novo (1x)', async () => {
    const newArch = archetypeFromGenome(gDiff);
    expect(await detectSpeciesDiscovery(gSlime, gDiff)).toBe(newArch);
    // já descoberta → null na segunda
    expect(await detectSpeciesDiscovery(gSlime, gDiff)).toBeNull();
  });

  it('sem mudança de arquétipo → null', async () => {
    expect(await detectSpeciesDiscovery(gDiff, gDiff)).toBeNull();
  });
});

describe('speciesDiscoveryToast', () => {
  it('monta toast info com o label PT-BR da espécie', () => {
    const t = speciesDiscoveryToast('feline');
    expect(t.kind).toBe('info');
    expect(t.emoji.length).toBeGreaterThan(0);
    expect(t.title).toMatch(/Felino/);
    expect(t.subtitle && t.subtitle.length).toBeGreaterThan(0);
  });
});
