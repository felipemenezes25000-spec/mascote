/**
 * gallery-client — fetcher pra atelier gallery server.
 *
 * Camada fina sobre HTTP fetch. Backend final (Supabase/Hono/etc) trocara
 * a URL base + auth, mas o shape do client permanece estavel.
 *
 * Privacidade:
 *   - NUNCA envia user_id (mesma regra do lookShare).
 *   - SharedLook payload = schema + name + snapshot + shared_at.
 *
 * Offline-first:
 *   - Erros de network NAO sao throws — devolvem { ok: false, error }
 *     pra UI poder degradar graciosamente.
 *   - Timeout de 8s default (override via options).
 */

import type { AtelierLook } from '@/lib/db';
import { exportLook } from '@/lib/dna/lookShare';

// EXPO_PUBLIC_GALLERY_BASE override permite apontar pra staging/prod sem patch
// no código. process.env.EXPO_PUBLIC_* é estaticamente inlined pelo Metro/Babel,
// então o valor está congelado no bundle final — qualquer build com env diferente
// renasce com uma URL diferente, sem leak entre ambientes.
const ENV_GALLERY_BASE =
  typeof process !== 'undefined' && typeof process.env?.EXPO_PUBLIC_GALLERY_BASE === 'string'
    ? process.env.EXPO_PUBLIC_GALLERY_BASE.trim()
    : '';
export const DEFAULT_GALLERY_BASE = ENV_GALLERY_BASE || 'http://localhost:4174';

export interface GalleryEntry {
  id: string;
  schema: 1;
  name: string;
  snapshot: AtelierLook['snapshot'];
  shared_at: string;
}

export type GalleryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface ClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULTS: Required<Pick<ClientOptions, 'baseUrl' | 'timeoutMs'>> = {
  baseUrl: DEFAULT_GALLERY_BASE,
  timeoutMs: 8000,
};

function getFetch(opts: ClientOptions): typeof fetch {
  return opts.fetchImpl ?? fetch;
}

async function request<T>(
  url: string,
  init: RequestInit,
  opts: ClientOptions,
): Promise<GalleryResult<T>> {
  const f = getFetch(opts);
  const timeout = opts.timeoutMs ?? DEFAULTS.timeoutMs;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timer = ctrl
    ? setTimeout(() => ctrl.abort(), timeout)
    : undefined;
  try {
    const res = await f(url, { ...init, signal: ctrl?.signal });
    if (timer) clearTimeout(timer);
    if (!res.ok) {
      let detail = '';
      try {
        const body = (await res.json()) as { error?: string };
        detail = body.error ?? '';
      } catch {
        /* ignore */
      }
      return { ok: false, error: `HTTP ${res.status}${detail ? ': ' + detail : ''}` };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    if (timer) clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `network: ${msg}` };
  }
}

export async function listGallery(
  opts: ClientOptions = {},
): Promise<GalleryResult<GalleryEntry[]>> {
  const base = opts.baseUrl ?? DEFAULTS.baseUrl;
  const r = await request<{ looks: GalleryEntry[] }>(
    `${base}/api/gallery`,
    { method: 'GET' },
    opts,
  );
  if (!r.ok) return r;
  return { ok: true, data: r.data.looks };
}

export async function getGalleryEntry(
  id: string,
  opts: ClientOptions = {},
): Promise<GalleryResult<GalleryEntry>> {
  const base = opts.baseUrl ?? DEFAULTS.baseUrl;
  return request<GalleryEntry>(`${base}/api/gallery/${encodeURIComponent(id)}`, { method: 'GET' }, opts);
}

export async function publishLook(
  look: AtelierLook,
  opts: ClientOptions = {},
): Promise<GalleryResult<GalleryEntry>> {
  const base = opts.baseUrl ?? DEFAULTS.baseUrl;
  // Reusa o serializer do lookShare pra garantir o mesmo payload
  // que copy-paste usa (incluindo schema + shared_at).
  const json = exportLook(look);
  return request<GalleryEntry>(
    `${base}/api/gallery`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json,
    },
    opts,
  );
}

export async function deleteGalleryEntry(
  id: string,
  opts: ClientOptions = {},
): Promise<GalleryResult<{ ok: true }>> {
  const base = opts.baseUrl ?? DEFAULTS.baseUrl;
  return request<{ ok: true }>(
    `${base}/api/gallery/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    opts,
  );
}
