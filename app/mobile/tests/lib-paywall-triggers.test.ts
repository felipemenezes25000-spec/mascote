/**
 * Testes pra paywall triggers — gatilhos éticos (mostrar paywall em momento
 * de alto valor, não em fragilidade).
 *
 * Invariantes críticos:
 * - Subscriber JAMAIS vê paywall.
 * - Cada trigger só dispara UMA vez (persistência via AsyncStorage).
 * - Ordem importa: mostra o "mais merecido" primeiro.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { copyFor, markShown, shouldTrigger, type PaywallTrigger } from '@/lib/paywall-triggers';
import type { Mascot, Streak } from '@/types';

function fakeMascot(level = 1, phase: Mascot['phase'] = 'ovo'): Mascot {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Bipo',
    personality: 'calmo',
    phase,
    mood: 'ok',
    xp: 0,
    level,
    energy: 80,
    health: 100,
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}
function fakeStreak(current = 0): Streak {
  return {
    user_id: 'u1',
    current_streak: current,
    longest_streak: current,
    last_active_date: null,
    grace_days_left: 2,
    updated_at: new Date().toISOString(),
  };
}

describe('shouldTrigger — paywall ético', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('subscriber NUNCA vê paywall (mesmo elegível)', async () => {
    const t = await shouldTrigger({
      mascot: fakeMascot(10, 'adulto'),
      streak: fakeStreak(30),
      totalCheckins: 100,
      boxOpenedCount: 10,
      hasSubscription: true,
    });
    expect(t).toBeNull();
  });

  it('first_evolution dispara após sair de ovo/bebe', async () => {
    const t = await shouldTrigger({
      mascot: fakeMascot(2, 'crianca'),
      streak: fakeStreak(0),
      totalCheckins: 0,
      boxOpenedCount: 0,
      hasSubscription: false,
    });
    expect(t).toBe('first_evolution');
  });

  it('ovo NÃO dispara first_evolution', async () => {
    const t = await shouldTrigger({
      mascot: fakeMascot(1, 'ovo'),
      streak: fakeStreak(0),
      totalCheckins: 0,
      boxOpenedCount: 0,
      hasSubscription: false,
    });
    expect(t).toBeNull();
  });

  it('bebe NÃO dispara first_evolution', async () => {
    const t = await shouldTrigger({
      mascot: fakeMascot(1, 'bebe'),
      streak: fakeStreak(0),
      totalCheckins: 0,
      boxOpenedCount: 0,
      hasSubscription: false,
    });
    expect(t).toBeNull();
  });

  it('streak_7 dispara quando current_streak >= 7', async () => {
    const t = await shouldTrigger({
      mascot: fakeMascot(1, 'ovo'),
      streak: fakeStreak(7),
      totalCheckins: 0,
      boxOpenedCount: 0,
      hasSubscription: false,
    });
    expect(t).toBe('streak_7');
  });

  it('level_5 dispara só se outros antes não dispararam', async () => {
    const t = await shouldTrigger({
      mascot: fakeMascot(5, 'ovo'),
      streak: fakeStreak(0),
      totalCheckins: 0,
      boxOpenedCount: 0,
      hasSubscription: false,
    });
    expect(t).toBe('level_5');
  });

  it('checkin_30 dispara em 30 check-ins', async () => {
    const t = await shouldTrigger({
      mascot: fakeMascot(1, 'ovo'),
      streak: fakeStreak(0),
      totalCheckins: 30,
      boxOpenedCount: 0,
      hasSubscription: false,
    });
    expect(t).toBe('checkin_30');
  });

  it('first_box_opened dispara após 3 caixas', async () => {
    const t = await shouldTrigger({
      mascot: fakeMascot(1, 'ovo'),
      streak: fakeStreak(0),
      totalCheckins: 0,
      boxOpenedCount: 3,
      hasSubscription: false,
    });
    expect(t).toBe('first_box_opened');
  });

  it('ordem: first_evolution > streak_7 > level_5 > checkin_30 > first_box_opened', async () => {
    // Tudo elegível ao mesmo tempo → escolhe o primeiro da lista
    const t = await shouldTrigger({
      mascot: fakeMascot(5, 'crianca'),
      streak: fakeStreak(7),
      totalCheckins: 30,
      boxOpenedCount: 3,
      hasSubscription: false,
    });
    expect(t).toBe('first_evolution');
  });

  it('trigger já visto NÃO dispara de novo', async () => {
    await markShown('streak_7');
    const t = await shouldTrigger({
      mascot: fakeMascot(1, 'ovo'),
      streak: fakeStreak(7),
      totalCheckins: 0,
      boxOpenedCount: 0,
      hasSubscription: false,
    });
    expect(t).toBeNull();
  });

  it('só pula triggers já vistos, próximo da fila dispara', async () => {
    await markShown('streak_7');
    const t = await shouldTrigger({
      mascot: fakeMascot(5, 'ovo'),
      streak: fakeStreak(7),
      totalCheckins: 0,
      boxOpenedCount: 0,
      hasSubscription: false,
    });
    expect(t).toBe('level_5');
  });

  it('todos vistos → null', async () => {
    const all: PaywallTrigger[] = ['first_evolution', 'streak_7', 'level_5', 'checkin_30', 'first_box_opened'];
    for (const t of all) await markShown(t);
    const t = await shouldTrigger({
      mascot: fakeMascot(10, 'adulto'),
      streak: fakeStreak(30),
      totalCheckins: 100,
      boxOpenedCount: 10,
      hasSubscription: false,
    });
    expect(t).toBeNull();
  });
});

describe('markShown persiste no AsyncStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('grava chave paywall_shown:{trigger}', async () => {
    await markShown('streak_7');
    const raw = await AsyncStorage.getItem('paywall_shown:streak_7');
    expect(raw).toBeTruthy();
    expect(() => new Date(raw!)).not.toThrow();
  });
});

describe('copyFor — cópias por trigger', () => {
  const triggers: PaywallTrigger[] = [
    'first_evolution',
    'streak_7',
    'level_5',
    'checkin_30',
    'first_box_opened',
  ];

  it.each(triggers)('"%s" retorna title + body não-vazios', t => {
    const c = copyFor(t, 'Bipo');
    expect(c.title.length).toBeGreaterThan(0);
    expect(c.body.length).toBeGreaterThan(0);
  });

  it('first_evolution e level_5 mencionam o nome do mascote', () => {
    expect(copyFor('first_evolution', 'TestPet').title).toContain('TestPet');
    expect(copyFor('level_5', 'Lulu').title).toContain('Lulu');
  });

  it('NÃO contém linguagem clínica ou de FOMO agressivo', () => {
    for (const t of triggers) {
      const c = copyFor(t, 'Bipo');
      const both = `${c.title} ${c.body}`.toLowerCase();
      expect(both).not.toMatch(/depress|ansiedade|trauma|terapia|TDAH/i);
      expect(both).not.toMatch(/última chance|agora ou nunca|você vai perder/);
    }
  });
});
