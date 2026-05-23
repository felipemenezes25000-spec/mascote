/**
 * Tests do subscriber CreatureMomentService → Unity bridge.
 *
 * Garante que cada moment relevante vira o `UnityMascotEvent` correto e é
 * postado na ponte. Não exige Unity nativo — usa subscribe stub do bridge.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { creatureMoments } from '@/lib/moments';
import { unityMascotBridge } from '@/components/unity/UnityMascotBridge';
import type { RNToUnityMessage } from '@/components/unity/UnityMascotTypes';
import {
  _resetUnitySubscriberForTests,
  registerUnityMomentSubscriber,
} from '@/components/unity/unityMomentSubscriber';

describe('unityMomentSubscriber', () => {
  const posted: RNToUnityMessage[] = [];
  let postSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    posted.length = 0;
    creatureMoments.reset();
    _resetUnitySubscriberForTests();
    // Espia postToUnity pra capturar mensagens (não precisa rodar Unity)
    postSpy = vi.spyOn(unityMascotBridge, 'postToUnity').mockImplementation((msg) => {
      posted.push(msg);
    });
  });

  afterEach(() => {
    postSpy.mockRestore();
    _resetUnitySubscriberForTests();
    creatureMoments.reset();
  });

  it('é idempotente — registrar duas vezes não duplica handler', async () => {
    const unsub1 = registerUnityMomentSubscriber();
    const unsub2 = registerUnityMomentSubscriber();
    await creatureMoments.emitAndWait('habit.water', { intensity: 1 });
    expect(posted).toHaveLength(1);
    unsub1();
    unsub2();
  });

  it('habit.water → event.play kind:habit habit:water', async () => {
    const unsub = registerUnityMomentSubscriber();
    await creatureMoments.emitAndWait('habit.water', { intensity: 0.8 });
    expect(posted).toHaveLength(1);
    const msg = posted[0];
    expect(msg.type).toBe('event.play');
    if (msg.type === 'event.play') {
      expect(msg.event.kind).toBe('habit');
      if (msg.event.kind === 'habit') {
        expect(msg.event.habit).toBe('water');
        expect(msg.event.intensity).toBe(0.8);
      }
    }
    unsub();
  });

  it('habit.sleep → habit:sleep', async () => {
    const unsub = registerUnityMomentSubscriber();
    await creatureMoments.emitAndWait('habit.sleep', { intensity: 0.5, hoursLogged: 7 });
    const msg = posted[0];
    if (msg?.type === 'event.play' && msg.event.kind === 'habit') {
      expect(msg.event.habit).toBe('sleep');
    } else {
      throw new Error('expected habit event');
    }
    unsub();
  });

  it('checkin.completed → checkin.completed event com xpGained', async () => {
    const unsub = registerUnityMomentSubscriber();
    await creatureMoments.emitAndWait('checkin.completed', {
      habit: 'exercise',
      xpGained: 25,
    });
    const msg = posted[0];
    if (msg?.type === 'event.play' && msg.event.kind === 'checkin.completed') {
      expect(msg.event.habit).toBe('exercise');
      expect(msg.event.xpGained).toBe(25);
    } else {
      throw new Error('expected checkin.completed event');
    }
    unsub();
  });

  it('phase.advanced → phase.advanced com mapping PT→EN', async () => {
    const unsub = registerUnityMomentSubscriber();
    await creatureMoments.emitAndWait('phase.advanced', { from: 'ovo', to: 'bebe' });
    const msg = posted[0];
    if (msg?.type === 'event.play' && msg.event.kind === 'phase.advanced') {
      expect(msg.event.from).toBe('egg');
      expect(msg.event.to).toBe('baby');
    } else {
      throw new Error('expected phase.advanced event');
    }
    unsub();
  });

  it('mutation.unlocked → mutation.unlocked event preserva rarity', async () => {
    const unsub = registerUnityMomentSubscriber();
    await creatureMoments.emitAndWait('mutation.unlocked', {
      mutationId: 'aura_cosmic',
      rarity: 'legendary',
    });
    const msg = posted[0];
    if (msg?.type === 'event.play' && msg.event.kind === 'mutation.unlocked') {
      expect(msg.event.mutationId).toBe('aura_cosmic');
      expect(msg.event.rarity).toBe('legendary');
    } else {
      throw new Error('expected mutation.unlocked event');
    }
    unsub();
  });

  it('accessory.equipped → custom event', async () => {
    const unsub = registerUnityMomentSubscriber();
    await creatureMoments.emitAndWait('accessory.equipped', { accessoryId: 'wings_angel' });
    const msg = posted[0];
    if (msg?.type === 'event.play' && msg.event.kind === 'custom') {
      expect(msg.event.name).toBe('accessory.equipped');
      expect(msg.event.payload).toEqual({ accessoryId: 'wings_angel' });
    } else {
      throw new Error('expected custom event');
    }
    unsub();
  });

  it('streak.milestone → custom event com days+isFirst', async () => {
    const unsub = registerUnityMomentSubscriber();
    await creatureMoments.emitAndWait('streak.milestone', { days: 7, isFirst: true });
    const msg = posted[0];
    if (msg?.type === 'event.play' && msg.event.kind === 'custom') {
      expect(msg.event.payload).toEqual({ days: 7, isFirst: true });
    } else {
      throw new Error('expected custom event');
    }
    unsub();
  });

  it('moments puramente UI (chat.reply_received) não geram event.play', async () => {
    const unsub = registerUnityMomentSubscriber();
    await creatureMoments.emitAndWait('chat.reply_received', {
      source: 'openai',
      safety_flag: 'safe',
    });
    expect(posted).toHaveLength(0);
    unsub();
  });

  it('unsubscribe desliga o handler — moments depois não postam', async () => {
    const unsub = registerUnityMomentSubscriber();
    await creatureMoments.emitAndWait('habit.water', {});
    expect(posted).toHaveLength(1);
    unsub();
    await creatureMoments.emitAndWait('habit.water', {});
    expect(posted).toHaveLength(1); // não cresceu
  });

  it('phase.advanced com from/to inválidos cai pra "adult"', async () => {
    const unsub = registerUnityMomentSubscriber();
    await creatureMoments.emitAndWait('phase.advanced', { from: 'lixo', to: 'mais lixo' });
    const msg = posted[0];
    if (msg?.type === 'event.play' && msg.event.kind === 'phase.advanced') {
      expect(msg.event.from).toBe('adult');
      expect(msg.event.to).toBe('adult');
    }
    unsub();
  });
});
