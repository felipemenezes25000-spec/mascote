/**
 * Sintetiza micro-vocalizações como WAV PCM 16-bit mono.
 * Usado pelo backend nativo (expo-av) — sem assets pre-gerados.
 */

import { modifiersForKind } from './profile';
import type { VoiceLine, VoiceProfile } from './types';

const SAMPLE_RATE = 22_050;
const VOLUME_CAP = 0.2;

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function encodeWavBase64(samples: Float32Array): string {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(bytes).toString('base64');
}

/** Gera WAV base64 para uma phrase vocal procedural. */
export function synthesizePhraseWavBase64(profile: VoiceProfile, line: VoiceLine): string {
  const mods = modifiersForKind(line.kind);
  const numNotes = Math.max(1, profile.syllables + mods.syllableDelta);
  const noteSpacing = profile.noteSpacing;
  const decay = profile.decay * mods.decayMult;
  const intensity = clamp01(line.emotion);
  const volume = VOLUME_CAP * (0.4 + intensity * 0.6);
  const oscType = profile.brightness > 0.55 ? 'saw' : 'sine';

  const totalDuration = (numNotes - 1) * noteSpacing + decay + 0.05;
  const numSamples = Math.ceil(totalDuration * SAMPLE_RATE);
  const samples = new Float32Array(numSamples);

  for (let n = 0; n < numNotes; n++) {
    const startSec = n * noteSpacing;
    const semitone = profile.scale[n % profile.scale.length];
    const freq = profile.baseFreq * Math.pow(2, semitone / 12) * mods.freqMult;
    const startSample = Math.floor(startSec * SAMPLE_RATE);
    const decaySamples = Math.floor(decay * SAMPLE_RATE);
    for (let i = 0; i < decaySamples && startSample + i < numSamples; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t / decay) * volume;
      const phase = 2 * Math.PI * freq * t;
      const sample =
        oscType === 'saw'
          ? (2 * ((phase / (2 * Math.PI)) % 1) - 1) * env
          : Math.sin(phase) * env;
      samples[startSample + i] += sample;
    }
  }

  return encodeWavBase64(samples);
}
