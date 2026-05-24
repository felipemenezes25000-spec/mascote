import { describe, expect, it, vi } from 'vitest';
import { unityMascotBridge } from '@/components/unity/UnityMascotBridge';
import { buildUnityMascotState } from '@/core/mascot-render-contract';
import { mascotFixture } from '../../core/mascot-render-contract/fixtures';

describe('UnityMascotBridge contract hardening', () => {
  it('limpa pendências de ACK sem lançar erro', () => {
    expect(() => unityMascotBridge.flushPendingAcks()).not.toThrow();
  });

  it('bloqueia state.update com schemaVersion invalido', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const validState = buildUnityMascotState(mascotFixture('calmo'));
    const invalidState = { ...validState, schemaVersion: 2 as 1 };

    unityMascotBridge.postToUnity({
      type: 'state.update',
      state: invalidState,
      seq: 1,
    });

    expect(warnSpy).toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it('permite state.update valido no fallback stub', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const validState = buildUnityMascotState(mascotFixture('fofo'));

    unityMascotBridge.postToUnity({
      type: 'state.update',
      state: validState,
      seq: 2,
    });

    expect(debugSpy).toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  it('monotonic seq avança via nextSeq', () => {
    const a = unityMascotBridge.nextSeq();
    const b = unityMascotBridge.nextSeq();
    expect(b).toBeGreaterThan(a);
  });

  it('rejeita seq não-monotônico em postToUnity', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const validState = buildUnityMascotState(mascotFixture('calmo'));
    const current = unityMascotBridge.getLastOutboundSeq();

    unityMascotBridge.postToUnity({
      type: 'state.update',
      state: validState,
      seq: current,
    });

    expect(warnSpy).toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it('expõe erro recoverable quando ACK não chega após retries', async () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsub = unityMascotBridge.subscribe(listener);
    const validState = buildUnityMascotState(mascotFixture('calmo'));
    const seq = unityMascotBridge.nextSeq();

    unityMascotBridge.postToUnity({
      type: 'state.update',
      state: validState,
      seq,
    });

    await vi.advanceTimersByTimeAsync(1700);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        code: 'UNITY_ACK_TIMEOUT',
        recoverable: true,
      }),
    );

    unsub();
    unityMascotBridge.flushPendingAcks();
    vi.useRealTimers();
  });

  it('expõe métricas de ACK para painel debug', async () => {
    vi.useFakeTimers();
    const validState = buildUnityMascotState(mascotFixture('calmo'));
    const seq = unityMascotBridge.nextSeq();

    unityMascotBridge.postToUnity({
      type: 'state.update',
      state: validState,
      seq,
    });

    await vi.advanceTimersByTimeAsync(1300);
    const stats = unityMascotBridge.getAckStats();
    expect(stats.retryCount).toBeGreaterThan(0);
    expect(stats.timeoutCount).toBeGreaterThan(0);
    expect(stats.lastAckSeq).toBeNull();

    unityMascotBridge.flushPendingAcks();
    vi.useRealTimers();
  });

  it('reenvia mensagens concorrentes sem ACK (seq distintos)', async () => {
    vi.useFakeTimers();
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const stateA = buildUnityMascotState(mascotFixture('calmo'));
    const stateB = buildUnityMascotState(mascotFixture('fofo'));

    unityMascotBridge.postToUnity({
      type: 'state.update',
      state: stateA,
      seq: unityMascotBridge.nextSeq(),
    });
    unityMascotBridge.postToUnity({
      type: 'state.update',
      state: stateB,
      seq: unityMascotBridge.nextSeq(),
    });

    await vi.advanceTimersByTimeAsync(1300);
    expect(debugSpy).toHaveBeenCalled();
    expect(debugSpy.mock.calls.length).toBeGreaterThanOrEqual(6);

    unityMascotBridge.flushPendingAcks();
    debugSpy.mockRestore();
    vi.useRealTimers();
  });
});
