/**
 * Barrel export do módulo de voz procedural.
 *
 * Uso típico:
 *   import { voiceProfileFromGenome, playVoiceLine } from '@/lib/voice';
 *   const profile = voiceProfileFromGenome(mascot.dna);
 *   playVoiceLine(profile, { kind: 'greet', emotion: 0.7 });
 */

export type {
  VoiceHandle,
  VoiceLine,
  VoiceProfile,
} from './types';

export { voiceProfileFromGenome, modifiersForKind } from './profile';

export {
  playVoiceLine,
  __setBackend,
  __resetBackend,
  type AudioBackend,
} from './player';
