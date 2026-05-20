/**
 * Eventos dos 5 pilares — tipagem + despacho com consent.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  analytics,
  MockAnalyticsProvider,
  aiSourceFromResponse,
  trackAiReplyRated,
} from '@/analytics';
import { applyCheckinFully } from '@/lib/checkin';
import { mascots, profiles } from '@/lib/db';
import { subscriptionService } from '@/services/subscription';

let mock: MockAnalyticsProvider;

beforeEach(async () => {
  await AsyncStorage.clear();
  mock = new MockAnalyticsProvider();
  analytics.setProvider(mock);
  analytics.setConsentSource({ isConsented: () => true });
  analytics.reset();
});

afterEach(() => {
  analytics.reset();
});

describe('analytics — pilares (eventos novos)', () => {
  it('checkin_completed inclui path e duration', async () => {
    const profile = await profiles.upsert({ display_name: 'Ana' });
    const mascot = await mascots.upsert({ user_id: profile.id, name: 'Bipo' });
    await applyCheckinFully({
      profile,
      mascot,
      kind: 'water',
      analyticsPath: 'home',
    });
    const evt = mock.__getBuffer().find(e => e.event === 'checkin_completed');
    expect(evt?.props).toMatchObject({
      habit_kind: 'water',
      path: 'home',
    });
    expect((evt?.props.duration_ms as number) ?? 0).toBeGreaterThanOrEqual(0);
  });

  it('subscription_cancelled após cancel', async () => {
    const profile = await profiles.upsert({ display_name: 'Ana' });
    await subscriptionService.subscribe(profile.id, 'plus_monthly');
    await subscriptionService.cancel(profile.id);
    const evt = mock.__getBuffer().find(e => e.event === 'subscription_cancelled');
    expect(evt?.props).toMatchObject({ tier: 'plus_monthly' });
  });

  it('aiSourceFromResponse mapeia proxy vs byok vs local', () => {
    expect(
      aiSourceFromResponse({ source: 'openai' }, { usedProxy: true, hadApiKey: false }),
    ).toBe('proxy');
    expect(
      aiSourceFromResponse({ source: 'openai' }, { usedProxy: false, hadApiKey: true }),
    ).toBe('byok');
    expect(
      aiSourceFromResponse({ source: 'mock' }, { usedProxy: false, hadApiKey: false }),
    ).toBe('local');
  });

  it('ai_reply_* aceita payload tipado', () => {
    analytics.track('ai_reply_requested', { source: 'proxy', tier: 'plus_monthly' });
    analytics.track('ai_reply_succeeded', { source: 'proxy', latency_ms: 120, tier: 'plus_monthly' });
    analytics.track('ai_reply_failed', { source: 'byok', reason: 'timeout', tier: 'free' });
    analytics.track('mascot_gesture', { kind: 'pet' });
    expect(mock.__getBuffer()).toHaveLength(4);
  });

  it('trackAiReplyRated despacha ai_reply_rated', () => {
    trackAiReplyRated(true, false);
    trackAiReplyRated(false, true);
    const rated = mock.__getBuffer().filter(e => e.event === 'ai_reply_rated');
    expect(rated).toHaveLength(2);
    expect(rated[0]?.props).toMatchObject({ helpful: true, repetition: false });
    expect(rated[1]?.props).toMatchObject({ helpful: false, repetition: true });
  });
});
