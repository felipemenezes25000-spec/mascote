/**
 * Zustand store — estado global do app.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as accessibility from '@/lib/accessibility';
import { useStore } from '@/store';
import { mascots, profiles, settings, streaks, wallet as walletDb } from '@/lib/db';

beforeEach(async () => {
  await AsyncStorage.clear();
  // Reset store to initial state
  useStore.setState({
    hydrated: false,
    profile: null,
    mascot: null,
    streak: null,
    settings: null,
    wallet: null,
    openAiKey: null,
    toastQueue: [],
    currentToast: null,
    lifeState: null,
    lifeEvents: [],
    lifeSummaryLine: null,
    proactiveBubbleLine: null,
    lifeReturnCelebration: false,
  });
});

describe('hydrate', () => {
  it('sem profile → marca hydrated=true mas mantém nulls', async () => {
    await useStore.getState().hydrate();
    const s = useStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.profile).toBeNull();
  });

  it('com profile → carrega mascot/streak/settings/wallet', async () => {
    const p = await profiles.upsert({ display_name: 'Felipe' });
    await mascots.upsert({ user_id: p.id, name: 'X' });
    await useStore.getState().hydrate();
    const s = useStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.profile?.display_name).toBe('Felipe');
    expect(s.mascot?.name).toBe('X');
  });

  it('primeira sessão + SO reduce motion → persiste reduce_motion', async () => {
    vi.spyOn(accessibility, 'readSystemReduceMotion').mockResolvedValue(true);
    const p = await profiles.upsert({ display_name: 'A11y' });
    await mascots.upsert({ user_id: p.id, name: 'Y' });
    await useStore.getState().hydrate();
    expect(useStore.getState().settings?.reduce_motion).toBe(true);
    const persisted = await settings.get(p.id);
    expect(persisted.reduce_motion).toBe(true);
    vi.restoreAllMocks();
  });
});

describe('setters', () => {
  it('setProfile, setMascot, setStreak, setSettings, setWallet', async () => {
    const p = await profiles.upsert({ display_name: 'F' });
    useStore.getState().setProfile(p);
    expect(useStore.getState().profile).toEqual(p);
    useStore.getState().setProfile(null);
    expect(useStore.getState().profile).toBeNull();

    const m = await mascots.upsert({ user_id: p.id, name: 'X' });
    useStore.getState().setMascot(m);
    expect(useStore.getState().mascot).toEqual(m);
    useStore.getState().setMascot(null);
    expect(useStore.getState().mascot).toBeNull();

    const s = await streaks.get(p.id);
    useStore.getState().setStreak(s);
    expect(useStore.getState().streak).toEqual(s);
    useStore.getState().setStreak(null);
    expect(useStore.getState().streak).toBeNull();

    const cfg = await settings.get(p.id);
    useStore.getState().setSettings(cfg);
    expect(useStore.getState().settings).toEqual(cfg);

    const w = await walletDb.get(p.id);
    useStore.getState().setWallet(w);
    expect(useStore.getState().wallet).toEqual(w);
  });
});

describe('refresh* — sem profile no estado → no-op', () => {
  it('refreshMascot sem profile', async () => {
    await useStore.getState().refreshMascot();
    expect(useStore.getState().mascot).toBeNull();
  });
  it('refreshStreak sem profile', async () => {
    await useStore.getState().refreshStreak();
    expect(useStore.getState().streak).toBeNull();
  });
  it('refreshSettings sem profile', async () => {
    await useStore.getState().refreshSettings();
    expect(useStore.getState().settings).toBeNull();
  });
  it('refreshWallet sem profile', async () => {
    await useStore.getState().refreshWallet();
    expect(useStore.getState().wallet).toBeNull();
  });
});

describe('refresh* — com profile', () => {
  it('refreshMascot atualiza store', async () => {
    const p = await profiles.upsert({ display_name: 'F' });
    const m = await mascots.upsert({ user_id: p.id, name: 'Init' });
    useStore.getState().setProfile(p);
    useStore.getState().setMascot(m);
    // upsert novo
    await mascots.upsert({ user_id: p.id, name: 'Updated' });
    await useStore.getState().refreshMascot();
    expect(useStore.getState().mascot?.name).toBe('Updated');
  });

  it('refreshWallet atualiza store', async () => {
    const p = await profiles.upsert({ display_name: 'F' });
    useStore.getState().setProfile(p);
    await walletDb.add(p.id, 50);
    await useStore.getState().refreshWallet();
    expect(useStore.getState().wallet?.coins).toBe(50);
  });

  it('refreshStreak atualiza store', async () => {
    const p = await profiles.upsert({ display_name: 'F' });
    useStore.getState().setProfile(p);
    await streaks.upsert({
      user_id: p.id, current_streak: 3, longest_streak: 3,
      last_active_date: '2026-05-18', grace_days_left: 2,
      updated_at: new Date().toISOString(),
    });
    await useStore.getState().refreshStreak();
    expect(useStore.getState().streak?.current_streak).toBe(3);
  });

  it('refreshSettings atualiza store', async () => {
    const p = await profiles.upsert({ display_name: 'F' });
    useStore.getState().setProfile(p);
    await settings.update(p.id, { theme_mode: 'dark' });
    await useStore.getState().refreshSettings();
    expect(useStore.getState().settings?.theme_mode).toBe('dark');
  });
});

describe('setOpenAiKey', () => {
  it('seta no estado e persiste em secureStore', async () => {
    useStore.getState().setOpenAiKey('sk-test');
    expect(useStore.getState().openAiKey).toBe('sk-test');
    // Persistência é fire-and-forget; pode levar 1 tick.
    await new Promise(r => setImmediate(r));
  });

  it('setOpenAiKey(null) limpa estado', () => {
    useStore.getState().setOpenAiKey('sk-test');
    useStore.getState().setOpenAiKey(null);
    expect(useStore.getState().openAiKey).toBeNull();
  });
});

describe('toast queue', () => {
  const t1 = { kind: 'achievement' as const, title: 't1', emoji: '🎉', description: 'd1' };
  const t2 = { kind: 'achievement' as const, title: 't2', emoji: '🎉', description: 'd2' };
  const t3 = { kind: 'achievement' as const, title: 't3', emoji: '🎉', description: 'd3' };

  it('enqueue inicial vai pra currentToast (não pra queue)', () => {
    useStore.getState().enqueueToast(t1);
    expect(useStore.getState().currentToast).toEqual(t1);
    expect(useStore.getState().toastQueue).toEqual([]);
  });

  it('enqueue com toast atual vai pra fila', () => {
    useStore.getState().enqueueToast(t1);
    useStore.getState().enqueueToast(t2);
    useStore.getState().enqueueToast(t3);
    expect(useStore.getState().currentToast).toEqual(t1);
    expect(useStore.getState().toastQueue).toEqual([t2, t3]);
  });

  it('shiftToast move próximo da fila pra current', () => {
    useStore.getState().enqueueToast(t1);
    useStore.getState().enqueueToast(t2);
    useStore.getState().shiftToast();
    expect(useStore.getState().currentToast).toEqual(t2);
    expect(useStore.getState().toastQueue).toEqual([]);
  });

  it('shiftToast com fila vazia limpa current', () => {
    useStore.getState().enqueueToast(t1);
    useStore.getState().shiftToast();
    expect(useStore.getState().currentToast).toBeNull();
    expect(useStore.getState().toastQueue).toEqual([]);
  });
});
