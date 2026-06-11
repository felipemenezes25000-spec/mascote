/**
 * Barrel export do módulo de SFX procedural (jingles de recompensa).
 *
 * Uso típico:
 *   import { playSfx } from '@/lib/sfx';
 *   playSfx('coin');                                      // gate global
 *   playSfx('chest', { enabled: settings?.sfx_enabled !== false }); // override
 */

export type { SfxKind, SfxNote } from './types';

export {
  SFX_KINDS,
  SFX_MAX_DURATION_S,
  SFX_SAMPLE_RATE,
  SFX_VOLUME_CAP,
  isSfxKind,
  sfxScore,
  synthesizeSfxSamples,
  synthesizeSfxWavBase64,
} from './synthesizeSfx';

export {
  playSfx,
  setSfxEnabled,
  __setSfxBackend,
  __resetSfxBackend,
  type SfxBackend,
} from './player';
