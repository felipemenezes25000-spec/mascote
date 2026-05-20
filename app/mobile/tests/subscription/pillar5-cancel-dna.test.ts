/**
 * Pilar 5 — cancelar assinatura não apaga DNA, streak nem histórico de check-ins.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyCheckinFully } from '@/lib/checkin';
import { checkins, exportAll, mascots, profiles } from '@/lib/db';
import { sanitizeGenome } from '@/lib/dna';
import { subscriptionService } from '@/services/subscription';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Pilar 5 — cancel preserva progresso', () => {
  it('genoma, check-ins e tier free após cancel sem perder DNA', async () => {
    const profile = await profiles.upsert({ display_name: 'Felipe' });
    const mascot = await mascots.upsert({ user_id: profile.id, name: 'Luma', personality: 'calmo' });
    expect(mascot.dna).toBeDefined();

    await applyCheckinFully({ profile, mascot, kind: 'water', analyticsPath: 'home' });
    await applyCheckinFully({ profile, mascot, kind: 'sleep', analyticsPath: 'home' });

    const purchase = await subscriptionService.subscribe(profile.id, 'plus_monthly');
    expect(purchase.success).toBe(true);

    const exportPlus = await exportAll(profile.id);
    const dnaAtPlus = exportPlus.mascots[0]?.dna;
    expect(dnaAtPlus).toBeDefined();
    const checkinsAtPlus = await checkins.listAll(profile.id);

    await subscriptionService.cancel(profile.id);
    expect(await subscriptionService.getCurrentTier(profile.id)).toBe('free');

    const exportAfter = await exportAll(profile.id);
    const mascotAfter = exportAfter.mascots[0];
    expect(mascotAfter?.dna).toEqual(dnaAtPlus);

    const allCheckins = await checkins.listAll(profile.id);
    expect(allCheckins.length).toBe(checkinsAtPlus.length);
    expect(allCheckins.length).toBeGreaterThanOrEqual(2);

    const genomeAfter = mascotAfter?.dna ? sanitizeGenome(mascotAfter.dna) : null;
    const genomeAtPlus = dnaAtPlus ? sanitizeGenome(dnaAtPlus) : null;
    expect(genomeAfter).toEqual(genomeAtPlus);
  });
});
