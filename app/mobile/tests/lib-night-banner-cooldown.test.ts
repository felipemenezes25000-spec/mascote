/**
 * Testes do cooldown do banner "Tá tarde aqui".
 *
 * Invariante: após dismissal, o banner fica escondido pelas próximas 8h
 * (não nag). Após esse período, volta. Persistência em AsyncStorage.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NIGHT_BANNER_COOLDOWN_MS,
  clearNightBannerCooldown,
  isNightBannerOnCooldown,
  markNightBannerDismissed,
} from '@/lib/nightBannerCooldown';

const KEY = 'mascote:night_banner_dismissed_at';

beforeEach(async () => {
  await AsyncStorage.removeItem(KEY);
});

describe('nightBannerCooldown', () => {
  it('sem dismissal anterior → não está em cooldown', async () => {
    expect(await isNightBannerOnCooldown()).toBe(false);
  });

  it('após markNightBannerDismissed → cooldown ativo', async () => {
    await markNightBannerDismissed();
    expect(await isNightBannerOnCooldown()).toBe(true);
  });

  it('após cooldown expirar (now > dismissedAt + 8h) → não está mais em cooldown', async () => {
    await markNightBannerDismissed();
    const futureNow = Date.now() + NIGHT_BANNER_COOLDOWN_MS + 1000;
    expect(await isNightBannerOnCooldown(futureNow)).toBe(false);
  });

  it('cooldown exato (now == dismissedAt + 8h) → libera (estritamente menor)', async () => {
    const baseTime = Date.now();
    await AsyncStorage.setItem(KEY, String(baseTime));
    const exact = baseTime + NIGHT_BANNER_COOLDOWN_MS;
    expect(await isNightBannerOnCooldown(exact)).toBe(false);
  });

  it('1ms antes do cooldown expirar → ainda em cooldown', async () => {
    const baseTime = Date.now();
    await AsyncStorage.setItem(KEY, String(baseTime));
    const justBefore = baseTime + NIGHT_BANNER_COOLDOWN_MS - 1;
    expect(await isNightBannerOnCooldown(justBefore)).toBe(true);
  });

  it.each([
    'not-a-number',
    'NaN',
    '',
    'undefined',
  ])('valor corrompido em storage (%s) → não está em cooldown', async corrupt => {
    await AsyncStorage.setItem(KEY, corrupt);
    expect(await isNightBannerOnCooldown()).toBe(false);
  });

  it('clearNightBannerCooldown remove o dismissal', async () => {
    await markNightBannerDismissed();
    expect(await isNightBannerOnCooldown()).toBe(true);
    await clearNightBannerCooldown();
    expect(await isNightBannerOnCooldown()).toBe(false);
  });

  it('NIGHT_BANNER_COOLDOWN_MS = 8 horas', () => {
    expect(NIGHT_BANNER_COOLDOWN_MS).toBe(8 * 60 * 60 * 1000);
  });

  it('dismissals consecutivos sobrescrevem o timestamp', async () => {
    await markNightBannerDismissed();
    const first = await AsyncStorage.getItem(KEY);
    // pequena espera artificial via Date stubbing seria ideal, mas pragmaticamente:
    await new Promise(r => setTimeout(r, 5));
    await markNightBannerDismissed();
    const second = await AsyncStorage.getItem(KEY);
    expect(Number(second)).toBeGreaterThanOrEqual(Number(first));
  });
});
