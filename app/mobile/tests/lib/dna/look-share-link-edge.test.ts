/**
 * Edge cases adicionais pro lookShareLink — boost de coverage.
 */

import { describe, expect, it } from 'vitest';
import {
  decodeLookDeepLink,
  encodeLookDeepLink,
} from '@/lib/dna/lookShareLink';
import type { AtelierLook } from '@/lib/db';

function look(opts: Partial<AtelierLook> = {}): AtelierLook {
  return {
    id: 'l',
    user_id: 'u',
    name: 'n',
    created_at: '2026-05-26T00:00:00.000Z',
    snapshot: {
      eye_size: 1, eye_spread: 1, body_height: 1, body_width: 1,
      aura_intensity: 1, pattern_density: 1,
      preferred_pattern: 'plain', posture_lean: 0,
      force_hide_tail: false, force_hide_antennae: false, force_hide_spikes: false,
    },
    ...opts,
  };
}

describe('lookShareLink: edge cases', () => {
  it('whitespace-only URL → erro', () => {
    expect(decodeLookDeepLink('   ').ok).toBe(false);
    expect(decodeLookDeepLink('\n\t').ok).toBe(false);
  });

  it('URL com parametros mas sem p= → erro especifico', () => {
    const r = decodeLookDeepLink('mascote://atelier/look?foo=bar');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('ausente');
  });

  it('URL com p= vazio → erro de payload', () => {
    const r = decodeLookDeepLink('mascote://atelier/look?p=');
    expect(r.ok).toBe(false);
  });

  it('nome muito longo eh truncado em 30 chars apos import', () => {
    const long = 'a'.repeat(50);
    const url = encodeLookDeepLink(look({ name: long }));
    const r = decodeLookDeepLink(url);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.name.length).toBeLessThanOrEqual(30);
  });

  it('snapshot com valores fora de range sao clampados no decode', () => {
    const out = look({
      snapshot: {
        eye_size: 99, eye_spread: -50, body_height: 1, body_width: 1,
        aura_intensity: 1, pattern_density: 1,
        preferred_pattern: 'plain', posture_lean: 99,
        force_hide_tail: false, force_hide_antennae: false, force_hide_spikes: false,
      },
    });
    const url = encodeLookDeepLink(out);
    const r = decodeLookDeepLink(url);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.snapshot.eye_size).toBeLessThanOrEqual(1.3);
      expect(r.snapshot.eye_size).toBeGreaterThanOrEqual(0.7);
      expect(r.snapshot.posture_lean).toBeLessThanOrEqual(0.2);
    }
  });

  it('URL com path query string complexa funciona', () => {
    const url = encodeLookDeepLink(look());
    const r = decodeLookDeepLink(url + '&extra=ignored');
    expect(r.ok).toBe(true);
  });
});
