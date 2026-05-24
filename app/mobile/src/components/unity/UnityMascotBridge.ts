/**
 * Ponte RN ↔ Unity (postMessage).
 *
 * Usa UnityMascotModule nativo quando disponível; fallback stub em dev.
 */

import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import type { RNToUnityMessage, UnityToRNMessage } from './UnityMascotTypes';
import { validateUnityMascotState } from '@/core/mascot-render-contract';

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
  isNativeEmbedded(): boolean;
  nextSeq(): number;
  getLastOutboundSeq(): number;
  getAckStats(): UnityAckStats;
  flushPendingAcks(): void;
}

interface NativeUnityModule {
  isAvailable?: () => Promise<boolean>;
  postMessage?: (json: string) => Promise<boolean>;
  getConstants?: () => { version?: string; embedded?: boolean };
}

const NativeUnity = NativeModules.UnityMascotModule as NativeUnityModule | undefined;

let seq = 0;
let nativeAvailable: boolean | null = null;
let nativeEmbedded: boolean | null = null;
const EXPECTED_UNITY_SCHEMA_VERSION = 1;
const ACK_TIMEOUT_MS = 250;
const ACK_MAX_RETRIES = 2;

interface PendingAck {
  seq: number;
  message: RNToUnityMessage;
  retries: number;
  timer: ReturnType<typeof setTimeout> | null;
  lastSentAt: number;
}

export interface UnityAckStats {
  lastAckSeq: number | null;
  lastAckLatencyMs: number | null;
  retryCount: number;
  timeoutCount: number;
}

function readNativeConstants(): { version?: string; embedded?: boolean } | undefined {
  try {
    return NativeUnity?.getConstants?.();
  } catch {
    return undefined;
  }
}

class UnityMascotBridgeImpl implements UnityMascotBridge {
  private listeners = new Set<UnityBridgeListener>();
  private nativeSub: { remove: () => void } | null = null;
  private lastOutboundSeq = 0;
  private pendingAcks = new Map<number, PendingAck>();
  private ackStats: UnityAckStats = {
    lastAckSeq: null,
    lastAckLatencyMs: null,
    retryCount: 0,
    timeoutCount: 0,
  };

  constructor() {
    if (Platform.OS === 'android' && NativeUnity) {
      void this.probeNative();
      this.nativeSub = DeviceEventEmitter.addListener(
        'UnityMascotMessage',
        (raw: string) => {
          const msg = parseUnityMessage(typeof raw === 'string' ? raw : JSON.stringify(raw));
          if (msg?.type === 'ack') {
            this.handleAck(msg.seq);
          }
          if (msg) this.emit(msg);
        },
      );
    }
  }

  private async probeNative(): Promise<void> {
    try {
      const constants = readNativeConstants();
      nativeEmbedded = constants?.embedded === true;
      nativeAvailable = (await NativeUnity?.isAvailable?.()) ?? nativeEmbedded ?? false;
    } catch {
      nativeAvailable = false;
      nativeEmbedded = false;
    }
  }

  postToUnity(message: RNToUnityMessage): void {
    const prepared = this.withMonotonicSeq(message);
    if (!prepared) return;
    if (!this.isOutboundMessageValid(prepared)) return;
    this.deliver(prepared, false);
  }

  private withMonotonicSeq(message: RNToUnityMessage): RNToUnityMessage | null {
    if (message.type !== 'state.update' && message.type !== 'event.play') return message;
    const seqCandidate = typeof message.seq === 'number' ? message.seq : this.nextSeq();
    if (!Number.isInteger(seqCandidate) || seqCandidate <= 0) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[UnityMascotBridge] outbound dropped: invalid seq', seqCandidate);
      }
      return null;
    }
    if (seqCandidate <= this.lastOutboundSeq) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          `[UnityMascotBridge] outbound dropped: non-monotonic seq ${seqCandidate} <= ${this.lastOutboundSeq}`,
        );
      }
      return null;
    }
    this.lastOutboundSeq = seqCandidate;
    return { ...message, seq: seqCandidate };
  }

  private isOutboundMessageValid(message: RNToUnityMessage): boolean {
    if (message.type !== 'state.update') return true;
    const validated = validateUnityMascotState(message.state);
    if (!validated.ok) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          '[UnityMascotBridge] state.update dropped: invalid UnityMascotState',
          validated.issues.map(issue => `${issue.path}: ${issue.message}`).join('; '),
        );
      }
      return false;
    }
    if (message.state.schemaVersion !== EXPECTED_UNITY_SCHEMA_VERSION) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          `[UnityMascotBridge] state.update dropped: schemaVersion ${message.state.schemaVersion} != ${EXPECTED_UNITY_SCHEMA_VERSION}`,
        );
      }
      return false;
    }
    return true;
  }

  private emitStubForward(message: RNToUnityMessage): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.debug('[UnityMascotBridge] →', message.type, 'seq' in message ? message.seq : '-');
    }
    void message;
  }

  private shouldTrackAck(message: RNToUnityMessage): message is RNToUnityMessage & { seq: number } {
    return (
      (message.type === 'state.update' || message.type === 'event.play') &&
      typeof message.seq === 'number' &&
      Number.isInteger(message.seq) &&
      message.seq > 0
    );
  }

  private deliver(message: RNToUnityMessage, isRetry: boolean): void {
    const json = JSON.stringify(message);
    const trackAck = this.shouldTrackAck(message);
    if (!isRetry && trackAck) {
      this.registerPendingAck(message);
    }
    if (trackAck) {
      this.armAckTimer(message.seq);
    }

    if (this.isNativeAvailable() && NativeUnity?.postMessage) {
      void NativeUnity.postMessage(json).catch(() => {
        if (trackAck) {
          this.clearPendingAck(message.seq);
        }
        this.emit({
          type: 'error',
          code: 'UNITY_BRIDGE_POST_FAILED',
          message: 'Falha ao enviar mensagem para Unity; fallback bridge ativo.',
          recoverable: true,
        });
        this.emitStubForward(message);
      });
      return;
    }
    this.emitStubForward(message);
  }

  private registerPendingAck(message: RNToUnityMessage & { seq: number }): void {
    this.clearPendingAck(message.seq);
    this.pendingAcks.set(message.seq, {
      seq: message.seq,
      message,
      retries: 0,
      timer: null,
      lastSentAt: Date.now(),
    });
  }

  private armAckTimer(seqId: number): void {
    const pending = this.pendingAcks.get(seqId);
    if (!pending) return;
    if (pending.timer) clearTimeout(pending.timer);
    pending.lastSentAt = Date.now();
    pending.timer = setTimeout(() => {
      this.onAckTimeout(seqId);
    }, ACK_TIMEOUT_MS);
  }

  private onAckTimeout(seqId: number): void {
    const pending = this.pendingAcks.get(seqId);
    if (!pending) return;
    if (pending.retries >= ACK_MAX_RETRIES) {
      this.ackStats.timeoutCount += 1;
      this.clearPendingAck(seqId);
      this.emit({
        type: 'error',
        code: 'UNITY_ACK_TIMEOUT',
        message: `Sem ACK da Unity para seq ${seqId} após retries`,
        recoverable: true,
      });
      return;
    }
    pending.retries += 1;
    this.ackStats.retryCount += 1;
    const retryDelay = ACK_TIMEOUT_MS * pending.retries;
    pending.timer = setTimeout(() => {
      this.deliver(pending.message, true);
    }, retryDelay);
  }

  private handleAck(seqId: number): void {
    const pending = this.pendingAcks.get(seqId);
    if (pending) {
      this.ackStats.lastAckSeq = seqId;
      this.ackStats.lastAckLatencyMs = Math.max(0, Date.now() - pending.lastSentAt);
    }
    this.clearPendingAck(seqId);
  }

  private clearPendingAck(seqId: number): void {
    const pending = this.pendingAcks.get(seqId);
    if (!pending) return;
    if (pending.timer) clearTimeout(pending.timer);
    this.pendingAcks.delete(seqId);
  }

  subscribe(listener: UnityBridgeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isNativeAvailable(): boolean {
    if (Platform.OS !== 'android') return false;
    if (nativeEmbedded === true) return true;
    if (nativeAvailable === null) {
      const constants = readNativeConstants();
      if (constants?.embedded === true) return true;
      return !!NativeUnity?.postMessage;
    }
    return nativeAvailable;
  }

  isNativeEmbedded(): boolean {
    if (Platform.OS !== 'android') return false;
    if (nativeEmbedded !== null) return nativeEmbedded;
    return readNativeConstants()?.embedded === true;
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

  getLastOutboundSeq(): number {
    return this.lastOutboundSeq;
  }

  getAckStats(): UnityAckStats {
    return { ...this.ackStats };
  }

  flushPendingAcks(): void {
    for (const seqId of Array.from(this.pendingAcks.keys())) {
      this.clearPendingAck(seqId);
    }
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
