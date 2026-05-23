/**
 * Hook — ciclo de vida da view Unity, sync throttled (10 Hz), eventos one-shot.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UnityMascotEvent, UnityMascotState, UnityToRNMessage } from './UnityMascotTypes';
import { unityMascotBridge } from './UnityMascotBridge';
import { sendEventPlay, sendStateUpdate } from './unityMessageMapper';
import { isUnityDebugPanelEnabled } from '@/core/mascot-render-contract/rendererConfig';

const THROTTLE_MS = 100; // 10 Hz

export interface UseUnityMascotOptions {
  state: UnityMascotState | null;
  simulateFailure?: boolean;
  onReady?: (version: string) => void;
  onError?: (code: string, message: string, recoverable: boolean) => void;
  onFallback?: () => void;
}

export interface UseUnityMascotResult {
  ready: boolean;
  version: string | null;
  lastError: string | null;
  lastMessage: string | null;
  pushState: (state: UnityMascotState) => void;
  playEvent: (event: UnityMascotEvent) => void;
  debugPanel: boolean;
}

export function useUnityMascot(options: UseUnityMascotOptions): UseUnityMascotResult {
  const { state, simulateFailure, onReady, onError, onFallback } = options;
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const fallbackCalled = useRef(false);
  const lastSentAt = useRef(0);
  const pendingState = useRef<UnityMascotState | null>(null);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPendingEventKey = useRef<string | null>(null);

  const flushState = useCallback(() => {
    if (!pendingState.current) return;
    sendStateUpdate(pendingState.current);
    pendingState.current = null;
    lastSentAt.current = Date.now();
  }, []);

  const pushStateThrottled = useCallback(
    (next: UnityMascotState) => {
      pendingState.current = next;
      const elapsed = Date.now() - lastSentAt.current;
      if (elapsed >= THROTTLE_MS) {
        flushState();
        return;
      }
      if (throttleTimer.current) return;
      throttleTimer.current = setTimeout(() => {
        throttleTimer.current = null;
        flushState();
      }, THROTTLE_MS - elapsed);
    },
    [flushState],
  );

  const handleMessage = useCallback(
    (msg: UnityToRNMessage) => {
      setLastMessage(msg.type);
      if (msg.type === 'ready') {
        setReady(true);
        setVersion(msg.version);
        onReady?.(msg.version);
      } else if (msg.type === 'error') {
        setLastError(msg.message);
        onError?.(msg.code, msg.message, msg.recoverable);
        if (msg.recoverable && !fallbackCalled.current) {
          fallbackCalled.current = true;
          onFallback?.();
        }
      }
    },
    [onReady, onError, onFallback],
  );

  useEffect(() => {
    const unsub = unityMascotBridge.subscribe(handleMessage);
    const stub = unityMascotBridge as {
      simulateReady?: (v?: string, d?: number) => void;
      simulateRecoverableError?: (d?: number) => void;
    };

    if (!unityMascotBridge.isNativeAvailable()) {
      if (simulateFailure) {
        stub.simulateRecoverableError?.(40);
      } else {
        stub.simulateReady?.('stub-0.2.0', 40);
      }
    }

    return () => {
      unsub();
      if (throttleTimer.current) clearTimeout(throttleTimer.current);
    };
  }, [handleMessage, simulateFailure]);

  useEffect(() => {
    if (state && ready) {
      pushStateThrottled(state);

      const pe = state.pendingEvent;
      if (pe) {
        const key = JSON.stringify(pe);
        if (key !== lastPendingEventKey.current) {
          lastPendingEventKey.current = key;
          sendEventPlay(pe);
        }
      }
    }
  }, [state, ready, pushStateThrottled]);

  const pushState = useCallback((next: UnityMascotState) => {
    pushStateThrottled(next);
  }, [pushStateThrottled]);

  const playEvent = useCallback((event: UnityMascotEvent) => {
    sendEventPlay(event);
  }, []);

  return {
    ready,
    version,
    lastError,
    lastMessage,
    pushState,
    playEvent,
    debugPanel: isUnityDebugPanelEnabled(),
  };
}
