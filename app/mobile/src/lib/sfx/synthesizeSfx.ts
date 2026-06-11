/**
 * Sintetiza jingles de recompensa como WAV PCM 16-bit mono 22050Hz.
 *
 * Espelha `src/lib/voice/synthesizeWav.ts` — o encoder WAV é duplicado de
 * propósito (encodeWavBase64 é privado no módulo de voz; import cruzado
 * criaria acoplamento entre dois domínios independentes).
 *
 * Tudo aqui é puro/determinístico: mesmo kind → mesmos bytes sempre
 * (sem Date.now, sem Math.random) — cacheável e testável byte a byte.
 */

import type { SfxKind, SfxNote } from './types';

export const SFX_SAMPLE_RATE = 22_050;
/** Pico máximo absoluto dos samples (e do gain no Web Audio). Nunca acima. */
export const SFX_VOLUME_CAP = 0.18;
/** Nenhum jingle passa disso — recompensa é pontuação, não trilha sonora. */
export const SFX_MAX_DURATION_S = 1.2;

export const SFX_KINDS = ['coin', 'chest', 'fanfare', 'title', 'evolve', 'night'] as const;

/** Guard de runtime — call-sites dinâmicos não derrubam o player. */
export function isSfxKind(v: unknown): v is SfxKind {
  return typeof v === 'string' && (SFX_KINDS as readonly string[]).includes(v);
}

// ============================================================================
// Partituras — frequências em Hz (notas da escala temperada)
// ============================================================================
// Referências: C5 523.25 · E5 659.25 · G5 783.99 · C6 1046.50
//              E6 1318.51 · B6 1975.53 · C7 2093.00 · E7 2637.02
//              C3 130.81 · C4 261.63 · G4 392.00 · A5 880.00

const SCORES: Record<SfxKind, readonly SfxNote[]> = {
  // Ding de moedinha: E6 → B6, ~0.25s. Curto e cristalino, sem peso.
  coin: [
    { freq: 1318.51, at: 0, dur: 0.12, vol: 0.9, type: 'sine' },
    { freq: 1975.53, at: 0.08, dur: 0.17, vol: 1.0, type: 'sine' },
  ],
  // Baú: acorde maior ascendente (C5-E5-G5) + shimmer agudo trêmulo, ~0.8s.
  chest: [
    { freq: 523.25, at: 0, dur: 0.45, vol: 0.8, type: 'triangle' },
    { freq: 659.25, at: 0.1, dur: 0.45, vol: 0.8, type: 'triangle' },
    { freq: 783.99, at: 0.2, dur: 0.5, vol: 0.85, type: 'triangle' },
    { freq: 2093.0, at: 0.35, dur: 0.25, vol: 0.35, type: 'sine', vibrato: 0.6 },
    { freq: 2637.02, at: 0.45, dur: 0.3, vol: 0.3, type: 'sine', vibrato: 0.6 },
  ],
  // Fanfarra: arpejo maior C5-E5-G5-C6, a última nota respira mais, ~1.0s.
  fanfare: [
    { freq: 523.25, at: 0, dur: 0.28, vol: 0.85, type: 'triangle' },
    { freq: 659.25, at: 0.16, dur: 0.28, vol: 0.85, type: 'triangle' },
    { freq: 783.99, at: 0.32, dur: 0.28, vol: 0.9, type: 'triangle' },
    { freq: 1046.5, at: 0.48, dur: 0.5, vol: 1.0, type: 'triangle' },
  ],
  // Título de mundo: fanfarra mais larga ancorada num C3 grave de fundo, ~1.2s.
  title: [
    { freq: 130.81, at: 0, dur: 1.15, vol: 0.5, type: 'sine', attack: 0.04 },
    { freq: 523.25, at: 0, dur: 0.3, vol: 0.8, type: 'triangle' },
    { freq: 659.25, at: 0.18, dur: 0.3, vol: 0.8, type: 'triangle' },
    { freq: 783.99, at: 0.36, dur: 0.3, vol: 0.85, type: 'triangle' },
    { freq: 1046.5, at: 0.54, dur: 0.6, vol: 1.0, type: 'triangle', vibrato: 0.3 },
  ],
  // Evolução: glissando suave G4 → A5 com vibrato + brilho no destino, ~1.0s.
  evolve: [
    { freq: 392.0, freqEnd: 880.0, at: 0, dur: 0.9, vol: 0.9, type: 'sine', vibrato: 0.5, attack: 0.05 },
    { freq: 880.0, at: 0.75, dur: 0.25, vol: 0.5, type: 'sine' },
  ],
  // Sino noturno: fundamental C4 + parcial inarmônico 2.4× (timbre de sino), ~0.8s.
  night: [
    { freq: 261.63, at: 0, dur: 0.8, vol: 0.9, type: 'sine', attack: 0.005 },
    { freq: 627.91, at: 0, dur: 0.5, vol: 0.35, type: 'sine', attack: 0.005 },
  ],
};

/** Partitura do kind — vazia pra kind inválido (caller decide o fallback). */
export function sfxScore(kind: SfxKind): readonly SfxNote[] {
  return SCORES[kind] ?? [];
}

// ============================================================================
// Render offline (backend nativo)
// ============================================================================

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/** Onda triangular em [-1, 1] a partir da fase em radianos. */
function triangleWave(phase: number): number {
  return (2 / Math.PI) * Math.asin(Math.sin(phase));
}

/** Nota com qualquer campo numérico inválido (NaN/Infinity) é descartada. */
function isPlayableNote(n: SfxNote): boolean {
  return (
    Number.isFinite(n.freq) && n.freq > 0 &&
    (n.freqEnd === undefined || (Number.isFinite(n.freqEnd) && n.freqEnd > 0)) &&
    Number.isFinite(n.at) && n.at >= 0 &&
    Number.isFinite(n.dur) && n.dur > 0 &&
    Number.isFinite(n.vol)
  );
}

/**
 * Renderiza a partitura em Float32Array mono. Envelope por nota: attack
 * linear curto → decay exponencial → release de 10ms anti-click. Vibrato
 * via acúmulo de fase sample a sample (idêntico em espírito ao LFO do web).
 * Pico final normalizado pra exatamente SFX_VOLUME_CAP — NADA estridente.
 */
export function synthesizeSfxSamples(kind: SfxKind): Float32Array {
  const score = (isSfxKind(kind) ? SCORES[kind] : []).filter(isPlayableNote);
  if (score.length === 0) {
    // Silêncio curto válido — kind inválido não explode nem gera WAV vazio.
    return new Float32Array(Math.ceil(0.05 * SFX_SAMPLE_RATE));
  }

  const endS = Math.min(
    SFX_MAX_DURATION_S,
    Math.max(...score.map(n => n.at + n.dur)) + 0.02,
  );
  const numSamples = Math.ceil(endS * SFX_SAMPLE_RATE);
  const samples = new Float32Array(numSamples);

  for (const note of score) {
    const f0 = note.freq;
    const f1 = note.freqEnd ?? f0;
    const dur = note.dur;
    const attack = Math.min(Math.max(note.attack ?? 0.01, 0.001), dur / 2);
    const vib = clamp01(note.vibrato ?? 0);
    const startSample = Math.floor(note.at * SFX_SAMPLE_RATE);
    const durSamples = Math.floor(dur * SFX_SAMPLE_RATE);
    // Decay calibrado pra terminar em ~2% do pico (suave, sem cauda infinita).
    const decayK = 3.9 / Math.max(0.01, dur - attack);

    let phase = 0;
    for (let i = 0; i < durSamples && startSample + i < numSamples; i++) {
      const t = i / SFX_SAMPLE_RATE;
      const baseFreq = f0 + (f1 - f0) * (t / dur);
      const freq = baseFreq * (1 + vib * 0.02 * Math.sin(2 * Math.PI * 5.5 * t));
      phase += (2 * Math.PI * freq) / SFX_SAMPLE_RATE;
      const raw = note.type === 'triangle' ? triangleWave(phase) : Math.sin(phase);
      const env = t < attack ? t / attack : Math.exp(-decayK * (t - attack));
      const tail = dur - t;
      const release = tail < 0.01 ? tail / 0.01 : 1;
      samples[startSample + i] += raw * env * release * note.vol;
    }
  }

  // Normaliza o pico pra exatamente o cap — acordes somados nunca passam.
  let peak = 0;
  for (let i = 0; i < numSamples; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  if (peak > 0) {
    const scale = SFX_VOLUME_CAP / peak;
    for (let i = 0; i < numSamples; i++) samples[i] *= scale;
  }

  return samples;
}

// ============================================================================
// Encoder WAV (duplicado conscientemente de voice/synthesizeWav.ts)
// ============================================================================

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
  view.setUint32(24, SFX_SAMPLE_RATE, true);
  view.setUint32(28, SFX_SAMPLE_RATE * 2, true);
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

/** Gera o WAV base64 de um jingle. Determinístico: mesmo kind → mesma string. */
export function synthesizeSfxWavBase64(kind: SfxKind): string {
  return encodeWavBase64(synthesizeSfxSamples(kind));
}
