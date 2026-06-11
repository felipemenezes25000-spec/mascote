/**
 * SFX procedural — types.
 *
 * Jingles curtos de recompensa sintetizados em runtime (zero assets binários),
 * espelhando a arquitetura de `src/lib/voice/`: Web Audio no web, WAV PCM
 * 16-bit mono 22050Hz + expo-av no nativo, no-op silencioso em teste/simulador.
 *
 * **Princípios invioláveis**:
 *  - Som NUNCA toca em loop — cada kind é um jingle one-shot <= 1.2s.
 *  - Volume sempre <= 0.18 (SFX_VOLUME_CAP) — celebração, não notificação.
 *  - Sempre opcional: gate global via `setSfxEnabled` + override por chamada.
 *  - Player NUNCA crasha — qualquer falha vira no-op silencioso.
 */

/** Tipos de jingle — um por momento de celebração do app. */
export type SfxKind =
  /** Ding curto duas notas — recompensa pequena (daily reward, minigame). */
  | 'coin'
  /** Acorde ascendente + shimmer — baú/caixa surpresa, grande prêmio. */
  | 'chest'
  /** Arpejo maior 4 notas — fase da jornada desbloqueada. */
  | 'fanfare'
  /** Fanfare + nota grave de fundo — título de mundo / level up. */
  | 'title'
  /** Glissando ascendente com vibrato — evolução do mascote. */
  | 'evolve'
  /** Sino suave grave — conclusão do dream-flow (clima noturno). */
  | 'night';

/**
 * Uma nota da partitura de um jingle. Declarativa de propósito: o MESMO
 * score alimenta o backend Web Audio (OscillatorNode agendado) e o render
 * offline pra WAV (nativo) — os dois soam igual por construção.
 */
export interface SfxNote {
  /** Frequência inicial em Hz. */
  freq: number;
  /** Frequência final em Hz (glissando). Ausente = nota fixa. */
  freqEnd?: number;
  /** Offset do início do jingle, em segundos. */
  at: number;
  /** Duração da nota (attack + decay), em segundos. */
  dur: number;
  /** Volume relativo de pico [0, 1] — o cap global é aplicado por fora. */
  vol: number;
  /** Timbre: sine (puro/suave) ou triangle (levemente mais rico). */
  type: 'sine' | 'triangle';
  /** Vibrato [0, 1] — modulação de freq ~5.5Hz (0 = nota pura). */
  vibrato?: number;
  /** Attack do envelope em segundos. Default 0.01 (suave, sem click). */
  attack?: number;
}
