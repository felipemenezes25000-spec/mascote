/**
 * SFX player — Web Audio em web, expo-av WAV sintetizado em nativo.
 *
 * Mesma estratégia cross-platform do voice player (`src/lib/voice/player.ts`):
 *  - **Web (RN-Web)**: AudioContext + OscillatorNode/GainNode agendados.
 *  - **Native (iOS/Android)**: WAV procedural (synthesizeSfx) + expo-av.
 *  - **Fallback**: no-op silencioso (simulador sem áudio, testes em node).
 *
 * **Gate de habilitação** (documentado — escolha consciente):
 *  - Flag global module-level (`setSfxEnabled`), default true. É best-effort:
 *    não há hydration no boot do app (não tocamos em app/_layout.tsx), então
 *    a tela de settings sincroniza o flag ao carregar/alterar o toggle.
 *  - Call-sites que JÁ têm o settings em mãos (hooks da Home, minigames)
 *    passam o override `{ enabled: settings?.sfx_enabled !== false }` por
 *    chamada — esses respeitam a preferência mesmo sem o flag hidratado.
 */

import { Platform } from 'react-native';
import {
  SFX_VOLUME_CAP,
  isSfxKind,
  sfxScore,
  synthesizeSfxWavBase64,
} from './synthesizeSfx';
import type { SfxKind, SfxNote } from './types';

/**
 * Backend de áudio — abstração testável. Produção usa Web Audio (web) ou
 * expo-av (nativo); testes injetam mock via `__setSfxBackend`.
 */
export interface SfxBackend {
  /** Toca um jingle one-shot. Nunca em loop. */
  play(kind: SfxKind): void;
  /** Libera recursos (close AudioContext). */
  dispose(): void;
}

let backend: SfxBackend | null = null;
let backendInitialized = false;
/** Gate global best-effort — settings screen sincroniza (toggle + load). */
let sfxEnabled = true;

/** Liga/desliga sons de recompensa globalmente (preferência do usuário). */
export function setSfxEnabled(value: boolean): void {
  sfxEnabled = value !== false;
}

/**
 * Inicializa backend automaticamente baseado em platform.
 * Idempotente — re-chamadas no-op.
 */
function ensureBackend(): SfxBackend | null {
  if (backendInitialized) return backend;
  backendInitialized = true;
  // Web Audio detection — typeof guard pra não crashar em RN nativo
  // (AudioContext não existe lá).
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
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    backend = createNativeBackend();
    return backend;
  }
  return null;
}

/**
 * Apenas pra TESTES — injeta backend mock ou null pra forçar no-op.
 */
export function __setSfxBackend(b: SfxBackend | null): void {
  backend = b;
  backendInitialized = true;
}

/**
 * Reseta init flag — pra testes que querem re-detectar platform.
 */
export function __resetSfxBackend(): void {
  backend?.dispose();
  backend = null;
  backendInitialized = false;
}

/**
 * Dispara um jingle de recompensa. NUNCA crasha — falha vira no-op.
 *
 * @param kind  qual jingle (guard de runtime: kind inválido = no-op).
 * @param opts.enabled  override por chamada: call-sites com settings em mãos
 *   passam `settings?.sfx_enabled !== false`; sem override vale o gate global.
 */
export function playSfx(kind: SfxKind, opts?: { enabled?: boolean }): void {
  try {
    if (!isSfxKind(kind)) return;
    const enabled = opts?.enabled ?? sfxEnabled;
    if (!enabled) return;
    const b = ensureBackend();
    if (!b) return;
    b.play(kind);
  } catch {
    // Silencioso — som de recompensa jamais quebra o fluxo de celebração.
  }
}

// ============================================================================
// Native backend (expo-av + WAV sintetizado)
// ============================================================================
/* v8 ignore start — requer runtime nativo + expo-av */

/** WAVs são determinísticos → cache por kind evita re-sintetizar a cada play. */
const wavCache = new Map<SfxKind, string>();

function createNativeBackend(): SfxBackend {
  return {
    play(kind) {
      void playNativeSfx(kind).catch(() => undefined);
    },
    dispose() {
      /* stateless */
    },
  };
}

async function playNativeSfx(kind: SfxKind): Promise<void> {
  const { Audio } = await import('expo-av');
  const FileSystem = await import('expo-file-system');
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });
  let b64 = wavCache.get(kind);
  if (!b64) {
    b64 = synthesizeSfxWavBase64(kind);
    wavCache.set(kind, b64);
  }
  const path = `${FileSystem.cacheDirectory ?? ''}sfx-${kind}-${Date.now()}.wav`;
  // Mesmo padrão do voice player: track do write pra garantir cleanup do
  // cache mesmo quando createAsync/play falham no meio.
  let wrote = false;
  try {
    await FileSystem.writeAsStringAsync(path, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    wrote = true;
    // volume 1: os samples já saem da síntese com pico = SFX_VOLUME_CAP (0.18).
    const { sound } = await Audio.Sound.createAsync({ uri: path }, { volume: 1 });
    await sound.playAsync();
    await new Promise<void>(resolve => {
      // Jingles têm <= 1.2s — timeout de segurança folgado pra liberar recursos.
      const timeout = setTimeout(() => {
        void sound.unloadAsync().catch(() => undefined);
        void FileSystem.deleteAsync(path, { idempotent: true }).catch(() => undefined);
        resolve();
      }, 2500);
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          clearTimeout(timeout);
          void sound.unloadAsync().catch(() => undefined);
          void FileSystem.deleteAsync(path, { idempotent: true }).catch(() => undefined);
          resolve();
        }
      });
    });
  } catch (err) {
    if (wrote) {
      void FileSystem.deleteAsync(path, { idempotent: true }).catch(() => undefined);
    }
    throw err;
  }
}

/* v8 ignore stop */

// ============================================================================
// Web Audio backend
// ============================================================================
/* v8 ignore start — testado via mock; backend real exige AudioContext browser */

function createWebBackend(Ctor: typeof AudioContext): SfxBackend {
  let ctx: AudioContext | null = null;

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

  function play(kind: SfxKind): void {
    const c = getCtx();
    if (!c) return;

    // Resume se suspended (browser autoplay policy bloqueia até gesture)
    if (c.state === 'suspended') {
      c.resume().catch(() => undefined);
    }

    const now = c.currentTime;
    for (const note of sfxScore(kind)) {
      scheduleSfxNote(c, note, now);
    }
  }

  function dispose(): void {
    if (ctx) {
      ctx.close().catch(() => undefined);
      ctx = null;
    }
  }

  return { play, dispose };
}

function scheduleSfxNote(c: AudioContext, note: SfxNote, now: number): void {
  try {
    if (!Number.isFinite(note.freq) || note.freq <= 0 || !Number.isFinite(note.dur) || note.dur <= 0) return;
    const t = now + Math.max(0, note.at);
    const dur = note.dur;
    const attack = Math.min(Math.max(note.attack ?? 0.01, 0.001), dur / 2);
    // Cap por nota — igual ao render offline, nada passa de SFX_VOLUME_CAP.
    const volume = SFX_VOLUME_CAP * Math.max(0, Math.min(1, note.vol));

    const osc = c.createOscillator();
    osc.type = note.type;
    osc.frequency.setValueAtTime(note.freq, t);
    if (note.freqEnd !== undefined && Number.isFinite(note.freqEnd) && note.freqEnd > 0) {
      // Glissando linear — espelha o sweep do render offline.
      osc.frequency.linearRampToValueAtTime(note.freqEnd, t + dur);
    }

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);

    // Vibrato via LFO modulando freq (mesmo idioma do voice player)
    const vibrato = note.vibrato ?? 0;
    if (vibrato > 0.05) {
      const lfo = c.createOscillator();
      lfo.frequency.value = 5.5;
      const lfoGain = c.createGain();
      lfoGain.gain.value = note.freq * vibrato * 0.02; // ~2% da freq base
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
  } catch {
    // Falha silenciosa — audio context pode estar invalidado
  }
}

/* v8 ignore stop */
