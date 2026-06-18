/**
 * Testes do cooldown do banner de CVV ("Tô em momento ruim · só presença").
 *
 * Invariante de SEGURANÇA: o cooldown de 7 dias é anti-nag de um banner de
 * conveniência — mas é caminho rápido pro modo crise, então sempre falha pro
 * lado seguro (mostrar) em erro/corrupção. Cobertura adicionada na auditoria
 * 2026-06-18: o módulo (incluindo o guard de relógio-pra-trás) não tinha teste,
 * e o fix de "crise nova reabre o banner" passou a depender de clearCrisis...().
 */
import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CRISIS_BANNER_COOLDOWN_MS,
  clearCrisisBannerCooldown,
  isCrisisBannerOnCooldown,
  markCrisisBannerDismissed,
} from '@/lib/crisisBannerCooldown';

const KEY = 'mascote:crisis_banner_dismissed_at';

beforeEach(async () => {
  await AsyncStorage.removeItem(KEY);
});

describe('crisisBannerCooldown', () => {
  it('sem dismissal anterior → não está em cooldown (banner aparece)', async () => {
    expect(await isCrisisBannerOnCooldown()).toBe(false);
  });

  it('após markCrisisBannerDismissed → cooldown ativo', async () => {
    await markCrisisBannerDismissed();
    expect(await isCrisisBannerOnCooldown()).toBe(true);
  });

  it('após 7 dias (now > dismissedAt + cooldown) → não está mais em cooldown', async () => {
    await markCrisisBannerDismissed();
    const futureNow = Date.now() + CRISIS_BANNER_COOLDOWN_MS + 1000;
    expect(await isCrisisBannerOnCooldown(futureNow)).toBe(false);
  });

  it('cooldown exato (now == dismissedAt + 7d) → libera (estritamente menor)', async () => {
    const baseTime = Date.now();
    await AsyncStorage.setItem(KEY, String(baseTime));
    const exact = baseTime + CRISIS_BANNER_COOLDOWN_MS;
    expect(await isCrisisBannerOnCooldown(exact)).toBe(false);
  });

  it('1ms antes de expirar → ainda em cooldown', async () => {
    const baseTime = Date.now();
    await AsyncStorage.setItem(KEY, String(baseTime));
    const justBefore = baseTime + CRISIS_BANNER_COOLDOWN_MS - 1;
    expect(await isCrisisBannerOnCooldown(justBefore)).toBe(true);
  });

  it('relógio pra trás (dismissedAt no futuro) → libera, não trava o banner pra sempre', async () => {
    // Guard de clock-skew: NTP/viagem de fuso/debug pode pôr dismissedAt > now.
    // Sem o guard, now - dismissedAt seria negativo (< cooldown) e o banner de
    // crise ficaria escondido indefinidamente — inaceitável numa feature de saúde.
    const now = Date.now();
    await AsyncStorage.setItem(KEY, String(now + 60 * 60 * 1000)); // 1h no futuro
    expect(await isCrisisBannerOnCooldown(now)).toBe(false);
  });

  it.each(['not-a-number', 'NaN', '', 'undefined'])(
    'valor corrompido em storage (%s) → não está em cooldown (falha pro lado seguro)',
    async corrupt => {
      await AsyncStorage.setItem(KEY, corrupt);
      expect(await isCrisisBannerOnCooldown()).toBe(false);
    },
  );

  it('clearCrisisBannerCooldown remove o dismissal (crise nova reabre o banner)', async () => {
    await markCrisisBannerDismissed();
    expect(await isCrisisBannerOnCooldown()).toBe(true);
    await clearCrisisBannerCooldown();
    expect(await isCrisisBannerOnCooldown()).toBe(false);
  });

  it('CRISIS_BANNER_COOLDOWN_MS = 7 dias', () => {
    expect(CRISIS_BANNER_COOLDOWN_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
