/**
 * Tests do gallery-client — mock fetch via injection.
 */

import { describe, expect, it } from 'vitest';
import {
  deleteGalleryEntry,
  getGalleryEntry,
  listGallery,
  publishLook,
} from '@/lib/atelier/gallery-client';
import type { AtelierLook } from '@/lib/db';

function fakeLook(): AtelierLook {
  return {
    id: 'l1',
    user_id: 'u',
    name: 'vibe',
    created_at: '2026-05-26T00:00:00.000Z',
    snapshot: {
      eye_size: 1, eye_spread: 1, body_height: 1, body_width: 1,
      aura_intensity: 1, pattern_density: 1,
      preferred_pattern: 'plain', posture_lean: 0,
      force_hide_tail: false, force_hide_antennae: false, force_hide_spikes: false,
    },
  };
}

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  return (url: RequestInfo | URL, init: RequestInit = {}) => {
    return Promise.resolve(handler(String(url), init));
  };
}

function jsonRes(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('gallery-client', () => {
  it('listGallery devolve array em ok', async () => {
    const f = mockFetch(() => jsonRes(200, { looks: [{ id: 'a', name: 'x', schema: 1, snapshot: {}, shared_at: '' }] }));
    const r = await listGallery({ fetchImpl: f as unknown as typeof fetch });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toHaveLength(1);
  });

  it('listGallery propaga HTTP error', async () => {
    const f = mockFetch(() => jsonRes(500, { error: 'boom' }));
    const r = await listGallery({ fetchImpl: f as unknown as typeof fetch });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('500');
  });

  it('getGalleryEntry encoda id', async () => {
    let captured = '';
    const f = mockFetch(url => {
      captured = url;
      return jsonRes(200, { id: 'x', name: 'n', schema: 1, snapshot: {}, shared_at: '' });
    });
    await getGalleryEntry('id/with slash', { fetchImpl: f as unknown as typeof fetch });
    expect(captured).toContain('id%2Fwith%20slash');
  });

  it('publishLook envia JSON com schema correto', async () => {
    let body = '';
    const f = mockFetch((_url, init) => {
      body = String(init.body);
      return jsonRes(201, { id: 'new', name: 'vibe', schema: 1, snapshot: {}, shared_at: '' });
    });
    const r = await publishLook(fakeLook(), { fetchImpl: f as unknown as typeof fetch });
    expect(r.ok).toBe(true);
    const parsed = JSON.parse(body);
    expect(parsed.schema).toBe(1);
    expect(parsed.name).toBe('vibe');
    // user_id NAO deve vazar — invariante de privacidade.
    expect(parsed.user_id).toBeUndefined();
  });

  it('deleteGalleryEntry retorna ok', async () => {
    const f = mockFetch(() => jsonRes(200, { ok: true }));
    const r = await deleteGalleryEntry('id', { fetchImpl: f as unknown as typeof fetch });
    expect(r.ok).toBe(true);
  });

  it('network error vira { ok: false }', async () => {
    const f = () => Promise.reject(new Error('offline'));
    const r = await listGallery({ fetchImpl: f as unknown as typeof fetch });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('network');
  });
});
