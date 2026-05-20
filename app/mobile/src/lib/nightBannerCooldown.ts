/**
 * Cooldown do banner "Tá tarde aqui".
 *
 * Antes V2: o banner aparecia toda vez que `isLateNight()` retornava true —
 * mesmo após o usuário dismissar. Isso virou nag. Agora respeita um cooldown
 * de 8h após dismissal (cobre uma noite inteira).
 *
 * Local-only — não envia nada pra rede.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mascote:night_banner_dismissed_at';
const COOLDOWN_MS = 8 * 60 * 60 * 1000; // 8 horas

/** Marca dismissal — banner não aparece pelas próximas 8h. */
export async function markNightBannerDismissed(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(Date.now()));
  } catch {
    // intencional: se AsyncStorage falhar, próxima sessão mostra o banner.
    // É anti-nag, mas degrada gracefully (não trava o app).
  }
}

/**
 * Retorna `true` se o cooldown ainda está ativo (banner deve ficar escondido).
 * Não trava — em erro, libera o banner (false).
 */
export async function isNightBannerOnCooldown(now: number = Date.now()): Promise<boolean> {
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
export async function clearNightBannerCooldown(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignora
  }
}

export const NIGHT_BANNER_COOLDOWN_MS = COOLDOWN_MS;
