/**
 * Migrations de schema.
 *
 * Histórico:
 *  v1 — base inicial; renomeia legado 'quarto' → 'room' em scenes.
 *  v2 — adiciona `dna` e `dna_seed` em mascots.
 *  v3 — adiciona tabelas `dna_mutations` e `customization` (vazias inicialmente).
 *
 * Bumps requerem (a) incrementar CURRENT_SCHEMA_VERSION, (b) adicionar entry no
 * SCHEMA_MIGRATIONS na posição (current → next).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  META_KEY,
  readAny,
  writeAny,
} from './internal';

export const CURRENT_SCHEMA_VERSION = 3;

export interface DbMeta {
  schema: number;
  migrated_at?: string;
}

type Migration = (
  read: typeof readAny,
  writeFn: typeof writeAny,
) => Promise<void>;

const SCHEMA_MIGRATIONS: readonly Migration[] = [
  // 0 → 1: normaliza scenes.id legado 'quarto' → 'room'.
  async (readT, writeT) => {
    const scenes = await readT('scenes');
    let touched = false;
    const next = scenes.map(s => {
      const cur = s as { scene_id?: string };
      if (cur.scene_id === 'quarto') {
        touched = true;
        return { ...s, scene_id: 'room' };
      }
      return s;
    });
    if (touched) await writeT('scenes', next);
  },
  // 1 → 2: adiciona DNA a cada mascot existente.
  async (readT, writeT) => {
    const mascotsRows = await readT('mascots');
    if (mascotsRows.length === 0) return;
    const { genomeForPersonality } = await import('@/lib/dna/personalities');
    const { genomeFromPreset, sanitizeGenome } = await import('@/lib/dna/genome');
    const next = mascotsRows.map(row => {
      const r = row as Record<string, unknown> & {
        dna?: unknown;
        personality?: string;
        user_id?: string;
      };
      if (r.dna && typeof r.dna === 'object') {
        return { ...r, dna: sanitizeGenome(r.dna) };
      }
      const personality = (r.personality === 'calmo' || r.personality === 'motivador'
                       || r.personality === 'fofo'  || r.personality === 'sabio')
                       ? r.personality
                       : 'calmo';
      const preset = genomeForPersonality(personality);
      const uid = typeof r.user_id === 'string' ? r.user_id : '';
      let seed = 0x811c9dc5;
      for (let i = 0; i < uid.length; i++) {
        seed ^= uid.charCodeAt(i);
        seed = Math.imul(seed, 0x01000193);
      }
      seed = seed >>> 0;
      const dna = genomeFromPreset(seed, preset, 0.1);
      return { ...r, dna, dna_seed: seed };
    });
    await writeT('mascots', next);
  },
  // 2 → 3: cria tabelas `dna_mutations` e `customization` vazias se não existirem.
  async (readT, writeT) => {
    const muts = await readT('dna_mutations');
    if (muts.length === 0) await writeT('dna_mutations', []);
    const cust = await readT('customization');
    if (cust.length === 0) await writeT('customization', []);
  },
];

export async function readMeta(): Promise<DbMeta> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (!raw) return { schema: 0 };
    const parsed = JSON.parse(raw);
    if (typeof parsed?.schema !== 'number') return { schema: 0 };
    return parsed as DbMeta;
  } catch {
    /* v8 ignore next */
    return { schema: 0 };
  }
}

async function writeMeta(meta: DbMeta): Promise<void> {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
}

export async function runMigrations(): Promise<DbMeta> {
  const meta = await readMeta();
  let current = meta.schema;
  while (current < CURRENT_SCHEMA_VERSION) {
    const m = SCHEMA_MIGRATIONS[current];
    /* v8 ignore next 3 */
    if (!m) {
      throw new Error(`[db] missing migration from v${current} to v${current + 1}`);
    }
    await m(readAny, writeAny);
    current += 1;
  }
  const next: DbMeta = { schema: current, migrated_at: new Date().toISOString() };
  await writeMeta(next);
  return next;
}
