import { describe, expect, it } from 'vitest';
import { synthesizePhraseWavBase64 } from '@/lib/voice/synthesizeWav';
import { voiceProfileFromGenome } from '@/lib/voice/profile';
import { generateGenome } from '@/lib/dna/genome';

describe('synthesizePhraseWavBase64', () => {
  it('gera WAV base64 não-vazio', () => {
    const profile = voiceProfileFromGenome(generateGenome(42));
    const b64 = synthesizePhraseWavBase64(profile, { kind: 'react', emotion: 0.6 });
    expect(b64.length).toBeGreaterThan(100);
    expect(b64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});
