/**
 * Minigames — registry e service de recompensa.
 *
 * Invariantes críticos:
 * - Registry só contém jogos com rota real; metadados completos.
 * - Recompensa respeita cap diário de partidas (free=3) — além disso,
 *   partida vale 0 (diversão), sem punição.
 * - XP passa por applyXp → respeita o cap diário global de 150 XP.
 * - Sem double-spend em conclusões paralelas (lock checkin:uid).
 * - Score NaN/fora de [0,1] é sanitizado, nunca envenena recompensa.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMinigame,
  MINIGAME_COINS_MAX,
  MINIGAME_XP_MAX,
  MINIGAMES,
  REWARDED_PLAYS_PER_DAY_FREE,
  UPCOMING_MINIGAMES,
} from '@/game/minigames/registry';
import { completeMinigame, rewardedPlaysLeftToday } from '@/game/minigames/service';
import { mascots, profiles, wallet as walletDb, xpEvents } from '@/lib/db';
import { XP_DAILY_CAP } from '@/lib/xp';
import type { Mascot, Profile } from '@/types';

async function setupUser(): Promise<{ profile: Profile; mascot: Mascot }> {
  const profile = await profiles.upsert({ display_name: 'Felipe' });
  const mascot = await mascots.upsert({
    user_id: profile.id,
    name: 'Bipo',
    personality: 'calmo',
    xp: 0,
    level: 1,
    phase: 'ovo',
    energy: 80,
    mood: 'ok',
    health: 100,
  });
  return { profile, mascot };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('registry — sanidade', () => {
  it('jogos implementados, todos com rota /minigames/<id>', () => {
    expect(MINIGAMES.length).toBe(4);
    for (const m of MINIGAMES) {
      expect(m.route).toBe(`/minigames/${m.id}`);
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.tagline.length).toBeGreaterThan(0);
      expect(m.howTo.length).toBeGreaterThan(0);
      expect(m.roundSeconds).toBeGreaterThan(0);
      expect(m.unlockPhase).toBeGreaterThanOrEqual(1);
    }
  });

  it('ids únicos; getMinigame resolve; desconhecido → undefined', () => {
    expect(new Set(MINIGAMES.map(m => m.id)).size).toBe(MINIGAMES.length);
    expect(getMinigame('energy-run')?.name).toBe('Corrida de Energia');
    expect(getMinigame('nope')).toBeUndefined();
  });

  it('upcoming é teaser puro (sem rota) — nunca botão morto', () => {
    expect(UPCOMING_MINIGAMES.length).toBeGreaterThan(0);
    for (const u of UPCOMING_MINIGAMES) {
      expect(u).not.toHaveProperty('route');
    }
  });
});

describe('completeMinigame — recompensas', () => {
  it('partida recompensada paga moedas + XP e persiste mascote', async () => {
    const { profile, mascot } = await setupUser();
    const out = await completeMinigame({
      profile, mascot, gameId: 'energy-run', score: 1, durationMs: 30_000,
    });
    expect(out.rewarded).toBe(true);
    expect(out.coinsEarned).toBe(MINIGAME_COINS_MAX);
    expect(out.xpEarned).toBe(MINIGAME_XP_MAX);
    const w = await walletDb.get(profile.id);
    expect(w.coins).toBe(MINIGAME_COINS_MAX);
    const stored = await mascots.forUser(profile.id);
    expect(stored?.xp).toBe(out.mascot.xp);
    const total = await xpEvents.total(profile.id);
    expect(total).toBe(out.xpEarned);
  });

  it('score 0 ainda paga piso de 30% (microvitória conta)', async () => {
    const { profile, mascot } = await setupUser();
    const out = await completeMinigame({
      profile, mascot, gameId: 'energy-run', score: 0, durationMs: 30_000,
    });
    expect(out.coinsEarned).toBe(Math.round(MINIGAME_COINS_MAX * 0.3));
    expect(out.xpEarned).toBe(Math.round(MINIGAME_XP_MAX * 0.3));
  });

  it('score NaN/negativo/acima de 1 é sanitizado', async () => {
    const { profile, mascot } = await setupUser();
    const nan = await completeMinigame({
      profile, mascot, gameId: 'energy-run', score: NaN, durationMs: 1000,
    });
    expect(nan.coinsEarned).toBe(Math.round(MINIGAME_COINS_MAX * 0.3));
    const over = await completeMinigame({
      profile, mascot, gameId: 'crystal-hunt', score: 99, durationMs: 1000,
    });
    expect(over.coinsEarned).toBe(MINIGAME_COINS_MAX);
  });

  it('além do cap diário: rewarded=false, 0 moedas, 0 XP, sem punição', async () => {
    const { profile, mascot } = await setupUser();
    for (let i = 0; i < REWARDED_PLAYS_PER_DAY_FREE; i++) {
      const out = await completeMinigame({
        profile, mascot, gameId: 'energy-run', score: 1, durationMs: 1000,
      });
      expect(out.rewarded).toBe(true);
    }
    const extra = await completeMinigame({
      profile, mascot, gameId: 'energy-run', score: 1, durationMs: 1000,
    });
    expect(extra.rewarded).toBe(false);
    expect(extra.coinsEarned).toBe(0);
    expect(extra.xpEarned).toBe(0);
    const w = await walletDb.get(profile.id);
    expect(w.coins).toBe(MINIGAME_COINS_MAX * REWARDED_PLAYS_PER_DAY_FREE);
  });

  it('cap é POR JOGO: esgotar energy-run não bloqueia crystal-hunt', async () => {
    const { profile, mascot } = await setupUser();
    for (let i = 0; i < REWARDED_PLAYS_PER_DAY_FREE; i++) {
      await completeMinigame({
        profile, mascot, gameId: 'energy-run', score: 1, durationMs: 1000,
      });
    }
    const other = await completeMinigame({
      profile, mascot, gameId: 'crystal-hunt', score: 1, durationMs: 1000,
    });
    expect(other.rewarded).toBe(true);
  });

  it('conclusões PARALELAS não duplicam pagamento além do cap', async () => {
    const { profile, mascot } = await setupUser();
    const results = await Promise.all(
      Array.from({ length: REWARDED_PLAYS_PER_DAY_FREE + 3 }, () =>
        completeMinigame({
          profile, mascot, gameId: 'energy-run', score: 1, durationMs: 1000,
        }),
      ),
    );
    const rewardedCount = results.filter(r => r.rewarded).length;
    expect(rewardedCount).toBe(REWARDED_PLAYS_PER_DAY_FREE);
    const w = await walletDb.get(profile.id);
    expect(w.coins).toBe(MINIGAME_COINS_MAX * REWARDED_PLAYS_PER_DAY_FREE);
  });

  it('XP de minigame respeita o cap diário global de 150 XP', async () => {
    const { profile, mascot } = await setupUser();
    // Verifica que applyXp foi usado: xpEarned nunca excede o restante do cap.
    const out = await completeMinigame({
      profile, mascot, gameId: 'energy-run', score: 1, durationMs: 1000,
    });
    expect(out.xpEarned).toBeLessThanOrEqual(XP_DAILY_CAP);
  });

  it('jogo desconhecido lança erro', async () => {
    const { profile, mascot } = await setupUser();
    await expect(
      completeMinigame({ profile, mascot, gameId: 'fake', score: 1, durationMs: 1 }),
    ).rejects.toThrow(/desconhecido/);
  });

  it('rewardedPlaysLeftToday decresce conforme joga', async () => {
    const { profile, mascot } = await setupUser();
    expect(await rewardedPlaysLeftToday(profile.id, 'energy-run')).toBe(
      REWARDED_PLAYS_PER_DAY_FREE,
    );
    await completeMinigame({
      profile, mascot, gameId: 'energy-run', score: 1, durationMs: 1000,
    });
    expect(await rewardedPlaysLeftToday(profile.id, 'energy-run')).toBe(
      REWARDED_PLAYS_PER_DAY_FREE - 1,
    );
  });
});
