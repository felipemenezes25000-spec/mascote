/**
 * Teto DIÁRIO do drift de genoma por chat (Fase 2). Só as primeiras N mensagens
 * do dia driftam — mantém o processo LENTO e anti-gaming (spammar 100 mensagens
 * não acelera). Persistência local (uma chave auto-resetável por dia), sem rede.
 *
 * Falha pro lado conservador: storage indisponível → não drift (drift é
 * nice-to-have; melhor pular do que over-driftar por estado inconsistente).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mascote:chat_drift_day';

/** Quantas mensagens/dia driftam o genoma. Calibração ajustável. */
export const CHAT_DRIFT_DAILY_CAP = 8;

/** Data LOCAL (não UTC) — o "dia" segue o relógio do usuário. */
function localDay(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Tenta consumir 1 unidade do orçamento do dia. Retorna true (e incrementa o
 * contador) se ainda há orçamento; false se o teto do dia foi atingido ou o
 * storage falhou.
 */
export async function tryConsumeChatDriftBudget(now: number = Date.now()): Promise<boolean> {
  const today = localDay(now);
  let count = 0;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { date?: string; count?: number };
        if (parsed && parsed.date === today && Number.isFinite(parsed.count)) {
          count = parsed.count as number;
        }
      } catch {
        // corrompido → trata como dia novo (count 0) e sobrescreve abaixo.
      }
    }
    if (count >= CHAT_DRIFT_DAILY_CAP) return false;
    await AsyncStorage.setItem(KEY, JSON.stringify({ date: today, count: count + 1 }));
    return true;
  } catch {
    return false;
  }
}
