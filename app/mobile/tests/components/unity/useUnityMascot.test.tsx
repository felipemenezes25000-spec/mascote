import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '../../helpers/renderHook';

vi.mock('@/components/unity/unityMessageMapper', () => ({
  sendStateUpdate: vi.fn(),
  sendEventPlay: vi.fn(),
}));

import { useUnityMascot } from '@/components/unity/useUnityMascot';
import { unityMascotBridge } from '@/components/unity/UnityMascotBridge';
import { buildUnityMascotState } from '@/core/mascot-render-contract';
import { mascotFixture } from '../../core/mascot-render-contract/fixtures';

describe('useUnityMascot', () => {
  it('fica ready em modo stub quando native indisponível', async () => {
    const state = buildUnityMascotState(mascotFixture('calmo'));
    const hook = renderHook(() => useUnityMascot({ state }));
    await waitFor(() => {
      expect(hook.result.current.ready).toBe(true);
      expect(hook.result.current.version).toBeTruthy();
    }, { timeout: 1200 });
    hook.unmount();
  });

  it('chama fallback em erro recuperável simulado', async () => {
    const onFallback = vi.fn();
    const state = buildUnityMascotState(mascotFixture('fofo'));
    const hook = renderHook(() => useUnityMascot({ state, simulateFailure: true, onFallback }));
    await waitFor(() => {
      expect(onFallback).toHaveBeenCalled();
      expect(hook.result.current.lastError).toBeTruthy();
    }, { timeout: 1200 });
    hook.unmount();
  });

  it('bridge mantém sequência monotônica crescente', () => {
    const a = unityMascotBridge.nextSeq();
    const b = unityMascotBridge.nextSeq();
    expect(b).toBeGreaterThan(a);
  });

  it('flush de pendências ACK ocorre no unmount', () => {
    const flushSpy = vi.spyOn(unityMascotBridge, 'flushPendingAcks');
    const state = buildUnityMascotState(mascotFixture('calmo'));
    const hook = renderHook(() => useUnityMascot({ state }));
    hook.unmount();
    expect(flushSpy).toHaveBeenCalled();
    flushSpy.mockRestore();
  });
});

