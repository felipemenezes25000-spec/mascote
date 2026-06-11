/**
 * Desafios de Evento — meta dentro da janela do evento limitado + baú.
 *
 * Invariantes:
 * - Desafio deriva do evento ativo; ocorrências de semanas diferentes têm
 *   IDs diferentes (resgatável de novo no próximo ciclo).
 * - Progresso conta SÓ check-ins dentro da janela (derivado, sem contador).
 * - Claim exige meta, paga UMA vez (parallel-safe), idempotente.
 * - Tabela de drops da caixa: rara durante evento, normal fora.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  activeEventChallenge,
  challengeProgress,
  claimEventChallenge,
} from '@/game/events/challenge';
import { mysteryBoxDrops } from '@/game/events/drops';
import { applyCheckinFully } from '@/lib/checkin';
import { eventClaims, mascots, profiles, wallet as walletDb } from '@/lib/db';
import type { Mascot, Profile } from '@/types';

async function setupUser(): Promise<{ profile: Profile; mascot: Mascot }> {
  const profile = await profiles.upsert({ display_name: 'Felipe' });
  const mascot = await mascots.upsert({
    user_id: profile.id,
    name: 'Bipo',
    personality: 'calmo',
    xp: 0, level: 1, phase: 'ovo', energy: 80, mood: 'ok', health: 100,
  });
  return { profile, mascot };
}

// Sábado 14h — dentro do weekend-double-xp.
const SATURDAY = new Date('2026-06-13T14:00:00');
// Sábado da semana SEGUINTE.
const NEXT_SATURDAY = new Date('2026-06-20T14:00:00');
// Terça 10h — nenhum evento (tonight só começa às 19h).
const TUESDAY_MORNING = new Date('2026-06-16T10:00:00');

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('activeEventChallenge — derivação', () => {
  it('fim de semana → desafio de 3 check-ins com baú', () => {
    const ch = activeEventChallenge(SATURDAY);
    expect(ch).not.toBeNull();
    expect(ch!.eventId).toBe('weekend-double-xp');
    expect(ch!.target).toBe(3);
    expect(ch!.reward.coins).toBeGreaterThan(0);
    expect(ch!.reward.gems).toBeGreaterThan(0);
  });

  it('ocorrências de semanas diferentes têm IDs diferentes', () => {
    const a = activeEventChallenge(SATURDAY)!;
    const b = activeEventChallenge(NEXT_SATURDAY)!;
    expect(a.eventId).toBe(b.eventId);
    expect(a.id).not.toBe(b.id);
  });

  it('sem evento ativo → null', () => {
    expect(activeEventChallenge(TUESDAY_MORNING)).toBeNull();
  });

  it('noite (19-23h) → desafio da noite com meta 2', () => {
    const tuesdayNight = new Date('2026-06-16T20:00:00');
    const ch = activeEventChallenge(tuesdayNight);
    expect(ch?.eventId).toBe('tonight-coins-x3');
    expect(ch?.target).toBe(2);
  });
});

describe('challengeProgress + claim', () => {
  it('progresso conta só check-ins na janela; claim paga e é idempotente', async () => {
    const { profile, mascot } = await setupUser();
    const ch = activeEventChallenge(SATURDAY)!;
    // Check-ins de AGORA (occurred_at = now) — fora da janela de jun/2026
    // a menos que o teste rode no fim de semana; então testamos progresso 0
    // com janela sintética no passado.
    const past = activeEventChallenge(new Date('2020-01-04T12:00:00'))!; // sábado 2020
    expect(await challengeProgress(profile.id, past)).toBe(0);
    const incomplete = await claimEventChallenge(profile, past);
    expect(incomplete.claimed).toBe(false);
    expect(incomplete.reason).toBe('incomplete');

    // Janela cobrindo AGORA: check-ins reais contam.
    const wide = {
      ...ch,
      id: 'test-window:now',
      windowStart: new Date(Date.now() - 60_000),
      windowEnd: new Date(Date.now() + 60_000),
    };
    let m = mascot;
    for (const kind of ['water', 'sleep', 'exercise'] as const) {
      const out = await applyCheckinFully({ profile, mascot: m, kind });
      m = out.mascot;
    }
    expect(await challengeProgress(profile.id, wide)).toBe(3);

    const before = (await walletDb.get(profile.id)).coins;
    const out = await claimEventChallenge(profile, wide);
    expect(out.claimed).toBe(true);
    const after = await walletDb.get(profile.id);
    expect(after.coins).toBe(before + wide.reward.coins);
    expect(after.gems).toBeGreaterThanOrEqual(wide.reward.gems);

    const again = await claimEventChallenge(profile, wide);
    expect(again.claimed).toBe(false);
    expect(again.reason).toBe('already');
    expect((await walletDb.get(profile.id)).coins).toBe(after.coins);
  });

  it('claims PARALELOS pagam exatamente uma vez', async () => {
    const { profile, mascot } = await setupUser();
    const wide = {
      ...activeEventChallenge(SATURDAY)!,
      id: 'test-parallel:now',
      windowStart: new Date(Date.now() - 60_000),
      windowEnd: new Date(Date.now() + 60_000),
    };
    let m = mascot;
    for (const kind of ['water', 'sleep', 'exercise'] as const) {
      const out = await applyCheckinFully({ profile, mascot: m, kind });
      m = out.mascot;
    }
    const results = await Promise.all([
      claimEventChallenge(profile, wide),
      claimEventChallenge(profile, wide),
      claimEventChallenge(profile, wide),
    ]);
    expect(results.filter(r => r.claimed).length).toBe(1);
    const w = await walletDb.get(profile.id);
    expect(w.coins).toBeGreaterThanOrEqual(wide.reward.coins);
    expect(await eventClaims.isClaimed(profile.id, wide.id)).toBe(true);
  });
});

describe('mysteryBoxDrops — tabela rara em evento', () => {
  it('5 drops nas duas tabelas; rara paga visivelmente mais', () => {
    const normal = mysteryBoxDrops(false);
    const rare = mysteryBoxDrops(true);
    expect(normal.length).toBe(5);
    expect(rare.length).toBe(5);
    const sum = (t: readonly { coins: number; gems: number }[]) =>
      t.reduce((s, d) => s + d.coins + d.gems * 25, 0);
    expect(sum(rare)).toBeGreaterThan(sum(normal) * 1.5);
    for (const d of [...normal, ...rare]) {
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.coins).toBeGreaterThanOrEqual(0);
      expect(d.gems).toBeGreaterThanOrEqual(0);
    }
  });
});
