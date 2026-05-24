import { describe, expect, it } from 'vitest';
import {
  HABIT_REACTION_ANIM,
  parseUnityToRN,
  habitToUnityEvent,
} from '@/components/unity/unityMessageCodec';
import { buildMomentPendingEvent } from '@/core/mascot-render-contract';

describe('unityMessageCodec', () => {
  it('parseUnityToRN aceita ready', () => {
    const msg = parseUnityToRN(JSON.stringify({ type: 'ready', version: '1.0' }));
    expect(msg?.type).toBe('ready');
  });

  it('parseUnityToRN rejeita JSON inválido', () => {
    expect(parseUnityToRN('not-json')).toBeNull();
  });

  it('parseUnityToRN rejeita payload ready sem version', () => {
    expect(parseUnityToRN(JSON.stringify({ type: 'ready' }))).toBeNull();
  });

  it('parseUnityToRN rejeita tipo desconhecido', () => {
    expect(parseUnityToRN(JSON.stringify({ type: 'something.else' }))).toBeNull();
  });

  it('habit reactions cobrem hábitos principais', () => {
    expect(HABIT_REACTION_ANIM.water).toBe('observe');
    expect(HABIT_REACTION_ANIM.exercise).toBe('stretch');
    expect(HABIT_REACTION_ANIM.sun).toBe('smile');
  });

  it('habitToUnityEvent monta evento habit', () => {
    expect(habitToUnityEvent('sleep').kind).toBe('habit');
  });
});

describe('buildMomentPendingEvent', () => {
  it('checkin completed com xp', () => {
    const ev = buildMomentPendingEvent({ habitKind: 'water', xpGained: 10 });
    expect(ev?.kind).toBe('checkin.completed');
  });

  it('phase advanced', () => {
    const ev = buildMomentPendingEvent({ phaseFrom: 'bebe', phaseTo: 'crianca' });
    expect(ev?.kind).toBe('phase.advanced');
  });
});
