/**
 * Serializa mensagens RN → Unity e parseia respostas.
 */

import type { RNToUnityMessage, UnityMascotEvent, UnityMascotState } from './UnityMascotTypes';
import { unityMascotBridge } from './UnityMascotBridge';

export {
  HABIT_REACTION_ANIM,
  buildHabitEventFromCheckin,
  habitToUnityEvent,
  parseUnityToRN,
} from './unityMessageCodec';

export function encodeRNToUnity(message: RNToUnityMessage): string {
  return JSON.stringify(message);
}

export function sendStateUpdate(state: UnityMascotState): void {
  unityMascotBridge.postToUnity({
    type: 'state.update',
    state,
    seq: unityMascotBridge.nextSeq(),
  });
}

export function sendEventPlay(event: UnityMascotEvent): void {
  unityMascotBridge.postToUnity({
    type: 'event.play',
    event,
    seq: unityMascotBridge.nextSeq(),
  });
}

export function sendGesture(gesture: 'pet' | 'tap' | 'poke'): void {
  unityMascotBridge.postToUnity({ type: 'gesture', gesture });
}
