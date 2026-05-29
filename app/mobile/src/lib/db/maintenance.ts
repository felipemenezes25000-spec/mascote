/**
 * GC de rotina pra chaves datadas do AsyncStorage.
 *
 * `ai_usage`/`ai_cost`/`bond:daily` criam uma chave nova por dia/usuário
 * (formato `prefixo:userId:YYYY-MM-DD`). Os valores são ints minúsculos, mas a
 * CONTAGEM de chaves cresce ~3/dia/user (~1095/ano) e nunca era limpa fora de
 * `resetAll()`. Muitas chaves degradam `getAllKeys()` (usado em reset, neste
 * sweep e na eviction do embed cache). Este sweep roda no boot (hydrate) e
 * remove as que passaram da janela de retenção, preservando recentes e
 * qualquer chave NÃO-datada (bond:total/by_kind, memórias, settings, etc.).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayLocal, addDays } from './dates';

/** Prefixos cujas chaves terminam em `:YYYY-MM-DD` e são seguras de expirar. */
const DATE_KEY_PREFIXES = [
  'mascote:ai_usage:',
  'mascote:ai_cost:',
  'mascote:bond:daily:',
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Remove chaves datadas anteriores a `today - retentionDays`. Best-effort:
 * qualquer erro de storage é engolido (GC não pode travar o boot). Retorna
 * quantas chaves removeu (útil pra teste/telemetria).
 *
 * @param retentionDays dias a preservar (default 7). Tratado como |n|.
 * @param today âncora ISO YYYY-MM-DD (injetável p/ teste; default = hoje local).
 */
export async function sweepStaleDateKeys(
  retentionDays = 7,
  today: string = todayLocal(),
): Promise<number> {
  const cutoff = addDays(today, -Math.abs(retentionDays));
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const stale = allKeys.filter((k) => {
      if (!DATE_KEY_PREFIXES.some((p) => k.startsWith(p))) return false;
      const date = k.slice(k.lastIndexOf(':') + 1);
      // ISO YYYY-MM-DD ordena lexicograficamente == cronologicamente.
      return ISO_DATE.test(date) && date < cutoff;
    });
    if (stale.length > 0) {
      await AsyncStorage.multiRemove(stale);
    }
    return stale.length;
  } catch {
    return 0;
  }
}
