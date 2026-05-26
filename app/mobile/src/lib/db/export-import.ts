/**
 * Export / import / reset — operações de manutenção que tocam todas as tabelas.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEY, META_KEY, withLock, write } from './internal';
import { secureRemove, SECURE_KEYS } from '@/lib/secureStore';

const ALL_TABLES = [
  'profiles',
  'mascots',
  'checkins',
  'missions',
  'streaks',
  'messages',
  'xp_events',
  'accessories',
  'scenes',
  'settings',
  'achievements',
  'notifications',
  'wallet',
  'daily_reward',
  'mystery_box',
  'combo',
  'dna_mutations',
  'customization',
];

const EXPORT_EXTENDED_TABLES = [
  'evolution_snapshots',
  'memory_items',
  'memory_tfidf',
  'subscription_state',
  'personalization_prefs',
  'life_state',
] as const;

const EVOLUTION_EXPORT_KEY = (uid: string) => `mascote:evolution:${uid}`;
const MEMORY_EXPORT_KEY = (uid: string) => `mascote:memory:${uid}`;
const MEMORY_TFIDF_EXPORT_KEY = (uid: string) => `mascote:memory_tfidf:${uid}`;
const SUB_EXPORT_KEY = (uid: string) => `mascote:subscription:${uid}`;
const PERSONALIZATION_EXPORT_KEY = (uid: string) => `mascote:personalization:${uid}`;
const LIFE_STATE_EXPORT_KEY = (uid: string) => `mascote:life_state:${uid}`;

export async function resetAll(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const mascoteKeys = allKeys.filter(k => k.startsWith('mascote:'));
  const externalKeys = allKeys.filter(
    k => k.startsWith('paywall_shown:') || k.startsWith('birthday_shown:'),
  );
  // No web, secureStore usa prefixo `secure:` em AsyncStorage — sem isso
  // a chave OpenAI persistia depois de "Resetar tudo".
  const secureKeys = allKeys.filter(k => k.startsWith('secure:'));
  const toRemove = [...new Set([...mascoteKeys, ...externalKeys, ...secureKeys])];
  await Promise.all(toRemove.map(k => AsyncStorage.removeItem(k)));
  // No mobile, expo-secure-store vive fora do AsyncStorage (Keychain/Keystore).
  // Precisa de remoção explícita para cada SECURE_KEY conhecida.
  await Promise.all(
    Object.values(SECURE_KEYS).map(k => secureRemove(k)),
  );
}

async function readRaw(table: string): Promise<unknown[]> {
  const raw = await AsyncStorage.getItem(KEY(table));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// any[] (não unknown[]): historical contract — telas/testes consomem campos
// específicos (`exp.profiles[0].id`, `exp.mascots[0].user_id`) sem cast manual.
// Trocar pra unknown[] forçaria casts em ~6 callsites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exportAll(user_id: string): Promise<Record<string, any[]>> {
  const out: Record<string, unknown[]> = {};
  for (const t of ALL_TABLES) {
    const all = await readRaw(t);
    out[t] = (all as Array<Record<string, unknown>>).filter(r =>
      t === 'profiles' ? r.id === user_id : r.user_id === user_id
    );
  }

  const evolutionRaw = await AsyncStorage.getItem(EVOLUTION_EXPORT_KEY(user_id));
  if (evolutionRaw) {
    try {
      out.evolution_snapshots = [JSON.parse(evolutionRaw)];
    } catch { /* skip corrupt */ }
  } else {
    out.evolution_snapshots = [];
  }

  const memoryRaw = await AsyncStorage.getItem(MEMORY_EXPORT_KEY(user_id));
  if (memoryRaw) {
    try {
      const parsed = JSON.parse(memoryRaw);
      out.memory_items = Array.isArray(parsed) ? parsed : [];
    } catch {
      out.memory_items = [];
    }
  } else {
    out.memory_items = [];
  }

  const tfidfRaw = await AsyncStorage.getItem(MEMORY_TFIDF_EXPORT_KEY(user_id));
  if (tfidfRaw) {
    try {
      out.memory_tfidf = [JSON.parse(tfidfRaw)];
    } catch {
      out.memory_tfidf = [];
    }
  } else {
    out.memory_tfidf = [];
  }

  const subRaw = await AsyncStorage.getItem(SUB_EXPORT_KEY(user_id));
  if (subRaw) {
    try {
      out.subscription_state = [JSON.parse(subRaw)];
    } catch {
      out.subscription_state = [];
    }
  } else {
    out.subscription_state = [];
  }

  const persRaw = await AsyncStorage.getItem(PERSONALIZATION_EXPORT_KEY(user_id));
  if (persRaw) {
    try {
      out.personalization_prefs = [JSON.parse(persRaw)];
    } catch {
      out.personalization_prefs = [];
    }
  } else {
    out.personalization_prefs = [];
  }

  const lifeStateRaw = await AsyncStorage.getItem(LIFE_STATE_EXPORT_KEY(user_id));
  if (lifeStateRaw) {
    try {
      out.life_state = [JSON.parse(lifeStateRaw)];
    } catch {
      out.life_state = [];
    }
  } else {
    out.life_state = [];
  }

  return out;
}

export interface ImportResult {
  imported: string[];
  skipped: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function importAll(data: Record<string, any[]>): Promise<ImportResult> {
  const imported: string[] = [];
  const skipped: string[] = [];
  const allKeys = [...ALL_TABLES, ...EXPORT_EXTENDED_TABLES];

  for (const t of allKeys) {
    const value = data[t];
    if (!Array.isArray(value)) {
      if (value !== undefined) skipped.push(t);
      continue;
    }
    const valid = value.every(r => r && typeof r === 'object');
    if (!valid) {
      skipped.push(t);
      continue;
    }

    if ((EXPORT_EXTENDED_TABLES as readonly string[]).includes(t)) {
      const row = value[0];
      if (!row) continue;
      const uid =
        typeof (row as { user_id?: string }).user_id === 'string'
          ? (row as { user_id: string }).user_id
          : typeof (data.profiles as { id?: string }[] | undefined)?.[0]?.id === 'string'
            ? (data.profiles as { id: string }[])[0].id
            : null;
      if (!uid) {
        skipped.push(t);
        continue;
      }
      if (t === 'evolution_snapshots') {
        await AsyncStorage.setItem(EVOLUTION_EXPORT_KEY(uid), JSON.stringify(row));
      } else if (t === 'memory_items') {
        await AsyncStorage.setItem(MEMORY_EXPORT_KEY(uid), JSON.stringify(value));
      } else if (t === 'memory_tfidf') {
        await AsyncStorage.setItem(MEMORY_TFIDF_EXPORT_KEY(uid), JSON.stringify(row));
      } else if (t === 'subscription_state') {
        await AsyncStorage.setItem(SUB_EXPORT_KEY(uid), JSON.stringify(row));
      } else if (t === 'personalization_prefs') {
        await AsyncStorage.setItem(PERSONALIZATION_EXPORT_KEY(uid), JSON.stringify(row));
      } else if (t === 'life_state') {
        await AsyncStorage.setItem(LIFE_STATE_EXPORT_KEY(uid), JSON.stringify(row));
        await withLock('mascot_life', async () => {
          const all = await readRaw('mascot_life');
          const filtered = (all as Array<Record<string, unknown>>).filter(
            r => r.user_id !== uid,
          );
          await write('mascot_life', [...filtered, row]);
        });
      }
      imported.push(t);
      continue;
    }

    await withLock(t, () => write(t, value));
    imported.push(t);
  }
  return { imported, skipped };
}
