/**
 * Export / import / reset — operações de manutenção que tocam todas as tabelas.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEY, META_KEY, withLock, write } from './internal';
import { secureRemove, SECURE_KEYS } from '@/lib/secureStore';
import { sanitizeSvg } from '@/lib/procedural/sanitizeSvg';

/**
 * Sanitiza recursivamente qualquer `customSvg` (string) num row importado.
 * O sanitizeSvg canônico só roda na GERAÇÃO do genome (schema.ts); um backup
 * malicioso podia trazer `procedural_genome.accessories[].customSvg` hostil e
 * o import gravava cru → renderizado depois via SvgXml sem checagem (bypass
 * total — auditoria 2026-06-11). SVG inválido é REMOVIDO (não derruba o import).
 */
function scrubCustomSvgDeep(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) scrubCustomSvgDeep(item);
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'customSvg' && typeof v === 'string') {
        try {
          obj[k] = sanitizeSvg(v, 'import.customSvg');
        } catch {
          delete obj[k];
        }
      } else {
        scrubCustomSvgDeep(v);
      }
    }
  }
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
  // atelier_looks foi adicionada depois do design original de export-import;
  // sem ela, reset+import perdia todos os looks salvos pelo usuário.
  'atelier_looks',
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
    // Neutraliza SVG hostil em qualquer profundidade ANTES de persistir — o
    // sanitizador canônico só roda na geração, então o import era o bypass.
    for (const row of value) scrubCustomSvgDeep(row);

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
        // Guard contra tier-escalation via import. O caminho de UI (settings.tsx)
        // chama importAll DIRETO — nunca passa pelo guard de downgrade em
        // sync-local.importSnapshot — e SUB_EXPORT_KEY é exatamente a chave que
        // localSubscriptionRepo.getTier lê. Sem este guard, um backup editado à
        // mão com {subscription_state:[{tier:'plus_annual'}]} + profile.id casando
        // era gravado verbatim → premium (mundos 9-10, chat ilimitado, cenas)
        // desbloqueado de graça, sem passar pela RevenueCat. Política (idêntica à
        // de importSnapshot): import só MANTÉM ou DESCE tier; upgrades reais vêm
        // via restorePurchases. Aplicar aqui, no ponto de persistência, protege
        // ambos os caminhos (importAll direto e importSnapshot, que chama importAll).
        const tierRank: Record<string, number> = { free: 0, plus_monthly: 1, plus_annual: 2 };
        const incomingTier = (row as { tier?: unknown }).tier;
        const incomingRank = typeof incomingTier === 'string' ? (tierRank[incomingTier] ?? 0) : 0;
        let currentRank = 0;
        try {
          const currentRaw = await AsyncStorage.getItem(SUB_EXPORT_KEY(uid));
          const currentTier = currentRaw ? (JSON.parse(currentRaw)?.tier as unknown) : undefined;
          currentRank = typeof currentTier === 'string' ? (tierRank[currentTier] ?? 0) : 0;
        } catch {
          // Storage corrompido/ausente → trata como 'free' (rank 0): qualquer
          // upgrade fica bloqueado, fail-safe pro lado seguro.
        }
        if (incomingRank <= currentRank) {
          await AsyncStorage.setItem(SUB_EXPORT_KEY(uid), JSON.stringify(row));
        } else {
          skipped.push(t);
          continue;
        }
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

    // Validação por-tabela: confirma que cada row tem owner_id consistente.
    // Sem isso, um payload malformado/malicioso podia sobrescrever a tabela
    // inteira com `[{}]` (silent reset) ou trazer linhas de outro user_id.
    // Em dispositivos compartilhados (futuro multi-perfil), também previne
    // que um import limpe dados de outro usuário não-incluído no payload.
    const expectedUid =
      typeof (data.profiles as { id?: string }[] | undefined)?.[0]?.id === 'string'
        ? (data.profiles as { id: string }[])[0].id
        : null;
    const idField = t === 'profiles' ? 'id' : 'user_id';
    const allHaveOwner = value.every(r => {
      const owner = (r as Record<string, unknown>)[idField];
      if (typeof owner !== 'string' || owner.length === 0) return false;
      if (expectedUid && owner !== expectedUid) return false;
      return true;
    });
    if (!allHaveOwner) {
      skipped.push(t);
      continue;
    }

    await withLock(t, async () => {
      // Merge em vez de overwrite: preserva rows de outros user_ids (multi-perfil).
      // Se o caller pretende reset total, deve chamar resetAll() antes.
      if (expectedUid && t !== 'profiles') {
        const existing = await readRaw(t);
        const others = (existing as Array<Record<string, unknown>>).filter(
          r => (r as Record<string, unknown>)[idField] !== expectedUid,
        );
        await write(t, [...others, ...value]);
      } else {
        await write(t, value);
      }
    });
    imported.push(t);
  }
  return { imported, skipped };
}
