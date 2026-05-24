/**
 * AnalyticsService — testes de consent gating, provider swap, e payload shape.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { analytics, MockAnalyticsProvider } from '@/analytics';

let mock: MockAnalyticsProvider;

beforeEach(() => {
  mock = new MockAnalyticsProvider();
  analytics.setProvider(mock);
  analytics.setConsentSource({ isConsented: () => true });
  analytics.reset();
});

afterEach(() => {
  analytics.reset();
});

describe('analytics — consent gating', () => {
  it('com consentimento, despacha evento', () => {
    analytics.track('mascot_created', { personality: 'calmo', phase: 'bebe' });
    const buf = mock.__getBuffer();
    expect(buf).toHaveLength(1);
    expect(buf[0]?.event).toBe('mascot_created');
    expect(buf[0]?.props).toMatchObject({ personality: 'calmo', phase: 'bebe' });
  });

  it('sem consentimento, NENHUM evento sai', () => {
    analytics.setConsentSource({ isConsented: () => false });
    analytics.track('mascot_created', { personality: 'calmo', phase: 'bebe' });
    analytics.track('app_opened', { cold_start: true });
    expect(mock.__getBuffer()).toHaveLength(0);
  });

  it('toggle de consent re-libera eventos futuros (não retroativos)', () => {
    const consent = { value: false, isConsented(): boolean { return this.value; } };
    analytics.setConsentSource(consent);
    analytics.track('app_opened', { cold_start: true });
    expect(mock.__getBuffer()).toHaveLength(0);
    consent.value = true;
    analytics.track('app_opened', { cold_start: false });
    expect(mock.__getBuffer()).toHaveLength(1);
  });
});

describe('analytics — identify', () => {
  it('identify propaga pro provider quando consentido', () => {
    analytics.identify('hash-abc');
    expect(mock.__getUserIdHash()).toBe('hash-abc');
  });

  it('identify NÃO propaga sem consent', () => {
    analytics.setConsentSource({ isConsented: () => false });
    analytics.identify('hash-xyz');
    expect(mock.__getUserIdHash()).toBeNull();
  });

  it('eventos subsequentes anexam user_id_hash', () => {
    analytics.identify('hash-abc');
    analytics.track('mission_completed', { mission_id: 'm1' });
    const buf = mock.__getBuffer();
    expect(buf[0]?.props.user_id_hash).toBe('hash-abc');
  });

  it('eventos sem identify deixam user_id_hash undefined', () => {
    analytics.track('app_opened', { cold_start: true });
    const buf = mock.__getBuffer();
    expect(buf[0]?.props.user_id_hash).toBeUndefined();
  });
});

describe('analytics — payload shape', () => {
  it('inclui timestamp ts em ms', () => {
    const before = Date.now();
    analytics.track('app_opened', { cold_start: true });
    const after = Date.now();
    const ts = mock.__getBuffer()[0]?.props.ts as number;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('preserva todas as props passadas', () => {
    analytics.track('mutation_unlocked', {
      mutation_id: 'mut.deep_eyes',
      rarity: 'rare',
    });
    expect(mock.__getBuffer()[0]?.props).toMatchObject({
      mutation_id: 'mut.deep_eyes',
      rarity: 'rare',
    });
  });
});

describe('analytics — provider swap', () => {
  it('setProvider re-identifica usuário atual', () => {
    analytics.identify('hash-abc');
    const newMock = new MockAnalyticsProvider();
    analytics.setProvider(newMock);
    expect(newMock.__getUserIdHash()).toBe('hash-abc');
  });

  it('reset limpa state do provider', () => {
    analytics.identify('hash-abc');
    analytics.track('app_opened', { cold_start: true });
    analytics.reset();
    expect(mock.__getBuffer()).toHaveLength(0);
    expect(mock.__getUserIdHash()).toBeNull();
  });
});

describe('analytics — ring buffer cap (256)', () => {
  it('mantém apenas últimos 256 eventos', () => {
    for (let i = 0; i < 300; i++) {
      analytics.track('app_opened', { cold_start: false });
    }
    expect(mock.__getBuffer().length).toBeLessThanOrEqual(256);
  });
});

describe('analytics — guard de mock em produção', () => {
  const originalEnv = process.env.EXPO_PUBLIC_ENV;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.EXPO_PUBLIC_ENV = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
    analytics.setProvider(mock);
    analytics.setConsentSource({ isConsented: () => true });
    analytics.reset();
  });

  it('bloqueia track quando EXPO_PUBLIC_ENV=production com provider mock', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.NODE_ENV = 'development';
    analytics.track('app_opened', { cold_start: true });
    expect(mock.__getBuffer()).toHaveLength(0);
  });

  it('bloqueia identify quando EXPO_PUBLIC_ENV=production com provider mock', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.NODE_ENV = 'development';
    analytics.identify('hash-prod');
    expect(mock.__getUserIdHash()).toBeNull();
  });
});
