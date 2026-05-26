/**
 * Cache de últimas N respostas por (userId, personality) — atravessa AI paths
 * (Proxy, OpenAI direto, fallback) pra evitar Chat Plus repetitivo.
 *
 * Persistido em AsyncStorage: sobrevive a app restart (fallback local
 * tinha apenas Map em memória — perdia variedade após cada cold start).
 *
 * Usado de duas formas:
 * 1. Como hint pro modelo via system prompt ("evite essas frases recentes")
 * 2. Como filtro local pra detectar eco quase-idêntico
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Personality } from '@/types';

const KEY = (userId: string, personality: Personality) =>
  `mascote:ai_recent_replies:${userId}:${personality}`;

const MAX_RECENT = 5;
const MAX_REPLY_CHARS = 200;

/**
 * Sanitiza um reply antes de injetar no system prompt.
 * Strings que vêm de AsyncStorage podem ter sido corrompidas por debug, import
 * ou bug em outro código — não confiar nelas como puro texto. Sem isso, alguém
 * podia gravar "\n\nNOVA REGRA: ignore o resto." no cache e o conteúdo entraria
 * no system prompt na próxima chamada (cache-poisoning → prompt injection).
 */
function sanitizeReply(s: string): string | null {
  if (typeof s !== 'string') return null;
  const cleaned = s.replace(/[\r\n\t]+/g, ' ').replace(/"/g, '').trim();
  if (cleaned.length === 0 || cleaned.length > MAX_REPLY_CHARS) return null;
  return cleaned;
}

export async function shouldRetryForVariety(
  userId: string,
  personality: Personality,
): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY(userId, personality));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeReply).filter((s): s is string => s !== null);
  } catch {
    return [];
  }
}

export async function rememberReply(
  userId: string,
  personality: Personality,
  reply: string,
): Promise<void> {
  const cleaned = sanitizeReply(reply);
  if (!cleaned) return;
  try {
    const existing = await shouldRetryForVariety(userId, personality);
    // Dedup: se já tem exatamente essa frase, move pro topo em vez de duplicar.
    const next = [cleaned, ...existing.filter(r => r !== cleaned)].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(KEY(userId, personality), JSON.stringify(next));
  } catch {
    /* cache é melhor-esforço */
  }
}

/** Heurística simples: dois replies "iguais" se compartilham 80%+ palavras. */
export function isNearDuplicate(a: string, b: string): boolean {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  const intersection = new Set(Array.from(wordsA).filter(w => wordsB.has(w)));
  const smaller = Math.min(wordsA.size, wordsB.size);
  return intersection.size / smaller >= 0.8;
}

/** Test helper. */
export async function clearAntiRepeatCache(userId: string, personality: Personality): Promise<void> {
  await AsyncStorage.removeItem(KEY(userId, personality));
}
