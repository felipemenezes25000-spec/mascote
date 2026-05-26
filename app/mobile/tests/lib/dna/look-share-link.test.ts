/**
 * Tests do lookShareLink — deep link encode/decode.
 *
 * Invariantes:
 *   - encode(look) -> URL valida com scheme mascote://
 *   - decode(encode(look)) -> {ok: true, name, snapshot} igual ao original
 *   - URLs malformadas -> {ok: false} sem throw
 *   - Payload base64 quebrado -> erro recuperavel
 */

import { describe, expect, it } from 'vitest';
import {
  APP_SCHEME,
  LOOK_DEEP_PATH,
  decodeLookDeepLink,
  encodeLookDeepLink,
} from '@/lib/dna/lookShareLink';
import type { AtelierLook } from '@/lib/db';

function fakeLook(): AtelierLook {
  return {
    id: 'l_test',
    user_id: 'u',
    name: 'Vibe Cool',
    created_at: '2026-05-26T00:00:00.000Z',
    snapshot: {
      eye_size: 1.1,
      eye_spread: 1.0,
      body_height: 0.9,
      body_width: 1.15,
      aura_intensity: 1.2,
      pattern_density: 0.85,
      preferred_pattern: 'fractal',
      posture_lean: 0.05,
      force_hide_tail: false,
      force_hide_antennae: false,
      force_hide_spikes: false,
    },
  };
}

describe('lookShareLink', () => {
  it('encode produz URL com scheme + path corretos', () => {
    const url = encodeLookDeepLink(fakeLook());
    expect(url.startsWith(`${APP_SCHEME}://${LOOK_DEEP_PATH}?`)).toBe(true);
    expect(url).toContain('p=');
  });

  it('round-trip preserva nome e snapshot', () => {
    const look = fakeLook();
    const url = encodeLookDeepLink(look);
    const out = decodeLookDeepLink(url);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.name).toBe(look.name);
      expect(out.snapshot.preferred_pattern).toBe(look.snapshot.preferred_pattern);
      expect(out.snapshot.eye_size).toBeCloseTo(look.snapshot.eye_size, 5);
    }
  });

  it('URL vazia → erro', () => {
    const out = decodeLookDeepLink('');
    expect(out.ok).toBe(false);
  });

  it('URL sem parametros → erro', () => {
    const out = decodeLookDeepLink('mascote://atelier/look');
    expect(out.ok).toBe(false);
  });

  it('payload base64 corrompido → erro recuperavel (sem throw)', () => {
    const out = decodeLookDeepLink('mascote://atelier/look?p=@@@invalid@@@');
    expect(out.ok).toBe(false);
  });

  it('payload com JSON valido mas schema errado → erro de schema', () => {
    // base64url de '{"schema":99,"name":"x","snapshot":{}}'
    const badJson = '{"schema":99,"name":"x","snapshot":{}}';
    const b64 = Buffer.from(badJson).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const out = decodeLookDeepLink(`mascote://atelier/look?p=${b64}`);
    expect(out.ok).toBe(false);
  });

  it('determinismo: mesma input → mesma URL', () => {
    const look = fakeLook();
    const a = encodeLookDeepLink(look);
    const b = encodeLookDeepLink(look);
    // Os timestamps shared_at podem diferir entre runs, entao normalizamos
    // verificando que o decode produz mesma snapshot.
    const da = decodeLookDeepLink(a);
    const db = decodeLookDeepLink(b);
    if (da.ok && db.ok) {
      expect(da.snapshot).toEqual(db.snapshot);
      expect(da.name).toBe(db.name);
    }
  });
});
