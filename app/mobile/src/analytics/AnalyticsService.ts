/**
 * AnalyticsService — singleton com consent gating + provider injetável.
 *
 * Uso:
 *   import { analytics } from '@/analytics';
 *   analytics.track('mascot_created', { personality: 'calmo', phase: 'bebe' });
 *
 * Consent: se `consentSource.isConsented() === false`, NENHUM evento é
 * despachado pro provider (nem armazenado no mock). Mesma garantia da
 * camada `telemetry.ts` antiga, agora com tipo seguro.
 *
 * Provider default: MockAnalyticsProvider. Substituir em bootstrap do app:
 *   analytics.setProvider(new FirebaseAnalyticsProvider());
 */

import type { AnalyticsProvider } from './AnalyticsProvider';
import type { AnalyticsEventName, AnalyticsEventPayload } from './AnalyticsEvents';
import { MockAnalyticsProvider } from './MockAnalyticsProvider';
import { mockAnalyticsProvider } from './MockAnalyticsProvider';

interface ConsentSource {
  isConsented(): boolean;
}

class AnalyticsService {
  private provider: AnalyticsProvider = mockAnalyticsProvider;
  private consent: ConsentSource = { isConsented: () => true };
  private userIdHash: string | null = null;

  private isProductionBuild(): boolean {
    const env = (process.env.EXPO_PUBLIC_ENV ?? process.env.NODE_ENV ?? 'development').toLowerCase();
    return env === 'production';
  }

  private isMockForbiddenInProduction(): boolean {
    return this.isProductionBuild() && this.provider instanceof MockAnalyticsProvider;
  }

  setProvider(provider: AnalyticsProvider): void {
    this.provider = provider;
    if (this.userIdHash && provider.identify) {
      provider.identify(this.userIdHash);
    }
  }

  setConsentSource(consent: ConsentSource): void {
    this.consent = consent;
  }

  identify(userIdHash: string): void {
    this.userIdHash = userIdHash;
    if (!this.consent.isConsented()) return;
    if (this.isMockForbiddenInProduction()) return;
    this.provider.identify?.(userIdHash);
  }

  track<K extends AnalyticsEventName>(
    event: K,
    props: AnalyticsEventPayload[K],
  ): void {
    if (!this.consent.isConsented()) return;
    if (this.isMockForbiddenInProduction()) return;
    this.provider.track(event, {
      ...props,
      user_id_hash: this.userIdHash ?? undefined,
      ts: Date.now(),
    });
  }

  reset(): void {
    this.userIdHash = null;
    this.provider.reset?.();
  }

  async flush(): Promise<void> {
    await this.provider.flush?.();
  }
}

export const analytics = new AnalyticsService();
