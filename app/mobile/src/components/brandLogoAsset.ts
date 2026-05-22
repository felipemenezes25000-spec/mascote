/**
 * Isolado num módulo dedicado pra ser mockado em testes.
 *
 * Vitest 4 (oxc parser) não digere `require('foo.png')` — tenta ler o PNG
 * como JS. Como o setup mockeia este caminho (`vi.mock('@/components/brandLogoAsset')`),
 * o require real só roda em runtime nativo (Metro entende assets PNG).
 */

export const LOGO_SOURCE = require('../../assets/logo-mascote.png');
