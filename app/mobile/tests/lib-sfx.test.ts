/**
 * Testes do módulo de SFX procedural (jingles de recompensa).
 *
 * Estratégia idêntica a tests/lib/voice/player.test.ts: backend mock via
 * `__setSfxBackend()` — nada depende de Web Audio/expo-av reais. Validamos:
 *  - playSfx entrega o kind certo ao backend
 *  - gate global (setSfxEnabled) + override por chamada `{ enabled }`
 *  - kind inválido / NaN não explodem nem chegam ao backend
 *  - síntese: WAV base64 não-vazio, determinístico, dentro do cap de
 *    duração (1.2s) e do cap de volume (pico 0.18)
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  __resetSfxBackend,
  __setSfxBackend,
  isSfxKind,
  playSfx,
  setSfxEnabled,
  SFX_KINDS,
  SFX_MAX_DURATION_S,
  SFX_SAMPLE_RATE,
  SFX_VOLUME_CAP,
  synthesizeSfxWavBase64,
  type SfxBackend,
  type SfxKind,
} from '@/lib/sfx';

function makeMockBackend() {
  const calls: SfxKind[] = [];
  const backend: SfxBackend = {
    play: kind => {
      calls.push(kind);
    },
    dispose: () => undefined,
  };
  return { calls, backend };
}

afterEach(() => {
  setSfxEnabled(true);
  __resetSfxBackend();
});

describe('playSfx — backend + gate', () => {
  it('backend mock recebe o kind certo, uma chamada por play', () => {
    const { calls, backend } = makeMockBackend();
    __setSfxBackend(backend);
    playSfx('coin');
    playSfx('fanfare');
    playSfx('night');
    expect(calls).toEqual(['coin', 'fanfare', 'night']);
  });

  it('setSfxEnabled(false) silencia tudo até religar', () => {
    const { calls, backend } = makeMockBackend();
    __setSfxBackend(backend);
    setSfxEnabled(false);
    playSfx('coin');
    playSfx('chest');
    expect(calls).toEqual([]);
    setSfxEnabled(true);
    playSfx('evolve');
    expect(calls).toEqual(['evolve']);
  });

  it('override { enabled: false } silencia mesmo com gate global ligado', () => {
    const { calls, backend } = makeMockBackend();
    __setSfxBackend(backend);
    setSfxEnabled(true);
    playSfx('coin', { enabled: false });
    expect(calls).toEqual([]);
  });

  it('override { enabled: true } fura o gate global desligado', () => {
    const { calls, backend } = makeMockBackend();
    __setSfxBackend(backend);
    setSfxEnabled(false);
    playSfx('title', { enabled: true });
    expect(calls).toEqual(['title']);
  });

  it('kind inválido / NaN / undefined não explodem nem chegam ao backend', () => {
    const { calls, backend } = makeMockBackend();
    __setSfxBackend(backend);
    expect(() => playSfx('explosao' as SfxKind)).not.toThrow();
    expect(() => playSfx(NaN as unknown as SfxKind)).not.toThrow();
    expect(() => playSfx(undefined as unknown as SfxKind)).not.toThrow();
    expect(calls).toEqual([]);
  });

  it('sem backend (null) → no-op silencioso', () => {
    __setSfxBackend(null);
    expect(() => playSfx('coin')).not.toThrow();
  });

  it('backend que lança erro → playSfx não propaga', () => {
    __setSfxBackend({
      play: () => {
        throw new Error('audio context inválido');
      },
      dispose: () => undefined,
    });
    expect(() => playSfx('chest')).not.toThrow();
  });
});

describe('isSfxKind — guard de runtime', () => {
  it('aceita todos os kinds e rejeita lixo', () => {
    for (const kind of SFX_KINDS) expect(isSfxKind(kind)).toBe(true);
    expect(isSfxKind('explosao')).toBe(false);
    expect(isSfxKind(NaN)).toBe(false);
    expect(isSfxKind(undefined)).toBe(false);
    expect(isSfxKind(null)).toBe(false);
  });
});

describe('synthesizeSfxWavBase64 — síntese', () => {
  /** Decodifica o WAV base64 e extrai header + samples PCM 16-bit. */
  function decodeWav(b64: string) {
    const buf = Buffer.from(b64, 'base64');
    const riff = buf.toString('ascii', 0, 4);
    const wave = buf.toString('ascii', 8, 12);
    const sampleRate = buf.readUInt32LE(24);
    const dataBytes = buf.readUInt32LE(40);
    let peak = 0;
    for (let i = 44; i + 1 < buf.length; i += 2) {
      const a = Math.abs(buf.readInt16LE(i)) / 0x8000;
      if (a > peak) peak = a;
    }
    return { riff, wave, sampleRate, dataBytes, peak };
  }

  it.each(SFX_KINDS.map(k => [k] as const))(
    '%s → WAV válido, audível, dentro dos caps de duração e volume',
    kind => {
      const b64 = synthesizeSfxWavBase64(kind);
      expect(b64.length).toBeGreaterThan(0);
      const wav = decodeWav(b64);
      expect(wav.riff).toBe('RIFF');
      expect(wav.wave).toBe('WAVE');
      expect(wav.sampleRate).toBe(SFX_SAMPLE_RATE);
      // Duração: PCM 16-bit mono → 2 bytes por sample.
      const durationS = wav.dataBytes / 2 / SFX_SAMPLE_RATE;
      expect(durationS).toBeGreaterThan(0.05);
      expect(durationS).toBeLessThanOrEqual(SFX_MAX_DURATION_S + 0.05);
      // Volume: pico normalizado pra exatamente o cap (nunca estridente).
      expect(wav.peak).toBeGreaterThan(0.05);
      expect(wav.peak).toBeLessThanOrEqual(SFX_VOLUME_CAP + 0.005);
    },
  );

  it.each(SFX_KINDS.map(k => [k] as const))(
    '%s → determinístico: mesmo kind, mesmos bytes',
    kind => {
      expect(synthesizeSfxWavBase64(kind)).toBe(synthesizeSfxWavBase64(kind));
    },
  );

  it('kinds diferentes soam diferente (bytes distintos)', () => {
    const wavs = SFX_KINDS.map(k => synthesizeSfxWavBase64(k));
    expect(new Set(wavs).size).toBe(SFX_KINDS.length);
  });

  it('kind inválido não explode — vira silêncio curto válido', () => {
    expect(() => synthesizeSfxWavBase64('explosao' as SfxKind)).not.toThrow();
    expect(() => synthesizeSfxWavBase64(NaN as unknown as SfxKind)).not.toThrow();
    const b64 = synthesizeSfxWavBase64('explosao' as SfxKind);
    const buf = Buffer.from(b64, 'base64');
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
    // Silêncio: nenhum sample acima de zero.
    let peak = 0;
    for (let i = 44; i + 1 < buf.length; i += 2) {
      peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
    }
    expect(peak).toBe(0);
  });
});
