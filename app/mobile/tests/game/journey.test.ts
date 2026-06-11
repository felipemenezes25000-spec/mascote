/**
 * Jornada de 100 fases / 10 mundos.
 *
 * Invariantes críticos:
 * - Exatamente 100 fases e 10 mundos; thresholds estritamente crescentes.
 * - Fase é função PURA do XP: monotônica, defensiva contra NaN.
 * - Toda fase tem recompensa com label; finais de mundo têm título.
 * - Claim é idempotente (2 chamadas → paga 1x) e nunca regride.
 * - Mundos 9-10 premium: free acumula pendência e resgata RETROATIVO
 *   ao assinar (sem perda). Ponteiro não avança sobre fase bloqueada.
 * - Alinhamento com marcos visuais existentes (PHASE_THRESHOLDS).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  catalogMilestones,
  earnedTitles,
  isPhaseClaimableForTier,
  JOURNEY_PHASES,
  JOURNEY_WORLDS,
  journeyPhaseFromXp,
  journeyProgress,
  MINIGAME_UNLOCK_PHASES,
  nextUnlockTeaser,
  unlockedMinigames,
  worldMap,
} from '@/game/journey';
import { claimJourneyRewards } from '@/game/journey/service';
import { journeyClaims, mascots, profiles, wallet as walletDb } from '@/lib/db';
import { PHASE_THRESHOLDS } from '@/lib/xp';
import { MINIGAMES } from '@/game/minigames/registry';
import type { Profile } from '@/types';

async function setupUser(xp: number): Promise<Profile> {
  const profile = await profiles.upsert({ display_name: 'Felipe' });
  await mascots.upsert({
    user_id: profile.id,
    name: 'Bipo',
    personality: 'calmo',
    xp,
    level: 1,
    phase: 'ovo',
    energy: 80,
    mood: 'ok',
    health: 100,
  });
  return profile;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('conteúdo — estrutura das 100 fases', () => {
  it('tem exatamente 100 fases e 10 mundos', () => {
    expect(JOURNEY_PHASES.length).toBe(100);
    expect(JOURNEY_WORLDS.length).toBe(10);
  });

  it('fases numeradas 1..100 com XP estritamente crescente', () => {
    JOURNEY_PHASES.forEach((p, i) => {
      expect(p.n).toBe(i + 1);
      if (i > 0) expect(p.xp).toBeGreaterThan(JOURNEY_PHASES[i - 1].xp);
    });
    expect(JOURNEY_PHASES[0].xp).toBe(0);
  });

  it('mundos cobrem 10 fases cada, contíguos, sem buraco', () => {
    JOURNEY_WORLDS.forEach((w, i) => {
      expect(w.id).toBe(i + 1);
      expect(w.lastPhase - w.firstPhase).toBe(9);
      if (i > 0) expect(w.firstPhase).toBe(JOURNEY_WORLDS[i - 1].lastPhase + 1);
    });
    expect(JOURNEY_WORLDS[0].firstPhase).toBe(1);
    expect(JOURNEY_WORLDS[9].lastPhase).toBe(100);
  });

  it('toda fase tem recompensa com label e coins >= 0', () => {
    for (const p of JOURNEY_PHASES) {
      expect(p.reward.label.length).toBeGreaterThan(0);
      expect(p.reward.coins).toBeGreaterThanOrEqual(0);
      expect(p.reward.gems).toBeGreaterThanOrEqual(0);
      expect(p.title.length).toBeGreaterThan(0);
    }
  });

  it('finais de mundo (n % 10 === 0) concedem título único', () => {
    const titles = JOURNEY_PHASES.filter(p => p.n % 10 === 0).map(p => {
      expect(p.reward.kind).toBe('title');
      expect(p.reward.title).toBeTruthy();
      return p.reward.title;
    });
    expect(new Set(titles).size).toBe(10);
  });

  it('mundos 9-10 são premium; 1-8 são free', () => {
    for (const w of JOURNEY_WORLDS) {
      expect(w.premium).toBe(w.id >= 9);
    }
  });

  it('minigames do registry destravam em fases existentes do plano', () => {
    for (const m of MINIGAMES) {
      expect(MINIGAME_UNLOCK_PHASES[m.id]).toBe(m.unlockPhase);
      const phase = JOURNEY_PHASES[m.unlockPhase - 1];
      expect(phase.reward.kind).toBe('minigame');
      expect(phase.reward.minigameId).toBe(m.id);
    }
  });

  it('curva alinha com marcos visuais existentes (bebê≈f6, evoluído≈f90)', () => {
    const bebe = PHASE_THRESHOLDS.find(t => t.phase === 'bebe')!.xp;
    const evoluido = PHASE_THRESHOLDS.find(t => t.phase === 'evoluido')!.xp;
    expect(journeyPhaseFromXp(bebe).n).toBeGreaterThanOrEqual(5);
    expect(journeyPhaseFromXp(bebe).n).toBeLessThanOrEqual(8);
    expect(journeyPhaseFromXp(evoluido).worldId).toBeGreaterThanOrEqual(9);
  });
});

describe('journeyPhaseFromXp — função pura', () => {
  it('0 XP → fase 1; XP gigante → fase 100', () => {
    expect(journeyPhaseFromXp(0).n).toBe(1);
    expect(journeyPhaseFromXp(10_000_000).n).toBe(100);
  });

  it('é monotônica no XP', () => {
    let prev = 0;
    for (let xp = 0; xp <= 40_000; xp += 137) {
      const n = journeyPhaseFromXp(xp).n;
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });

  it('NaN/Infinity/negativo → fase 1 (sem poison)', () => {
    expect(journeyPhaseFromXp(NaN).n).toBe(1);
    expect(journeyPhaseFromXp(-50).n).toBe(1);
    // Infinity = estado corrompido → tratado como 0 (mesma regra do applyXp).
    expect(journeyPhaseFromXp(Infinity).n).toBe(1);
  });

  it('threshold exato alcança a fase', () => {
    for (const p of [JOURNEY_PHASES[9], JOURNEY_PHASES[49], JOURNEY_PHASES[99]]) {
      expect(journeyPhaseFromXp(p.xp).n).toBe(p.n);
      expect(journeyPhaseFromXp(p.xp - 1).n).toBe(p.n - 1);
    }
  });
});

describe('journeyProgress + teaser', () => {
  it('progress entre 0 e 1; fase 100 = 1', () => {
    const mid = journeyProgress(JOURNEY_PHASES[4].xp + 5);
    expect(mid.progress).toBeGreaterThan(0);
    expect(mid.progress).toBeLessThanOrEqual(1);
    const max = journeyProgress(JOURNEY_PHASES[99].xp + 999);
    expect(max.progress).toBe(1);
    expect(max.nextPhase).toBeNull();
  });

  it('nextUnlockTeaser aponta a próxima fase com XP restante', () => {
    const teaser = nextUnlockTeaser(0);
    expect(teaser).not.toBeNull();
    expect(teaser!.xpRemaining).toBe(JOURNEY_PHASES[1].xp);
    expect(nextUnlockTeaser(10_000_000)).toBeNull();
  });

  it('earnedTitles e unlockedMinigames derivam do XP', () => {
    expect(earnedTitles(0)).toEqual([]);
    expect(earnedTitles(JOURNEY_PHASES[9].xp).length).toBe(1);
    expect(unlockedMinigames(JOURNEY_PHASES[2].xp)).toContain('energy-run');
    expect(unlockedMinigames(0)).toEqual([]);
  });

  it('worldMap marca completed/current/locked corretamente', () => {
    const map = worldMap(JOURNEY_PHASES[14].xp); // fase 15 → mundo 2
    expect(map[0].state).toBe('completed');
    expect(map[1].state).toBe('current');
    expect(map[2].state).toBe('locked');
  });

  it('catalogMilestones posiciona itens de level no mapa, ordenados', () => {
    const ms = catalogMilestones();
    expect(ms.length).toBeGreaterThan(5);
    for (let i = 1; i < ms.length; i++) {
      expect(ms[i].phaseN).toBeGreaterThanOrEqual(ms[i - 1].phaseN);
    }
  });
});

describe('claimJourneyRewards — idempotência e economia', () => {
  it('paga moedas/gemas das fases alcançadas e avança ponteiro', async () => {
    const xp = JOURNEY_PHASES[9].xp; // fase 10 (fim do mundo 1)
    const profile = await setupUser(xp);
    const out = await claimJourneyRewards(profile, xp);
    expect(out.claimed.length).toBe(9); // fases 2..10
    expect(out.coinsGained).toBeGreaterThan(0);
    expect(out.newTitles).toEqual(['Laço formado']);
    const w = await walletDb.get(profile.id);
    expect(w.coins).toBe(out.coinsGained);
    expect(w.gems).toBe(out.gemsGained);
    const row = await journeyClaims.get(profile.id);
    expect(row.claimed_phase).toBe(10);
  });

  it('segunda chamada não paga em dobro (idempotente)', async () => {
    const xp = JOURNEY_PHASES[9].xp;
    const profile = await setupUser(xp);
    await claimJourneyRewards(profile, xp);
    const again = await claimJourneyRewards(profile, xp);
    expect(again.claimed.length).toBe(0);
    expect(again.coinsGained).toBe(0);
  });

  it('chamadas PARALELAS pagam exatamente uma vez (lock)', async () => {
    const xp = JOURNEY_PHASES[9].xp;
    const profile = await setupUser(xp);
    const [a, b] = await Promise.all([
      claimJourneyRewards(profile, xp),
      claimJourneyRewards(profile, xp),
    ]);
    const paidTotal = a.coinsGained + b.coinsGained;
    const w = await walletDb.get(profile.id);
    expect(w.coins).toBe(paidTotal);
    expect([a.claimed.length, b.claimed.length].sort()).toEqual([0, 9]);
  });

  it('free NÃO resgata mundos 9-10; pendência reportada; ponteiro para', async () => {
    const xp = JOURNEY_PHASES[85].xp; // fase 86 (mundo 9)
    const profile = await setupUser(xp);
    const out = await claimJourneyRewards(profile, xp);
    // Fases 2..80 pagas; 81 bloqueada → lockedPremium, ponteiro em 80.
    expect(out.claimed.length).toBe(79);
    expect(out.lockedPremium.length).toBe(1);
    expect(out.lockedPremium[0].n).toBe(81);
    const row = await journeyClaims.get(profile.id);
    expect(row.claimed_phase).toBe(80);
  });

  it('assinar depois resgata mundos premium RETROATIVAMENTE (sem perda)', async () => {
    const xp = JOURNEY_PHASES[85].xp; // fase 86 (mundo 9)
    const profile = await setupUser(xp);
    const beforeSub = await claimJourneyRewards(profile, xp);
    expect(beforeSub.lockedPremium.length).toBe(1);
    const { localSubscriptionRepo } = await import('@/repositories/local');
    await localSubscriptionRepo.setTier(profile.id, 'plus_monthly');
    const afterSub = await claimJourneyRewards(profile, xp);
    // Fases 81..86 agora pagas de uma vez (retroativo).
    expect(afterSub.claimed.map(p => p.n)).toEqual([81, 82, 83, 84, 85, 86]);
    const row = await journeyClaims.get(profile.id);
    expect(row.claimed_phase).toBe(86);
  });

  it('isPhaseClaimableForTier: mundo 9 livre pra plus, bloqueado pra free', () => {
    const phase81 = JOURNEY_PHASES[80];
    expect(isPhaseClaimableForTier(phase81, 'free')).toBe(false);
    expect(isPhaseClaimableForTier(phase81, 'plus_monthly')).toBe(true);
    expect(isPhaseClaimableForTier(JOURNEY_PHASES[0], 'free')).toBe(true);
  });

  it('XP NaN não paga nada e não corrompe ponteiro', async () => {
    const profile = await setupUser(0);
    const out = await claimJourneyRewards(profile, NaN);
    expect(out.claimed.length).toBe(0);
    const row = await journeyClaims.get(profile.id);
    expect(row.claimed_phase).toBe(1);
  });
});
