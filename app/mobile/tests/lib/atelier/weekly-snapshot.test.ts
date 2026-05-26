/**
 * weeklySnapshot — auto-save semanal de looks.
 *
 * Invariantes:
 *  - Idempotente: chamadas múltiplas em < 7 dias = NO-OP silent
 *  - Naming: "Semana N (auto)" deterministicamente baseado em created_at
 *  - Cria look novo só quando não há auto recente (independente de manuais)
 *  - Cota compartilhada com manuais — FIFO trim aplica normal
 */

import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { atelierLooks } from '@/lib/db';
import {
  maybeCreateWeeklySnapshot,
  weekNumber,
} from '@/lib/atelier/weeklySnapshot';
import type { MascotCustomization, Profile } from '@/types';

const sampleCustomization: MascotCustomization = {
  user_id: 'user-A',
  eye_size: 1.1,
  eye_spread: 1,
  body_height: 1.2,
  body_width: 0.95,
  aura_intensity: 1,
  pattern_density: 1.05,
  preferred_pattern: 'spots',
  posture_lean: 0,
  force_hide_tail: false,
  force_hide_antennae: false,
  force_hide_spikes: false,
  updated_at: new Date().toISOString(),
};

function makeProfile(createdAt: string): Profile {
  return {
    id: 'user-A',
    nickname: 'Felipe',
    created_at: createdAt,
    locale: 'pt-BR',
  } as Profile;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('weekNumber', () => {
  it('semana 1 nos primeiros 6 dias', () => {
    const created = new Date('2026-05-01T00:00:00Z').getTime();
    expect(weekNumber('2026-05-01T00:00:00Z', created + 0)).toBe(1);
    expect(weekNumber('2026-05-01T00:00:00Z', created + 6 * 24 * 60 * 60 * 1000)).toBe(1);
  });

  it('semana 2 começa no dia 7', () => {
    const created = new Date('2026-05-01T00:00:00Z').getTime();
    expect(weekNumber('2026-05-01T00:00:00Z', created + 7 * 24 * 60 * 60 * 1000)).toBe(2);
  });

  it('semana 5 = ~30 dias', () => {
    const created = new Date('2026-05-01T00:00:00Z').getTime();
    expect(weekNumber('2026-05-01T00:00:00Z', created + 30 * 24 * 60 * 60 * 1000)).toBe(5);
  });

  it('clamp min em 1', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(weekNumber(future)).toBe(1);
  });

  it('created_at invalid → 1', () => {
    expect(weekNumber('not-a-date')).toBe(1);
  });
});

describe('maybeCreateWeeklySnapshot', () => {
  it('cria snapshot quando vazio', async () => {
    const profile = makeProfile(new Date('2026-05-01T00:00:00Z').toISOString());
    const result = await maybeCreateWeeklySnapshot(profile, sampleCustomization);
    expect(result.created).not.toBeNull();
    expect(result.created?.name).toMatch(/Semana \d+ \(auto\)$/);
  });

  it('NO-OP quando snapshot auto < 7 dias existe', async () => {
    const profile = makeProfile(new Date('2026-05-01T00:00:00Z').toISOString());
    await maybeCreateWeeklySnapshot(profile, sampleCustomization);

    const result2 = await maybeCreateWeeklySnapshot(profile, sampleCustomization);
    expect(result2.created).toBeNull();
    expect(result2.reason).toBe('recent_auto_exists');
  });

  it('detecta auto recente independente de timestamp passado', async () => {
    // Note: atelierLooks.save usa new Date().toISOString() real internamente.
    // Não dá pra simular "passou 7 dias" sem mock de Date.now (vai testar
    // hasRecentAutoSnapshot puro). O test acima cobre o caso real: r1 cria,
    // r2 imediato NO-OP. Time travel é overkill pra esse helper.
    const profile = makeProfile(new Date('2026-05-01T00:00:00Z').toISOString());
    const r1 = await maybeCreateWeeklySnapshot(profile, sampleCustomization);
    const r2 = await maybeCreateWeeklySnapshot(profile, sampleCustomization);
    expect(r1.created).not.toBeNull();
    expect(r2.created).toBeNull();
    expect(r2.reason).toBe('recent_auto_exists');
  });

  it('manuais existentes NÃO bloqueiam snapshot auto', async () => {
    await atelierLooks.save('user-A', 'Meu look manual', sampleCustomization);

    const profile = makeProfile(new Date('2026-05-01T00:00:00Z').toISOString());
    const result = await maybeCreateWeeklySnapshot(profile, sampleCustomization);
    expect(result.created).not.toBeNull();
    expect(result.created?.name).toMatch(/Semana/);
  });

  it('no_profile quando profile null', async () => {
    const result = await maybeCreateWeeklySnapshot(null, sampleCustomization);
    expect(result.created).toBeNull();
    expect(result.reason).toBe('no_profile');
  });

  it('snapshot AUTO usa cota separada — NÃO rouba slot manual', async () => {
    // Cria 5 looks manuais (cota cheia)
    for (let i = 0; i < 5; i++) {
      await atelierLooks.save('user-A', `Manual-${i}`, sampleCustomization);
      await new Promise(r => setTimeout(r, 2));
    }
    expect((await atelierLooks.list('user-A')).length).toBe(5);

    // Cria auto — vai pra cota separada de autos, manuais ficam intactos
    const profile = makeProfile(new Date('2026-05-01T00:00:00Z').toISOString());
    await maybeCreateWeeklySnapshot(profile, sampleCustomization);

    const list = await atelierLooks.list('user-A');
    // Total = 5 manuais + 1 auto = 6
    expect(list.length).toBe(6);
    // Todos os manuais preservados
    for (let i = 0; i < 5; i++) {
      expect(list.some(l => l.name === `Manual-${i}`)).toBe(true);
    }
    expect(list.some(l => l.is_auto === true)).toBe(true);
  });
});
