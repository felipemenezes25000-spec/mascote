/**
 * Cooldown do banner "Tô em momento ruim · só presença" no chat.
 *
 * Antes: o banner aparecia toda vez que o user entrava no chat — mesmo após
 * dismiss explícito. Vira nag (auditoria reportada). Agora respeita cooldown
 * de 7 dias após dismissal.
 *
 * Por que 7 dias e não "para sempre":
 * - Banner é caminho rápido pra `/safe-night` (modo crise). É feature de
 *   segurança — nunca deve sumir permanentemente.
 * - User ainda alcança /safe-night via ícone de coração no header do chat
 *   e via /help. Banner é conveniência, não única porta.
 * - 7 dias dá fôlego de uma semana sem incomodar mas mantém o lembrete
 *   gentil pra próxima semana ruim.
 *
 * Local-only — não envia nada pra rede.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mascote:crisis_banner_dismissed_at';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

/** Marca dismissal — banner não aparece pelos próximos 7 dias. */
export async function markCrisisBannerDismissed(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(Date.now()));
  } catch {
    // intencional: se AsyncStorage falhar, próxima sessão mostra o banner.
    // Anti-nag, mas degrada gracefully — feature de segurança nunca fica
    // travada por bug de storage.
  }
}

/**
 * Retorna `true` se o cooldown ainda está ativo (banner deve ficar escondido).
 * Não trava — em erro, libera o banner (false). Sempre falhar pro lado seguro
 * (mostrar) em feature de saúde mental.
 */
export async function isCrisisBannerOnCooldown(now: number = Date.now()): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    if (!Number.isFinite(dismissedAt)) return false;
    // Guard: relógio do device pode pular pra trás (NTP, viagem TZ, debug).
    // Sem isto, dismissedAt no futuro travaria o banner pra sempre.
    if (dismissedAt > now) return false;
    return now - dismissedAt < COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** Limpa o cooldown — útil pra debug e settings reset. */
export async function clearCrisisBannerCooldown(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignora
  }
}

export const CRISIS_BANNER_COOLDOWN_MS = COOLDOWN_MS;
