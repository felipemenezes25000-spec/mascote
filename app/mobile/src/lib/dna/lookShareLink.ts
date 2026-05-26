/**
 * lookShareLink — deep link URL encoding/decoding pros shareable looks.
 *
 * Por que separado de lookShare:
 *   lookShare faz JSON puro (copia-cola via clipboard). URLs precisam de
 *   base64-url + URI safety + scheme handling.
 *
 * Formato:
 *   mascote://atelier/look?p=<base64url(JSON_payload)>
 *
 * O payload eh o mesmo SharedLook que lookShare.exportLook gera, so com
 * encoding extra pra cabir em URL safe characters.
 *
 * Determinismo: mesma input → mesma URL → mesma decode. Round-trip
 * exato (encode -> decode == input).
 */

import { exportLook, importLook, type ImportResult } from './lookShare';
import type { AtelierLook } from '@/lib/db';

export const APP_SCHEME = 'mascote';
export const LOOK_DEEP_PATH = 'atelier/look';
export const LOOK_URL_PARAM = 'p';

// base64url encoding — substitui chars URL-unsafe e remove padding `=`.
// Suporta atob/btoa nativos do JS (RN/Node). Em RN < 0.74 considere
// polyfill se este modulo for usado em ambientes legados.
function base64UrlEncode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  // Browser/RN fallback: btoa expects latin1.
  const b64 = typeof btoa !== 'undefined'
    ? btoa(unescape(encodeURIComponent(str)))
    : '';
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(b64url: string): string | null {
  const pad = b64url.length % 4 === 0 ? '' : '='.repeat(4 - (b64url.length % 4));
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + pad;
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64, 'base64').toString('utf-8');
    }
    if (typeof atob !== 'undefined') {
      return decodeURIComponent(escape(atob(b64)));
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Encoda um look como deep link URL. Retorna `mascote://atelier/look?p=...`.
 */
export function encodeLookDeepLink(look: AtelierLook): string {
  const json = exportLook(look);
  const payload = base64UrlEncode(json);
  return `${APP_SCHEME}://${LOOK_DEEP_PATH}?${LOOK_URL_PARAM}=${payload}`;
}

export type DecodeResult = ImportResult | { ok: false; error: string };

/**
 * Decoda uma URL recebida via deep link. Valida scheme, path e payload.
 * Retorna o mesmo ImportResult que `lookShare.importLook` (snapshot
 * sanitizado pronto pra atelierLooks.save).
 */
export function decodeLookDeepLink(url: string): DecodeResult {
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, error: 'URL vazia.' };

  // Sem validar scheme+path, qualquer URL com `?p=<base64>` era aceita
  // (`https://evil.com/x?p=...`). Como handlers de intent passam URLs
  // externas direto pra cá, isso virava vetor de injection via link
  // arbitrario. Aceita so as duas formas legitimas.
  const validPrefix =
    trimmed.startsWith(`${APP_SCHEME}://${LOOK_DEEP_PATH}?`) ||
    trimmed.startsWith(`${APP_SCHEME}://${LOOK_DEEP_PATH}/?`) ||
    trimmed.startsWith(`https://mascote.app/${LOOK_DEEP_PATH}?`) ||
    trimmed.startsWith(`https://mascote.app/${LOOK_DEEP_PATH}/?`);
  if (!validPrefix) {
    return { ok: false, error: 'Scheme/path invalido.' };
  }

  let queryStr = '';
  if (trimmed.includes('?')) {
    queryStr = trimmed.split('?', 2)[1] ?? '';
  } else {
    return { ok: false, error: 'URL sem parametros.' };
  }

  const params = new URLSearchParams(queryStr);
  const payload = params.get(LOOK_URL_PARAM);
  if (!payload) return { ok: false, error: 'Parametro de look ausente.' };

  const json = base64UrlDecode(payload);
  if (!json) return { ok: false, error: 'Payload corrompido (base64).' };

  return importLook(json);
}
