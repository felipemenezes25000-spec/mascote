/**
 * Persistência do Genome no AsyncStorage do usuário.
 *
 * O Genome vive ATACHED ao registro Mascot da pessoa, em `mascots[].dna`.
 * A migration v1 → v2 (em db.ts) adiciona o campo `dna` retroativamente
 * para todos os usuários antigos, derivado da personalidade que já tinham
 * escolhido.
 *
 * **Princípios:**
 * - Sempre sanitizado na borda (corrupção de storage não trava o app).
 * - DNA NUNCA é exposto a logs com nível ≥ info; apenas debug.
 * - DNA NUNCA é incluído em payload remoto (BYOK/IA): garantido por
 *   pentest `tests/security/dna-privacy.test.ts`.
 */

import { hashGenome, sanitizeGenome } from './genome';
import type { Genome } from './genome';
import { logger } from '@/lib/logger';

/**
 * Sanitiza o DNA antes de persistir.
 * Sempre passe por aqui na borda — garante invariante.
 */
export function prepareDnaForStorage(dna: Genome | undefined | null): Genome {
  return sanitizeGenome(dna);
}

/**
 * Lê o DNA com fallback: input inválido → DNA neutro.
 * Loga warning sem expor valores (só hash).
 */
export function readDnaFromStorage(raw: unknown): Genome {
  const sane = sanitizeGenome(raw);
  if (raw && typeof raw === 'object') {
    // detecta corrupção: chaves faltando ou tipos errados → log
    const keys = Object.keys(raw as Record<string, unknown>);
    if (keys.length < 11) {
      logger.warn('[dna] genome corrompido na leitura (chaves incompletas), reparado', {
        recovered_hash: hashGenome(sane),
      });
    }
  }
  return sane;
}
