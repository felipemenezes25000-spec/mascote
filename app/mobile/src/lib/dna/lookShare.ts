/**
 * Look share — serialização compacta de snapshots de customização.
 *
 * Formato compartilhável: JSON com cabeçalho versionado + snapshot validado.
 * Versionamento permite migrações futuras sem quebrar shares antigos.
 *
 * NÃO inclui user_id ou updated_at — privacidade (compartilhar entre amigos
 * não vaza ID interno).
 *
 * Validação no import:
 *  - Schema v1 esperado
 *  - Multipliers clampados em [0.7, 1.3]
 *  - Posture clamped em [-0.2, 0.2]
 *  - Pattern em whitelist
 */

import type { AtelierLook } from '@/lib/db';
import { sanitizeCustomization } from './customization';

export const LOOK_SHARE_SCHEMA = 1;

export interface SharedLook {
  /** Schema version pra migração. */
  schema: 1;
  /** Nome do look (max 30 chars). */
  name: string;
  /** Snapshot completo sem user_id/updated_at. */
  snapshot: AtelierLook['snapshot'];
  /** Quando o look foi compartilhado (informativo, não validado). */
  shared_at?: string;
}

/**
 * Exporta um look como string JSON compacta pronta pra copiar.
 */
export function exportLook(look: AtelierLook): string {
  const shared: SharedLook = {
    schema: LOOK_SHARE_SCHEMA,
    name: look.name,
    snapshot: look.snapshot,
    shared_at: new Date().toISOString(),
  };
  return JSON.stringify(shared);
}

/**
 * Resultado do parse de um look compartilhado.
 * `ok: true` → dados validados e sanitizados, prontos pra atelierLooks.save.
 * `ok: false` → motivo human-readable do erro.
 */
export type ImportResult =
  | { ok: true; name: string; snapshot: AtelierLook['snapshot'] }
  | { ok: false; error: string };

/**
 * Parse defensive — não confia em payload externo. Sanitiza customization
 * e clampa tudo conforme cap. Erros HTTP-like de validação retornados ao
 * caller pra mostrar mensagem ao usuário.
 */
export function importLook(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: 'JSON inválido. Cole o texto completo do look.' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Look inválido.' };
  }
  const obj = parsed as Partial<SharedLook>;
  if (obj.schema !== LOOK_SHARE_SCHEMA) {
    return {
      ok: false,
      error: `Versão de look incompatível (schema ${obj.schema ?? '?'}, esperado ${LOOK_SHARE_SCHEMA}).`,
    };
  }
  if (!obj.snapshot || typeof obj.snapshot !== 'object') {
    return { ok: false, error: 'Snapshot ausente.' };
  }
  const name = typeof obj.name === 'string' && obj.name.trim().length > 0
    ? obj.name.trim().slice(0, 30)
    : 'Importado';

  // Sanitiza usando o pipeline existente — força cap, pattern whitelist, etc.
  const sanitized = sanitizeCustomization({
    ...obj.snapshot,
    user_id: 'import-temp',
  });
  const { user_id: _u, updated_at: _t, ...snapshot } = sanitized;

  return { ok: true, name, snapshot };
}
