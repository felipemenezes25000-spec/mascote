/**
 * Sanitização de display_name pra copy poética do mascote/diário.
 *
 * Bug original (auditoria 2026-05-27): usuário cadastrava "hm,mjh" como nome
 * e o diário renderizava "Acho que foi hm,mjh cuidando do que precisava" —
 * vírgula + texto sem sentido quebrava o tom emocional do app.
 *
 * Regra (defense-in-depth no momento do render — não muta storage):
 * - Trim + slice 24 chars (evita PII grande tipo email/telefone)
 * - Aceita letras Unicode (acentos OK), espaço, hífen, apóstrofo
 * - Exige começar com letra (rejeita "123abc" ou ",hm")
 * - Mínimo 2 chars (1 char é provavelmente abreviação ou typo)
 * - Retorna null → caller usa fallback "você"
 *
 * Validação no INPUT (signup/onboarding/name.tsx) seria barreira mais robusta;
 * isto aqui protege dados legacy + casos não cobertos.
 */
export function sanitizeDisplayName(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, 24);
  if (trimmed.length < 2) return null;
  // \p{L} = letras Unicode (cobre acentos, ç, etc).
  // Começa com letra, seguido por 1+ letras/espaço/hífen/apóstrofo.
  if (!/^\p{L}[\p{L}\s'-]+$/u.test(trimmed)) return null;
  return trimmed;
}

/** Helper: nome sanitizado ou "você" como fallback poético. */
export function displayNameOrYou(raw?: string | null): string {
  return sanitizeDisplayName(raw) ?? 'você';
}
