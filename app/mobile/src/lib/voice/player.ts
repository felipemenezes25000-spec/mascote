/**
 * Voice player — Web Audio API em web, no-op em nativo.
 *
 * Estratégia cross-platform:
 *  - **Web (RN-Web)**: usa `AudioContext` direto + OscillatorNode pra
 *    sintetizar tons em real-time. Sem assets pre-gerados.
 *  - **Native (iOS/Android)**: stub silencioso por padrão. Wire-up via
 *    `expo-av` é deferred (precisa testar em device + lidar com áudio
 *    permissions). Caller continua chamando o mesmo `playVoiceLine`;
 *    em native vira no-op gracioso.
 *
 * **Princípios**:
 *  - NUNCA crasha — qualquer falha em audio context vira no-op silencioso
 *  - Volume cap em 0.2 — voz é ambient
 *  - Auto-resume se context suspended (autoplay policy do browser)
 *  - Determinístico no test env — `setBackend(null)` força no-op
 */

import { modifiersForKind } from './profile';
import type { VoiceHandle, VoiceLine, VoiceProfile } from './types';

const VOLUME_CAP = 0.2;

/**
 * Backend de áudio — abstração testável. Caller produção usa `webBackend()`
 * em web. Testes injetam mock via `__setBackend`.
 */
export interface AudioBackend {
  /** Toca uma phrase. Retorna handle. */
  play(profile: VoiceProfile, line: VoiceLine): VoiceHandle;
  /** Libera recursos (close AudioContext, cancel timers). */
  dispose(): void;
}

let backend: AudioBackend | null = null;
let backendInitialized = false;

/**
 * Inicializa backend automaticamente baseado em platform.
 * Idempotente — re-chamadas no-op.
 */
function ensureBackend(): AudioBackend | null {
  if (backendInitialized) return backend;
  backendInitialized = true;
  // Web Audio detection — typeof window pra evitar crash em React Native
  // nativo (window não existe; AudioContext não existe).
  /* v8 ignore start — branch só em runtime real */
  if (typeof globalThis !== 'undefined') {
    const w = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (Ctor) {
      backend = createWebBackend(Ctor);
      return backend;
    }
  }
  /* v8 ignore stop */
  // Native ou env sem audio — backend null = no-op
  return null;
}

/**
 * Apenas pra TESTES — injeta backend mock ou null pra forçar no-op.
 */
export function __setBackend(b: AudioBackend | null): void {
  backend = b;
  backendInitialized = true;
}

/**
 * Reseta init flag — pra testes que querem re-detectar platform.
 */
export function __resetBackend(): void {
  backend?.dispose();
  backend = null;
  backendInitialized = false;
}

/**
 * Dispara a voz da criatura. NUNCA crasha — falhas viram no-op silencioso.
 * Caller pode aguardar `handle.done` se precisa sincronizar (raramente).
 */
export function playVoiceLine(profile: VoiceProfile, line: VoiceLine): VoiceHandle {
  const b = ensureBackend();
  if (!b) {
    // No-op handle — resolve imediatamente
    return {
      id: `voice-noop-${Date.now()}`,
      done: Promise.resolve(),
    };
  }
  return b.play(profile, line);
}

// ============================================================================
// Web Audio backend
// ============================================================================
/* v8 ignore start — testado via mock; backend real exige AudioContext browser */

function createWebBackend(Ctor: typeof AudioContext): AudioBackend {
  let ctx: AudioContext | null = null;
  // Set de timeouts em vôo. dispose() os cancela pra Promise.done não pendurar
  // após unmount da tela (player.dispose() chamava só ctx.close(), e o timer
  // continuava agendado, segurando microtask + ref ao resolve).
  const pendingTimers = new Set<ReturnType<typeof setTimeout>>();

  function getCtx(): AudioContext | null {
    if (!ctx) {
      try {
        ctx = new Ctor();
      } catch {
        return null;
      }
    }
    return ctx;
  }

  function play(profile: VoiceProfile, line: VoiceLine): VoiceHandle {
    const id = `voice-web-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const c = getCtx();
    if (!c) return { id, done: Promise.resolve() };

    // Resume se suspended (browser autoplay policy bloqueia até gesture)
    if (c.state === 'suspended') {
      c.resume().catch(() => undefined);
    }

    const mods = modifiersForKind(line.kind);
    const numNotes = Math.max(1, profile.syllables + mods.syllableDelta);
    const noteSpacing = profile.noteSpacing;
    const decay = profile.decay * mods.decayMult;
    const intensity = clamp01(line.emotion);
    const volume = VOLUME_CAP * (0.4 + intensity * 0.6);
    const now = c.currentTime;
    const oscType: OscillatorType = profile.brightness > 0.55 ? 'sawtooth' : 'sine';
    let endTime = now;
    for (let i = 0; i < numNotes; i++) {
      const t = now + i * noteSpacing;
      const semitone = profile.scale[i % profile.scale.length];
      const freq = profile.baseFreq * Math.pow(2, semitone / 12) * mods.freqMult;
      scheduleNote(c, oscType, freq, t, decay, volume, profile.vibrato);
      endTime = t + decay;
    }
    const done = new Promise<void>(resolve => {
      const ms = Math.max(50, (endTime - now) * 1000 + 20);
      const t = setTimeout(() => {
        pendingTimers.delete(t);
        resolve();
      }, ms);
      pendingTimers.add(t);
    });
    return { id, done };
  }

  function dispose(): void {
    // Cancela timers em vôo antes de fechar o ctx — caso contrário a Promise
    // fica pendurada esperando handle.done que nunca resolve.
    for (const t of pendingTimers) clearTimeout(t);
    pendingTimers.clear();
    if (ctx) {
      ctx.close().catch(() => undefined);
      ctx = null;
    }
  }

  return { play, dispose };
}

function scheduleNote(
  c: AudioContext,
  type: OscillatorType,
  freq: number,
  t: number,
  decay: number,
  volume: number,
  vibrato: number,
): void {
  try {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + decay + 0.05);

    // Vibrato via LFO modulando freq
    if (vibrato > 0.05) {
      const lfo = c.createOscillator();
      lfo.frequency.value = 5 + vibrato * 4; // 5-9 Hz, faixa "trêmula"
      const lfoGain = c.createGain();
      lfoGain.gain.value = freq * vibrato * 0.02; // ~2% da freq base
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + decay + 0.05);
    }
  } catch {
    // Falha silenciosa — audio context pode estar invalidado
  }
}

/* v8 ignore stop */

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
