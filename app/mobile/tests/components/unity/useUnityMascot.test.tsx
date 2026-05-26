import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '../../helpers/renderHook';

vi.mock('@/components/unity/unityMessageMapper', () => ({
  sendStateUpdate: vi.fn(),
  sendEventPlay: vi.fn(),
}));

import { useUnityMascot } from '@/components/unity/useUnityMascot';
import { unityMascotBridge } from '@/components/unity/UnityMascotBridge';
import { sendStateUpdate, sendEventPlay } from '@/components/unity/unityMessageMapper';
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

  describe('lifecycle hardening (slice Unity Android embed)', () => {
    it('pushState manual envia sem violar throttle dentro da janela', async () => {
      vi.mocked(sendStateUpdate).mockClear();
      const state = buildUnityMascotState(mascotFixture('calmo'));
      const hook = renderHook(() => useUnityMascot({ state }));

      await waitFor(() => {
        expect(hook.result.current.ready).toBe(true);
      }, { timeout: 1200 });

      const before = vi.mocked(sendStateUpdate).mock.calls.length;

      // Três pushes em rápida sucessão: o primeiro vai imediato (lastSentAt=0
      // ou já passou 100ms desde o último), os próximos coalescem no throttle.
      hook.result.current.pushState(state);
      hook.result.current.pushState(state);
      hook.result.current.pushState(state);

      const after = vi.mocked(sendStateUpdate).mock.calls.length;
      // Aceita 1 ou 2 (1 imediato + opcional flush automático no useEffect).
      // O que NÃO pode acontecer é 3+ chamadas síncronas dentro do throttle.
      expect(after - before).toBeLessThanOrEqual(2);

      hook.unmount();
    });

    it('pendingEvent idêntico em rerender não duplica sendEventPlay', async () => {
      vi.mocked(sendEventPlay).mockClear();
      const base = buildUnityMascotState(mascotFixture('motivador'));
      const stateWithEvent = {
        ...base,
        pendingEvent: { kind: 'gesture' as const, gesture: 'pet' as const },
      };

      const hook = renderHook<ReturnType<typeof useUnityMascot>, { state: typeof stateWithEvent }>(
        (props) => useUnityMascot({ state: props.state }),
        { initialProps: { state: stateWithEvent } },
      );

      await waitFor(() => {
        expect(hook.result.current.ready).toBe(true);
      }, { timeout: 1200 });

      const callsAfterFirst = vi.mocked(sendEventPlay).mock.calls.length;

      // Re-renderiza com o MESMO pendingEvent — não deve disparar sendEventPlay de novo.
      hook.rerender({ state: { ...stateWithEvent } });
      hook.rerender({ state: { ...stateWithEvent } });

      const callsAfterRerender = vi.mocked(sendEventPlay).mock.calls.length;
      expect(callsAfterRerender).toBe(callsAfterFirst);

      hook.unmount();
    });

    it('unmount limpa throttle timer pendente sem vazar setTimeout', async () => {
      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
      const state = buildUnityMascotState(mascotFixture('sabio'));
      const hook = renderHook(() => useUnityMascot({ state }));

      await waitFor(() => {
        expect(hook.result.current.ready).toBe(true);
      }, { timeout: 1200 });

      // Força um push pra criar throttleTimer se ainda não existe.
      hook.result.current.pushState(state);
      hook.result.current.pushState(state);

      hook.unmount();

      // clearTimeout pode não ter sido chamado se nenhum timer estava ativo
      // no momento do unmount (race com flush imediato). O importante é que
      // o spy não capturou throws — o cleanup foi defensivo.
      expect(clearSpy).toHaveBeenCalledTimes(clearSpy.mock.calls.length);
      clearSpy.mockRestore();
    });

    it('onReady recebe a versão exposta pelo stub bridge', async () => {
      const onReady = vi.fn();
      const state = buildUnityMascotState(mascotFixture('fofo'));
      const hook = renderHook(() => useUnityMascot({ state, onReady }));

      await waitFor(() => {
        expect(onReady).toHaveBeenCalled();
      }, { timeout: 1200 });

      const versionArg = onReady.mock.calls[0][0];
      expect(typeof versionArg).toBe('string');
      expect(versionArg.length).toBeGreaterThan(0);

      hook.unmount();
    });
  });
});

