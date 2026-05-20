/**
 * AnalyticsProvider — contrato do sink real.
 *
 * Implementações esperadas (não incluídas no repo até decisão):
 *  - FirebaseAnalyticsProvider (mobile-first, gratuito)
 *  - PostHogProvider (auto-hosted, privacy-friendly)
 *  - AmplitudeProvider (cohort/funnel ricos)
 *  - MixpanelProvider (legado)
 *
 * Princípio: provider NÃO faz consent check. A camada `AnalyticsService`
 * gateia via consentimento ANTES de invocar o provider.
 */

import type { AnalyticsEventName, AnalyticsEventPayload } from './AnalyticsEvents';

export interface AnalyticsProvider {
  /** Inicializa SDK do provider (no-op pra mock). */
  init?(): Promise<void> | void;
  /** Despacha evento — provider decide async/sync. */
  track<K extends AnalyticsEventName>(
    event: K,
    props: AnalyticsEventPayload[K] & { user_id_hash?: string; ts: number },
  ): void;
  /** Identifica usuário (hash anônimo, NUNCA email). */
  identify?(userIdHash: string): void;
  /** Limpa identificação — chamado em logout/reset. */
  reset?(): void;
  /** Flush pendentes (debug; muitos providers fazem sozinho). */
  flush?(): Promise<void> | void;
}
