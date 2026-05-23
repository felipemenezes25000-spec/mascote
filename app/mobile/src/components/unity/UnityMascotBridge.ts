/**
 * Ponte RN ↔ Unity (postMessage).
 *
 * Usa UnityMascotModule nativo quando disponível; fallback stub em dev.
 */

import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import type { RNToUnityMessage, UnityToRNMessage } from './UnityMascotTypes';

function parseUnityMessage(raw: string): UnityToRNMessage | null {
  try {
    const parsed = JSON.parse(raw) as UnityToRNMessage;
    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type UnityBridgeListener = (message: UnityToRNMessage) => void;

export interface UnityMascotBridge {
  postToUnity(message: RNToUnityMessage): void;
  subscribe(listener: UnityBridgeListener): () => void;
  isNativeAvailable(): boolean;
  nextSeq(): number;
}

interface NativeUnityModule {
  isAvailable?: () => Promise<boolean>;
  postMessage?: (json: string) => Promise<boolean>;
  getConstants?: () => { version?: string; embedded?: boolean };
}

const NativeUnity = NativeModules.UnityMascotModule as NativeUnityModule | undefined;

let seq = 0;
let nativeAvailable: boolean | null = null;

class UnityMascotBridgeImpl implements UnityMascotBridge {
  private listeners = new Set<UnityBridgeListener>();
  private nativeSub: { remove: () => void } | null = null;

  constructor() {
    if (Platform.OS === 'android' && NativeUnity) {
      void this.probeNative();
      this.nativeSub = DeviceEventEmitter.addListener(
        'UnityMascotMessage',
        (raw: string) => {
          const msg = parseUnityMessage(typeof raw === 'string' ? raw : JSON.stringify(raw));
          if (msg) this.emit(msg);
        },
      );
    }
  }

  private async probeNative(): Promise<void> {
    try {
      nativeAvailable = (await NativeUnity?.isAvailable?.()) ?? false;
    } catch {
      nativeAvailable = false;
    }
  }

  postToUnity(message: RNToUnityMessage): void {
    const json = JSON.stringify(message);
    if (this.isNativeAvailable() && NativeUnity?.postMessage) {
      void NativeUnity.postMessage(json).catch(() => {
        this.emitStubForward(message);
      });
      return;
    }
    this.emitStubForward(message);
  }

  private emitStubForward(message: RNToUnityMessage): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.debug('[UnityMascotBridge] →', message.type, 'seq' in message ? message.seq : '-');
    }
    void message;
  }

  subscribe(listener: UnityBridgeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isNativeAvailable(): boolean {
    if (Platform.OS !== 'android') return false;
    if (nativeAvailable === null) return !!NativeUnity?.postMessage;
    return nativeAvailable;
  }

  /** Simula ready após delay — usado quando embed não está ativo. */
  simulateReady(version = 'stub-0.2.0', delayMs = 50): void {
    setTimeout(() => {
      this.emit({
        type: 'ready',
        version,
        capabilities: ['state.update', 'event.play', 'gesture'],
      });
    }, delayMs);
  }

  simulateRecoverableError(delayMs = 30): void {
    setTimeout(() => {
      this.emit({
        type: 'error',
        code: 'UNITY_NOT_LOADED',
        message: 'Unity runtime not embedded — using fallback',
        recoverable: true,
      });
    }, delayMs);
  }

  nextSeq(): number {
    seq += 1;
    return seq;
  }

  private emit(msg: UnityToRNMessage): void {
    for (const l of this.listeners) {
      try {
        l(msg);
      } catch {
        // listener não deve quebrar o bus
      }
    }
  }
}

export const unityMascotBridge: UnityMascotBridge & {
  simulateReady?: (v?: string, d?: number) => void;
  simulateRecoverableError?: (d?: number) => void;
} = new UnityMascotBridgeImpl();
