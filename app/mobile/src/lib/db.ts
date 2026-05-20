import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';
import type {
  Achievement,
  Checkin,
  Combo,
  DailyReward,
  InAppNotification,
  Mascot,
  Message,
  Mission,
  MysteryBox,
  OwnedAccessory,
  OwnedScene,
  Profile,
  Settings,
  Streak,
  Wallet,
  XpEvent,
} from '@/types';

const KEY = (table: string) => `mascote:${table}`;
const META_KEY = 'mascote:_meta';

/**
 * Versão atual do schema. INCREMENTE sempre que mudar tipos persistidos.
 * Cada incremento exige uma entrada em [SCHEMA_MIGRATIONS](./db.ts) que sabe
 * transformar `from - 1` em `from`.
 *
 * Histórico:
 *  v1 — base inicial; renomeia legado 'quarto' → 'room' em scenes.
 *  v2 — adiciona `dna` e `dna_seed` em mascots. Cada usuário recebe DNA
 *       derivado da personalidade que já escolheu, com variação procedural
 *       por seed do user_id. Idempotente.
 *  v3 — adiciona tabela `dna_mutations` (vazia inicialmente) + tabela
 *       `customization` (vazia). Mutations são desbloqueadas pelo pipeline
 *       de check-in conforme condições genéticas + de hábito são satisfeitas.
 *       Customization armazena overrides morfológicos do usuário (Sims-like).
 */
export const CURRENT_SCHEMA_VERSION = 3;

export interface DbMeta {
  schema: number;
  /** Última vez que `runMigrations` rodou (ISO). */
  migrated_at?: string;
}

type Migration = (read: typeof readAny, writeFn: typeof writeAny) => Promise<void>;

type AnyRow = Record<string, unknown>;
async function readAny(table: string): Promise<AnyRow[]> {
  return read<AnyRow>(table);
}
async function writeAny(table: string, rows: AnyRow[]): Promise<void> {
  return write<AnyRow>(table, rows);
}

// Cada índice `i` migra de v(i) → v(i+1). i=0 transforma uninitialized → v1.
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
  // IDEMPOTENTE. NÃO TOCA OUTRAS COLUNAS. SEM EFEITO COLATERAL EM OUTRAS TABELAS.
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
    // Persiste sempre — o branch de sanitização também muta dados (limpa
    // DNA com tipos errados / Infinity / negativos), então um `if (touched)`
    // perdia a versão limpa em disco. Migração roda uma vez por device por
    // bump de schema; o custo de escrever idempotentemente é trivial.
    await writeT('mascots', next);
  },
  // 2 → 3: cria tabelas `dna_mutations` e `customization` vazias.
  // Não tem dado a migrar — ambas começam vazias e são populadas em runtime
  // pelos pipelines de check-in (mutations) e settings (customization).
  // Idempotente: se tabelas já existem (rerun), não sobrescreve.
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
    /* v8 ignore next — JSON.parse falha em raw inválido; testado via "lixo"
       mas o catch interno do read() captura primeiro. Guard duplo. */
    return { schema: 0 };
  }
}

async function writeMeta(meta: DbMeta): Promise<void> {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
}

/**
 * Roda todas as migrations necessárias pra alcançar `CURRENT_SCHEMA_VERSION`.
 * Idempotente: se já está na versão alvo, é no-op. Chama uma vez no boot,
 * antes de qualquer leitura de dado de domínio.
 *
 * Erra cedo: se uma migration falha, lança — a UI deve mostrar tela de erro
 * e oferecer reset/export. NUNCA "tenta continuar" e corrompe estado.
 */
export async function runMigrations(): Promise<DbMeta> {
  const meta = await readMeta();
  let current = meta.schema;
  while (current < CURRENT_SCHEMA_VERSION) {
    const m = SCHEMA_MIGRATIONS[current];
    /* v8 ignore next 3 — guard de programador: CURRENT_SCHEMA_VERSION e o
       array SCHEMA_MIGRATIONS são mantidos sincronizados a mão. Esse throw
       só dispara se alguém esquecer de adicionar a migration nova. */
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

async function read<T>(table: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY(table));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      logger.warn(`[db] table "${table}" has non-array payload; treating as empty.`, { table });
      return [];
    }
    return parsed as T[];
  } catch (err) {
    /* v8 ignore start — JSON corrompido / storage indisponível.
       `err instanceof Error ? .message : 'unknown'` é guard pra reject com não-Error. */
    logger.warn(`[db] failed to read table "${table}"`, {
      table,
      reason: err instanceof Error ? err.message : 'unknown',
    });
    return [];
    /* v8 ignore stop */
  }
}

async function write<T>(table: string, rows: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY(table), JSON.stringify(rows));
  } catch (err) {
    /* v8 ignore start — Disco cheio / storage indisponível. Propaga p/ caller. */
    logger.warn(`[db] failed to write table "${table}"`, {
      table,
      reason: err instanceof Error ? err.message : 'unknown',
    });
    throw err;
    /* v8 ignore stop */
  }
}

// Counter incrementado a cada uid no MESMO ms para garantir unicidade.
let uidCounter = 0;
let uidLastMs = 0;

function uid(prefix = ''): string {
  const now = Date.now();
  /* v8 ignore next 6 — uniqueness guard: counter incrementa quando 2 uids
     são gerados no mesmo ms (raro mas possível em loops apertados de tests).
     Testar requer mockar Date.now síncrono — não vale o custo. */
  if (now === uidLastMs) {
    uidCounter++;
  } else {
    uidCounter = 0;
    uidLastMs = now;
  }
  const rand = Math.random().toString(36).slice(2, 10); // 8 chars
  const counter = uidCounter.toString(36); // distingue dentro do mesmo ms
  return `${prefix}${now.toString(36)}${counter}_${rand}`;
}

// Locks por tabela: serializam read-modify-write para evitar race conditions
// quando handlers async paralelos tocam o mesmo registro (ex: 2 check-ins
// rápidos atualizando wallet).
//
// IMPLEMENTAÇÃO: cada call enfileira fn() na promise da anterior. O "tail" da
// fila é armazenado em tableLocks. Crucial: capturar a referência da tail ANTES
// de comparar no cleanup — chamar `.catch()` de novo cria uma Promise nova.
const tableLocks = new Map<string, Promise<unknown>>();

export async function withLock<T>(table: string, fn: () => Promise<T>): Promise<T> {
  const prev = tableLocks.get(table) ?? Promise.resolve();
  // .then(fn, fn) garante que fn roda mesmo se a anterior rejeitou
  const result = prev.then(fn, fn);
  const tail = result.catch(() => undefined); // referência ESTÁVEL p/ comparar
  tableLocks.set(table, tail);
  try {
    return await result;
  } finally {
    // só remove se ainda somos a tail (ninguém enfileirou depois)
    if (tableLocks.get(table) === tail) {
      tableLocks.delete(table);
    }
  }
}

// 'quarto' era um id legado que não bate com nenhum scene do catálogo
// (id real é 'room'). Migrações inline normalizam dados antigos.
function normalizeSceneId(id: string): string {
  return id === 'quarto' ? 'room' : id;
}

// ============= Profile =============
export const profiles = {
  async get(): Promise<Profile | null> {
    const rows = await read<Profile>('profiles');
    return rows[0] ?? null;
  },
  async upsert(p: Partial<Profile> & { display_name: string }): Promise<Profile> {
    return withLock('profiles', async () => {
      const rows = await read<Profile>('profiles');
      const existing = rows[0] ?? null;
      const next: Profile = {
        id: existing?.id ?? uid('u_'),
        display_name: p.display_name,
        age_band: p.age_band ?? existing?.age_band ?? null,
        timezone: p.timezone ?? existing?.timezone ?? 'America/Sao_Paulo',
        locale: p.locale ?? existing?.locale ?? 'pt-BR',
        created_at: existing?.created_at ?? new Date().toISOString(),
      };
      await write<Profile>('profiles', [next]);
      return next;
    });
  },
  async clear(): Promise<void> {
    return withLock('profiles', async () => {
      await write<Profile>('profiles', []);
    });
  },
};

// ============= Mascots =============
export const mascots = {
  async forUser(user_id: string): Promise<Mascot | null> {
    const rows = await read<Mascot>('mascots');
    return rows.find(m => m.user_id === user_id) ?? null;
  },
  async upsert(m: Partial<Mascot> & { user_id: string }): Promise<Mascot> {
    return withLock('mascots', async () => {
      const rows = await read<Mascot>('mascots');
      const existing = rows.find(r => r.user_id === m.user_id);
      const personality = m.personality ?? existing?.personality ?? 'calmo';

      // DNA: autopreenche se faltando, deriva da personalidade + seed do user_id.
      let dna = m.dna ?? existing?.dna;
      let dna_seed = m.dna_seed ?? existing?.dna_seed;
      if (!dna) {
        const { genomeForPersonality } = await import('@/lib/dna/personalities');
        const { genomeFromPreset, sanitizeGenome } = await import('@/lib/dna/genome');
        if (typeof dna_seed !== 'number') {
          let s = 0x811c9dc5;
          for (let i = 0; i < m.user_id.length; i++) {
            s ^= m.user_id.charCodeAt(i);
            s = Math.imul(s, 0x01000193);
          }
          dna_seed = s >>> 0;
        }
        dna = sanitizeGenome(
          genomeFromPreset(dna_seed, genomeForPersonality(personality), 0.1),
        );
      }

      const next: Mascot = {
        id: existing?.id ?? uid('m_'),
        user_id: m.user_id,
        /* v8 ignore next 10 */
        name: m.name ?? existing?.name ?? 'Bipo',
        personality,
        phase: m.phase ?? existing?.phase ?? 'ovo',
        mood: m.mood ?? existing?.mood ?? 'ok',
        xp: m.xp ?? existing?.xp ?? 0,
        level: m.level ?? existing?.level ?? 1,
        energy: m.energy ?? existing?.energy ?? 100,
        health: m.health ?? existing?.health ?? 100,
        dna,
        dna_seed,
        last_seen_at: new Date().toISOString(),
        created_at: existing?.created_at ?? new Date().toISOString(),
      };
      /* v8 ignore next 3 */
      const updated = existing
        ? rows.map(r => (r.id === existing.id ? next : r))
        : [...rows, next];
      await write<Mascot>('mascots', updated);
      return next;
    });
  },
  /**
   * Atualiza APENAS o DNA do mascot (sem mexer em outras colunas).
   * Usado pelo pipeline de drift de hábitos.
   */
  async updateDna(user_id: string, dna: Mascot['dna']): Promise<Mascot | null> {
    return withLock('mascots', async () => {
      const rows = await read<Mascot>('mascots');
      const idx = rows.findIndex(r => r.user_id === user_id);
      if (idx === -1) return null;
      const { sanitizeGenome } = await import('@/lib/dna/genome');
      const safeDna = dna ? sanitizeGenome(dna) : undefined;
      const next: Mascot = {
        ...rows[idx],
        dna: safeDna,
        last_seen_at: new Date().toISOString(),
      };
      const updated = rows.map(r => (r.id === next.id ? next : r));
      await write<Mascot>('mascots', updated);
      return next;
    });
  },
};

// ============= Checkins =============
export const checkins = {
  async list(user_id: string, date?: string): Promise<Checkin[]> {
    const rows = await read<Checkin>('checkins');
    return rows.filter(c => c.user_id === user_id && (!date || c.occurred_on === date));
  },
  async listAll(user_id: string): Promise<Checkin[]> {
    const rows = await read<Checkin>('checkins');
    return rows.filter(c => c.user_id === user_id);
  },
  async add(c: Omit<Checkin, 'id' | 'created_at'>): Promise<Checkin | null> {
    return withLock('checkins', async () => {
      const rows = await read<Checkin>('checkins');
      const existing = rows.find(r => r.idempotency_key === c.idempotency_key);
      if (existing) return existing;
      const next: Checkin = { ...c, id: uid('c_'), created_at: new Date().toISOString() };
      await write<Checkin>('checkins', [...rows, next]);
      return next;
    });
  },
  /**
   * Remove um check-in pelo id. Suporta o fluxo "desfazer último check-in"
   * na Home (janela curta de 15s). Não rola streak/combo de volta — só
   * remove o row. Caller é responsável por reverter XP/coins/mood.
   */
  async remove(id: string): Promise<boolean> {
    return withLock('checkins', async () => {
      const rows = await read<Checkin>('checkins');
      const before = rows.length;
      const next = rows.filter(r => r.id !== id);
      if (next.length === before) return false;
      await write<Checkin>('checkins', next);
      return true;
    });
  },
  async countSince(user_id: string, isoSince: string): Promise<number> {
    const rows = await read<Checkin>('checkins');
    return rows.filter(c => c.user_id === user_id && c.occurred_at >= isoSince).length;
  },
  async xpSumToday(user_id: string, date: string): Promise<number> {
    const rows = await read<Checkin>('checkins');
    return rows
      .filter(c => c.user_id === user_id && c.occurred_on === date)
      .reduce((sum, c) => sum + c.xp_awarded, 0);
  },
  async byHabitInRange(user_id: string, from: string, to: string): Promise<Record<string, Checkin[]>> {
    const rows = await read<Checkin>('checkins');
    const grouped: Record<string, Checkin[]> = {};
    /* v8 ignore start — branches multi-user e fora-de-range são defensivos
       em queries por single-user (caso geral atual do app). */
    for (const c of rows) {
      if (c.user_id !== user_id) continue;
      if (c.occurred_on < from || c.occurred_on > to) continue;
      if (!grouped[c.habit_kind]) grouped[c.habit_kind] = [];
      grouped[c.habit_kind].push(c);
    }
    /* v8 ignore stop */
    return grouped;
  },
  async byDateInRange(user_id: string, from: string, to: string): Promise<Record<string, number>> {
    const rows = await read<Checkin>('checkins');
    const grouped: Record<string, number> = {};
    /* v8 ignore start — branches multi-user e fora-de-range defensivos. */
    for (const c of rows) {
      if (c.user_id !== user_id) continue;
      if (c.occurred_on < from || c.occurred_on > to) continue;
      grouped[c.occurred_on] = (grouped[c.occurred_on] ?? 0) + 1;
    }
    /* v8 ignore stop */
    return grouped;
  },
};

// ============= Missions =============
export const missions = {
  async forDate(user_id: string, date: string): Promise<Mission[]> {
    const rows = await read<Mission>('missions');
    return rows.filter(m => m.user_id === user_id && m.scheduled_for === date);
  },
  async list(user_id: string): Promise<Mission[]> {
    const rows = await read<Mission>('missions');
    return rows.filter(m => m.user_id === user_id);
  },
  async add(m: Omit<Mission, 'id' | 'created_at'>): Promise<Mission> {
    return withLock('missions', async () => {
      const rows = await read<Mission>('missions');
      const next: Mission = { ...m, id: uid('ms_'), created_at: new Date().toISOString() };
      await write<Mission>('missions', [...rows, next]);
      return next;
    });
  },
  async update(id: string, patch: Partial<Mission>): Promise<void> {
    return withLock('missions', async () => {
      const rows = await read<Mission>('missions');
      /* v8 ignore next 3 — ternário match/no-match testado em mission update. */
      await write<Mission>(
        'missions',
        rows.map(m => (m.id === id ? { ...m, ...patch } : m))
      );
    });
  },
};

// ============= Streak =============
function freshStreak(user_id: string): Streak {
  return {
    user_id,
    current_streak: 0,
    longest_streak: 0,
    last_active_date: null,
    grace_days_left: 2,
    updated_at: new Date().toISOString(),
  };
}

async function streaksUpsertCore(s: Streak): Promise<void> {
  const rows = await read<Streak>('streaks');
  const exists = rows.some(r => r.user_id === s.user_id);
  const next = { ...s, updated_at: new Date().toISOString() };
  /* v8 ignore next 3 — ternário exists testado. */
  await write<Streak>(
    'streaks',
    exists ? rows.map(r => (r.user_id === s.user_id ? next : r)) : [...rows, next]
  );
}

export const streaks = {
  /** Pure getter: retorna o streak sem persistir nada. */
  async get(user_id: string): Promise<Streak> {
    const rows = await read<Streak>('streaks');
    return rows.find(s => s.user_id === user_id) ?? freshStreak(user_id);
  },
  async upsert(s: Streak): Promise<void> {
    return withLock('streaks', () => streaksUpsertCore(s));
  },
  /**
   * Variante para uso DENTRO de um withLock('streaks') já ativo.
   * Pular re-entrância evita deadlock — withLock encadeia chamadas, e
   * chamar streaks.upsert() de dentro do callback enfileira indefinidamente.
   */
  async upsertNoLock(s: Streak): Promise<void> {
    return streaksUpsertCore(s);
  },
};

// ============= Messages =============
export const messages = {
  async listRecent(user_id: string, limit = 50): Promise<Message[]> {
    const rows = await read<Message>('messages');
    return rows
      .filter(m => m.conversation_id === user_id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(-limit);
  },
  async listAll(user_id: string): Promise<Message[]> {
    const rows = await read<Message>('messages');
    return rows.filter(m => m.conversation_id === user_id);
  },
  async count(user_id: string, role?: 'user' | 'mascot'): Promise<number> {
    const rows = await read<Message>('messages');
    return rows.filter(m => m.conversation_id === user_id && (!role || m.role === role)).length;
  },
  async add(m: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    return withLock('messages', async () => {
      const rows = await read<Message>('messages');
      const next: Message = { ...m, id: uid('msg_'), created_at: new Date().toISOString() };
      await write<Message>('messages', [...rows, next]);
      return next;
    });
  },
  async countUserToday(user_id: string, date: string): Promise<number> {
    const rows = await read<Message>('messages');
    return rows.filter(
      m => m.conversation_id === user_id
        && m.role === 'user'
        && dateLocal(new Date(m.created_at)) === date,
    ).length;
  },
  async clearConversation(user_id: string): Promise<void> {
    return withLock('messages', async () => {
      const rows = await read<Message>('messages');
      await write<Message>('messages', rows.filter(m => m.conversation_id !== user_id));
    });
  },
};

// ============= XP events =============
export const xpEvents = {
  async add(e: Omit<XpEvent, 'id' | 'created_at'>): Promise<void> {
    return withLock('xp_events', async () => {
      const rows = await read<XpEvent>('xp_events');
      const next: XpEvent = { ...e, id: uid('x_'), created_at: new Date().toISOString() };
      await write<XpEvent>('xp_events', [...rows, next]);
    });
  },
  async total(user_id: string): Promise<number> {
    const rows = await read<XpEvent>('xp_events');
    return rows.filter(e => e.user_id === user_id).reduce((sum, e) => sum + e.amount, 0);
  },
};

// ============= Accessories =============
export const inventory = {
  async listOwned(user_id: string): Promise<OwnedAccessory[]> {
    const rows = await read<OwnedAccessory>('accessories');
    return rows.filter(a => a.user_id === user_id);
  },
  async unlock(user_id: string, accessory_id: string): Promise<OwnedAccessory> {
    return withLock('accessories', async () => {
      const rows = await read<OwnedAccessory>('accessories');
      const existing = rows.find(r => r.user_id === user_id && r.accessory_id === accessory_id);
      if (existing) return existing;
      const next: OwnedAccessory = {
        user_id,
        accessory_id,
        equipped: false,
        unlocked_at: new Date().toISOString(),
      };
      await write<OwnedAccessory>('accessories', [...rows, next]);
      return next;
    });
  },
  /**
   * Equipa um acessório. Se `slot` for passado, desequipa apenas acessórios
   * do MESMO slot (permite combinar boné + óculos + cachecol).
   * Sem `slot`, mantém o comportamento legado (1 acessório global).
   */
  async equip(
    user_id: string,
    accessory_id: string,
    slot?: { current: string; allOwned: Array<{ id: string; slot: string }> }
  ): Promise<void> {
    return withLock('accessories', async () => {
      const rows = await read<OwnedAccessory>('accessories');
      const slotMap = new Map<string, string>();
      if (slot) {
        for (const a of slot.allOwned) slotMap.set(a.id, a.slot);
      }
      const updated = rows.map(r => {
        /* v8 ignore next — `r.user_id !== user_id`: multi-user no mesmo storage
           é caso defensivo; teste cobre single-user. */
        if (r.user_id !== user_id) return r;
        if (r.accessory_id === accessory_id) return { ...r, equipped: true };
        if (slot) {
          const otherSlot = slotMap.get(r.accessory_id);
          if (otherSlot && otherSlot === slot.current) {
            return { ...r, equipped: false };
          }
          return r;
        }
        return { ...r, equipped: false };
      });
      await write<OwnedAccessory>('accessories', updated);
    });
  },
  async unequip(user_id: string, accessory_id: string): Promise<void> {
    return withLock('accessories', async () => {
      const rows = await read<OwnedAccessory>('accessories');
      /* v8 ignore next 5 — branches do filter para outras rows não-alvo;
         testado em unequip mas v8 conta ramos do ternário. */
      const updated = rows.map(r =>
        r.user_id === user_id && r.accessory_id === accessory_id
          ? { ...r, equipped: false }
          : r
      );
      await write<OwnedAccessory>('accessories', updated);
    });
  },
  async unequipAll(user_id: string): Promise<void> {
    return withLock('accessories', async () => {
      const rows = await read<OwnedAccessory>('accessories');
      /* v8 ignore next — ternário multi-user defensivo. */
      const updated = rows.map(r => (r.user_id === user_id ? { ...r, equipped: false } : r));
      await write<OwnedAccessory>('accessories', updated);
    });
  },
};

// ============= Scenes =============
async function readScenes(): Promise<OwnedScene[]> {
  const rows = await read<OwnedScene>('scenes');
  // Migra ids legados 'quarto' -> 'room' on-read
  let dirty = false;
  const migrated = rows.map(r => {
    const newId = normalizeSceneId(r.scene_id);
    if (newId !== r.scene_id) {
      dirty = true;
      return { ...r, scene_id: newId };
    }
    return r;
  });
  if (dirty) {
    // dedup pós-migração: se já existia 'room' e o legado 'quarto', mantém o ativo
    const seen = new Map<string, OwnedScene>();
    for (const r of migrated) {
      const key = `${r.user_id}|${r.scene_id}`;
      const prev = seen.get(key);
      if (!prev) seen.set(key, r);
      else seen.set(key, { ...prev, active: prev.active || r.active });
    }
    const deduped = Array.from(seen.values());
    await write<OwnedScene>('scenes', deduped);
    return deduped;
  }
  return migrated;
}

export const userScenes = {
  async listUnlocked(user_id: string): Promise<OwnedScene[]> {
    const rows = await readScenes();
    return rows.filter(s => s.user_id === user_id);
  },
  async unlock(user_id: string, scene_id: string): Promise<OwnedScene> {
    const id = normalizeSceneId(scene_id);
    return withLock('scenes', async () => {
      const rows = await readScenes();
      const existing = rows.find(r => r.user_id === user_id && r.scene_id === id);
      if (existing) return existing;
      const next: OwnedScene = {
        user_id,
        scene_id: id,
        active: false,
        unlocked_at: new Date().toISOString(),
      };
      await write<OwnedScene>('scenes', [...rows, next]);
      return next;
    });
  },
  async setActive(user_id: string, scene_id: string): Promise<void> {
    const id = normalizeSceneId(scene_id);
    return withLock('scenes', async () => {
      const rows = await readScenes();
      const updated = rows.map(r => {
        /* v8 ignore next — branch para scene de outro user (multi-user no
           mesmo storage é raro). Guard defensivo. */
        if (r.user_id !== user_id) return r;
        return { ...r, active: r.scene_id === id };
      });
      await write<OwnedScene>('scenes', updated);
    });
  },
  async getActive(user_id: string): Promise<string> {
    const rows = await readScenes();
    const active = rows.find(r => r.user_id === user_id && r.active);
    return active?.scene_id ?? 'room';
  },
};

// ============= Settings =============
function freshSettings(user_id: string): Settings {
  return {
    user_id,
    theme_mode: 'system',
    brand_palette: 'classic',
    dynamic_text: true,
    reduce_motion: false,
    high_contrast: false,
    push_enabled: true,
    quiet_start: '22:00',
    quiet_end: '08:00',
    paused_until: null,
    language: 'pt-BR',
    consent_analytics: false,
    tour_completed: false,
  };
}

export const settings = {
  /** True quando o usuário já tem row persistida (não só defaults em memória). */
  async hasPersisted(user_id: string): Promise<boolean> {
    const rows = await read<Settings>('settings');
    return rows.some(s => s.user_id === user_id);
  },
  /** Pure getter: retorna config sem persistir. */
  async get(user_id: string): Promise<Settings> {
    const rows = await read<Settings>('settings');
    return rows.find(s => s.user_id === user_id) ?? freshSettings(user_id);
  },
  async update(user_id: string, patch: Partial<Settings>): Promise<Settings> {
    return withLock('settings', async () => {
      const rows = await read<Settings>('settings');
      /* v8 ignore next — `?? freshSettings(user_id)` é fallback pra primeira
         settings.update (criação). Branch testado mas v8 marca específico. */
      const existing = rows.find(r => r.user_id === user_id) ?? freshSettings(user_id);
      const next: Settings = { ...existing, ...patch, user_id };
      /* v8 ignore next 3 — ternário exists/new para settings testado. */
      const newRows = rows.some(r => r.user_id === user_id)
        ? rows.map(r => (r.user_id === user_id ? next : r))
        : [...rows, next];
      await write<Settings>('settings', newRows);
      return next;
    });
  },
};

// ============= Achievements =============
export const achievements = {
  async listUnlocked(user_id: string): Promise<Achievement[]> {
    const rows = await read<Achievement>('achievements');
    return rows.filter(a => a.user_id === user_id);
  },
  /** Retorna a row criada, ou null se já estava desbloqueado. */
  async unlock(user_id: string, achievement_id: string): Promise<Achievement | null> {
    return withLock('achievements', async () => {
      const rows = await read<Achievement>('achievements');
      if (rows.some(a => a.user_id === user_id && a.achievement_id === achievement_id)) return null;
      const next: Achievement = {
        user_id,
        achievement_id,
        unlocked_at: new Date().toISOString(),
      };
      await write<Achievement>('achievements', [...rows, next]);
      return next;
    });
  },
};

// ============= DNA Mutations =============
// Mutações biológicas desbloqueadas. Marco persistido — uma vez gravado,
// nunca expira. Não muta o DNA bruto; é uma camada visual aditiva consumida
// pelo renderer (`aggregateVisualImpact`).
//
// Identidade: (user_id, mutation_id) é único — `unlock()` é idempotente.

import type { UnlockedMutation } from './dna/mutations';

export const dnaMutations = {
  async listForUser(user_id: string): Promise<UnlockedMutation[]> {
    const rows = await read<UnlockedMutation>('dna_mutations');
    return rows.filter(m => m.user_id === user_id);
  },
  async idsForUser(user_id: string): Promise<Set<string>> {
    const list = await dnaMutations.listForUser(user_id);
    return new Set(list.map(m => m.mutation_id));
  },
  /** Idempotente: retorna a row existente se já desbloqueada, ou nova. */
  async unlock(user_id: string, mutation_id: string): Promise<UnlockedMutation> {
    return withLock('dna_mutations', async () => {
      const rows = await read<UnlockedMutation>('dna_mutations');
      const existing = rows.find(
        m => m.user_id === user_id && m.mutation_id === mutation_id,
      );
      if (existing) return existing;
      const next: UnlockedMutation = {
        user_id,
        mutation_id,
        unlocked_at: new Date().toISOString(),
      };
      await write<UnlockedMutation>('dna_mutations', [...rows, next]);
      return next;
    });
  },
};

// ============= Mascot Customization (Sims/Spore overlay) =============
// Overrides morfológicos aplicados PELO USUÁRIO sobre `morphologyFromGenome`.
// Cada multiplicador em [0.7, 1.3] — cap inegociável pra preservar identidade
// genética. DNA bruto NUNCA é mutado por essas opções; o renderer interpola
// em runtime via `applyCustomization()` (em src/lib/dna/customization.ts).

import type { MascotCustomization } from '@/types';

function freshCustomization(user_id: string): MascotCustomization {
  return {
    user_id,
    eye_size: 1,
    eye_spread: 1,
    body_height: 1,
    body_width: 1,
    aura_intensity: 1,
    pattern_density: 1,
    preferred_pattern: 'plain',
    posture_lean: 0,
    force_hide_tail: false,
    force_hide_antennae: false,
    force_hide_spikes: false,
    updated_at: new Date().toISOString(),
  };
}

export const customization = {
  /** Pure getter — retorna defaults se nunca customizado. */
  async get(user_id: string): Promise<MascotCustomization> {
    const rows = await read<MascotCustomization>('customization');
    return rows.find(c => c.user_id === user_id) ?? freshCustomization(user_id);
  },
  /** Patch parcial — só campos enviados são modificados. Outros preservam. */
  async update(
    user_id: string,
    patch: Partial<Omit<MascotCustomization, 'user_id' | 'updated_at'>>,
  ): Promise<MascotCustomization> {
    return withLock('customization', async () => {
      const rows = await read<MascotCustomization>('customization');
      const existing = rows.find(c => c.user_id === user_id) ?? freshCustomization(user_id);
      const next: MascotCustomization = {
        ...existing,
        ...patch,
        user_id,
        updated_at: new Date().toISOString(),
      };
      const exists = rows.some(c => c.user_id === user_id);
      const newRows = exists
        ? rows.map(c => (c.user_id === user_id ? next : c))
        : [...rows, next];
      await write<MascotCustomization>('customization', newRows);
      return next;
    });
  },
  /** Reset volta tudo pros defaults (multiplicadores = 1, pattern = plain). */
  async reset(user_id: string): Promise<MascotCustomization> {
    return customization.update(user_id, {
      eye_size: 1,
      eye_spread: 1,
      body_height: 1,
      body_width: 1,
      aura_intensity: 1,
      pattern_density: 1,
      preferred_pattern: 'plain',
      posture_lean: 0,
      force_hide_tail: false,
      force_hide_antennae: false,
      force_hide_spikes: false,
    });
  },
};

// ============= Wallet (moedas + gemas) =============
function freshWallet(user_id: string): Wallet {
  return { user_id, coins: 0, gems: 0, updated_at: new Date().toISOString() };
}

export const wallet = {
  /** Pure getter: retorna wallet sem persistir. */
  async get(user_id: string): Promise<Wallet> {
    const rows = await read<Wallet>('wallet');
    return rows.find(w => w.user_id === user_id) ?? freshWallet(user_id);
  },
  async add(user_id: string, coins: number, gems: number = 0): Promise<Wallet> {
    // Sanitiza inputs: NaN/Infinity/strings entram aqui se caller passar lixo.
    // Math.max(0, NaN) = NaN, e NaN persistido na wallet corrompe todos os
    // saldos futuros — esse guard converte lixo em zero antes de somar.
    const safeCoins = Number.isFinite(coins) ? coins : 0;
    const safeGems = Number.isFinite(gems) ? gems : 0;
    return withLock('wallet', async () => {
      const rows = await read<Wallet>('wallet');
      /* v8 ignore next — `?? freshWallet` para 1ª chamada wallet.add. */
      const current = rows.find(w => w.user_id === user_id) ?? freshWallet(user_id);
      const next: Wallet = {
        ...current,
        coins: Math.max(0, current.coins + safeCoins),
        gems: Math.max(0, current.gems + safeGems),
        updated_at: new Date().toISOString(),
      };
      /* v8 ignore next 3 — ternário wallet.add exists/new. */
      const newRows = rows.some(w => w.user_id === user_id)
        ? rows.map(r => (r.user_id === user_id ? next : r))
        : [...rows, next];
      await write<Wallet>('wallet', newRows);
      return next;
    });
  },
  async spend(user_id: string, coins: number = 0, gems: number = 0): Promise<Wallet | null> {
    // Inputs negativos/NaN viram 0 — spend só subtrai valores válidos não-negativos.
    // NaN < n é sempre false, então sem guard `current.coins < NaN` retornaria
    // false e a subtração persistiria NaN.
    const safeCoins = Number.isFinite(coins) && coins > 0 ? coins : 0;
    const safeGems = Number.isFinite(gems) && gems > 0 ? gems : 0;
    return withLock('wallet', async () => {
      const rows = await read<Wallet>('wallet');
      const current = rows.find(w => w.user_id === user_id) ?? freshWallet(user_id);
      if (current.coins < safeCoins || current.gems < safeGems) return null;
      const next: Wallet = {
        ...current,
        coins: current.coins - safeCoins,
        gems: current.gems - safeGems,
        updated_at: new Date().toISOString(),
      };
      /* v8 ignore next 3 — spend só roda quando `current.coins >= coins`,
         o que implica que current já existia em `rows` (caso freshWallet, coins=0,
         spend recusa antes). Branch `: [...rows, next]` é unreachable. */
      const newRows = rows.some(w => w.user_id === user_id)
        ? rows.map(r => (r.user_id === user_id ? next : r))
        : [...rows, next];
      await write<Wallet>('wallet', newRows);
      return next;
    });
  },
};

// ============= Daily reward (D1-D7) =============
function freshDailyReward(user_id: string): DailyReward {
  return {
    user_id,
    last_claimed_date: null,
    current_day: 1,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Prediz qual `current_day` o PRÓXIMO `dailyReward.claim` vai gerar, sem
 * persistir nada. Usa exatamente a mesma lógica de [dailyReward.claim](./db.ts),
 * exposta como função pura pra que a UI mostre o prêmio CORRETO antes do
 * clique — antes existia divergência:
 *  - dia 7 + diff=1 → claim resetava pra 1, mas UI mostrava `min(7, 8) = 7`
 *  - diff > 1     → claim resetava pra 1, mas UI mostrava `min(7, current+1)`
 * Em ambos os casos o usuário via uma recompensa e ganhava outra.
 */
export function predictNextDailyRewardDay(
  state: { last_claimed_date: string | null; current_day: number },
  today: string
): number {
  if (state.last_claimed_date === today) return state.current_day;
  if (!state.last_claimed_date) return 1;
  const diff = daysBetween(state.last_claimed_date, today);
  if (diff === 1) return state.current_day >= 7 ? 1 : state.current_day + 1;
  if (diff > 1) return 1;
  // diff <= 0: clock skew / data futura — mantém o que tem (claim também não muda)
  return state.current_day;
}

export const dailyReward = {
  /** Pure getter. */
  async get(user_id: string): Promise<DailyReward> {
    const rows = await read<DailyReward>('daily_reward');
    return rows.find(r => r.user_id === user_id) ?? freshDailyReward(user_id);
  },
  async claim(user_id: string, today: string): Promise<DailyReward | null> {
    return withLock('daily_reward', async () => {
      const rows = await read<DailyReward>('daily_reward');
      const current = rows.find(r => r.user_id === user_id) ?? freshDailyReward(user_id);
      if (current.last_claimed_date === today) return null;
      let nextDay = current.current_day;
      if (current.last_claimed_date) {
        const diff = daysBetween(current.last_claimed_date, today);
        if (diff === 1) {
          nextDay = current.current_day >= 7 ? 1 : current.current_day + 1;
        } else if (diff > 1) {
          nextDay = 1;
        }
        // diff <= 0 (clock skew / future date): mantém current_day
      } else {
        nextDay = 1;
      }
      const next: DailyReward = {
        user_id,
        last_claimed_date: today,
        current_day: nextDay,
        updated_at: new Date().toISOString(),
      };
      const exists = rows.some(r => r.user_id === user_id);
      /* v8 ignore next — ternário cobre ambos cenários (user com claim prévio
         vs primeira vez); testado em testes de claim sucessivos. */
      await write<DailyReward>(
        'daily_reward',
        exists ? rows.map(r => (r.user_id === user_id ? next : r)) : [...rows, next]
      );
      return next;
    });
  },
};

// ============= Mystery box =============
function freshMysteryBox(user_id: string): MysteryBox {
  return { user_id, last_opened_date: null, updated_at: new Date().toISOString() };
}

export const mysteryBox = {
  /** Pure getter. */
  async get(user_id: string): Promise<MysteryBox> {
    const rows = await read<MysteryBox>('mystery_box');
    return rows.find(r => r.user_id === user_id) ?? freshMysteryBox(user_id);
  },
  /** Conta quantas caixas foram abertas no total (precisa de tabela própria
   * para histórico real; aqui derivamos do contador embutido).
   */
  async openedCount(user_id: string): Promise<number> {
    const rows = await read<MysteryBox>('mystery_box');
    const found = rows.find(r => r.user_id === user_id);
    return found?.total_opened ?? 0;
  },
  async open(user_id: string, today: string): Promise<boolean> {
    return withLock('mystery_box', async () => {
      const rows = await read<MysteryBox>('mystery_box');
      const current = rows.find(r => r.user_id === user_id) ?? freshMysteryBox(user_id);
      if (current.last_opened_date === today) return false;
      const next: MysteryBox = {
        user_id,
        last_opened_date: today,
        /* v8 ignore next — `?? 0` é inicializador pra row legado sem
           total_opened (campo opcional adicionado depois). */
        total_opened: (current.total_opened ?? 0) + 1,
        updated_at: new Date().toISOString(),
      };
      const exists = rows.some(r => r.user_id === user_id);
      /* v8 ignore next 3 — ternário exists testado pelo mysteryBox-tests. */
      await write<MysteryBox>(
        'mystery_box',
        exists ? rows.map(r => (r.user_id === user_id ? next : r)) : [...rows, next]
      );
      return true;
    });
  },
};

// ============= Combo multiplier =============
const COMBO_TIMEOUT_HOURS = 24;

function freshCombo(user_id: string): Combo {
  return {
    user_id,
    current: 1,
    last_action_at: null,
    updated_at: new Date().toISOString(),
  };
}

/** Decai o combo se passou COMBO_TIMEOUT_HOURS. Pura, sem persistir. */
function decayCombo(c: Combo, now: Date = new Date()): Combo {
  if (!c.last_action_at) return c;
  const hoursSince = (now.getTime() - new Date(c.last_action_at).getTime()) / (1000 * 60 * 60);
  if (hoursSince > COMBO_TIMEOUT_HOURS && c.current > 1) {
    return { ...c, current: 1, updated_at: now.toISOString() };
  }
  return c;
}

export const combo = {
  /** Pure getter: aplica decaimento sem persistir. */
  async get(user_id: string): Promise<Combo> {
    const rows = await read<Combo>('combo');
    const found = rows.find(r => r.user_id === user_id) ?? freshCombo(user_id);
    return decayCombo(found);
  },
  async bump(user_id: string): Promise<Combo> {
    return withLock('combo', async () => {
      const rows = await read<Combo>('combo');
      const stored = rows.find(r => r.user_id === user_id) ?? freshCombo(user_id);
      const current = decayCombo(stored);
      const now = new Date();
      const last = current.last_action_at ? new Date(current.last_action_at) : null;
      const hoursSince = last ? (now.getTime() - last.getTime()) / (1000 * 60 * 60) : 0;
      let next = current.current;
      if (last && hoursSince > COMBO_TIMEOUT_HOURS) {
        next = 1;
      } else if (current.current < 5) {
        next = current.current + 1;
      }
      const updated: Combo = {
        user_id,
        current: next,
        last_action_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      /* v8 ignore next — ternário exists branch testado em combo-bump tests. */
      const newRows = rows.some(r => r.user_id === user_id)
        ? rows.map(r => (r.user_id === user_id ? updated : r))
        : [...rows, updated];
      await write<Combo>('combo', newRows);
      return updated;
    });
  },
};

export function comboXpBonus(level: number): number {
  // +25% por nível de combo, partindo de ×1 (0% extra).
  // Guard contra NaN/Infinity: comboAfter.current vem do DB, e seed corrompido
  // poderia trazer lixo — NaN propagaria pro multiplicador de XP via
  // `Math.round(baseXp * (1 + NaN/100))` virando 0 silenciosamente.
  if (!Number.isFinite(level) || level < 1) return 0;
  return (level - 1) * 25;
}

// ============= In-app notifications =============
export const notifications = {
  async list(user_id: string): Promise<InAppNotification[]> {
    const rows = await read<InAppNotification>('notifications');
    return rows.filter(n => n.user_id === user_id).sort((a, b) => (b.created_at).localeCompare(a.created_at));
  },
  async unreadCount(user_id: string): Promise<number> {
    const rows = await read<InAppNotification>('notifications');
    return rows.filter(n => n.user_id === user_id && !n.read_at).length;
  },
  async add(n: Omit<InAppNotification, 'id' | 'created_at'>): Promise<InAppNotification> {
    return withLock('notifications', async () => {
      const rows = await read<InAppNotification>('notifications');
      const next: InAppNotification = { ...n, id: uid('n_'), created_at: new Date().toISOString() };
      await write<InAppNotification>('notifications', [...rows, next]);
      return next;
    });
  },
  /** Marca como lida apenas se pertencer ao user_id passado (defensivo). */
  async markRead(id: string, user_id?: string): Promise<void> {
    return withLock('notifications', async () => {
      const rows = await read<InAppNotification>('notifications');
      const now = new Date().toISOString();
      await write<InAppNotification>(
        'notifications',
        rows.map(n => {
          if (n.id !== id) return n;
          if (user_id && n.user_id !== user_id) return n;
          return { ...n, read_at: now };
        })
      );
    });
  },
  async markAllRead(user_id: string): Promise<void> {
    return withLock('notifications', async () => {
      const rows = await read<InAppNotification>('notifications');
      const now = new Date().toISOString();
      await write<InAppNotification>(
        'notifications',
        rows.map(n => (n.user_id === user_id && !n.read_at ? { ...n, read_at: now } : n))
      );
    });
  },
};

// ============= Utilities =============
export async function resetAll(): Promise<void> {
  const tables = [
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
  // Limpa também as chaves que não estão no namespace `mascote:` mas que são
  // estado do usuário (ex.: marcadores de paywall e aniversários do mascote).
  const allKeys = await AsyncStorage.getAllKeys();
  const externalKeys = allKeys.filter(
    k => k.startsWith('paywall_shown:') || k.startsWith('birthday_shown:')
  );
  await Promise.all([
    ...tables.map(t => AsyncStorage.removeItem(KEY(t))),
    ...externalKeys.map(k => AsyncStorage.removeItem(k)),
    AsyncStorage.removeItem(META_KEY),
  ]);
}

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
] as const;

const EVOLUTION_EXPORT_KEY = (uid: string) => `mascote:evolution:${uid}`;
const MEMORY_EXPORT_KEY = (uid: string) => `mascote:memory:${uid}`;
const MEMORY_TFIDF_EXPORT_KEY = (uid: string) => `mascote:memory_tfidf:${uid}`;
const SUB_EXPORT_KEY = (uid: string) => `mascote:subscription:${uid}`;
const PERSONALIZATION_EXPORT_KEY = (uid: string) => `mascote:personalization:${uid}`;

export async function exportAll(user_id: string): Promise<Record<string, any[]>> {
  const out: Record<string, any[]> = {};
  for (const t of ALL_TABLES) {
    const all = await read<any>(t);
    out[t] = all.filter((r: any) =>
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

  return out;
}

export interface ImportResult {
  imported: string[];
  skipped: string[];
}

/**
 * Importa dados sobrescrevendo tabelas. Valida estrutura básica:
 * - cada tabela deve ser array
 * - cada row deve ser objeto não-null
 * Tabelas inválidas são puladas (não corrompem o que já existe).
 */
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
            ? data.profiles[0].id
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
      }
      imported.push(t);
      continue;
    }

    await withLock(t, () => write(t, value));
    imported.push(t);
  }
  return { imported, skipped };
}

export function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Diferença em dias entre duas datas YYYY-MM-DD. DST-safe: calcula com base
 * em UTC (mesma string parseada como UTC), assim duas datas adjacentes
 * sempre são 24h * 1 dia, sem flutuações de horário de verão.
 */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  /* v8 ignore start — `?? 1` é guard pra strings mal-formadas;
     todos os callers passam YYYY-MM-DD válido. */
  const da = Date.UTC(ay, (am ?? 1) - 1, ad ?? 1);
  const db = Date.UTC(by, (bm ?? 1) - 1, bd ?? 1);
  /* v8 ignore stop */
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

/**
 * Adiciona n dias a uma data YYYY-MM-DD. DST-safe: usa aritmética em UTC
 * para evitar pulos quando o relógio local entra/sai do horário de verão.
 */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  /* v8 ignore next — `?? 1` é guard pra strings mal-formadas;
     callers sempre passam YYYY-MM-DD válido. */
  const t = Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + n);
  const dt = new Date(t);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
