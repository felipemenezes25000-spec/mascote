/**
 * Testes do detector de capabilities (decide entre 3D e 2D).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function mockPlatform(os: string, version: string | number) {
  vi.doMock('react-native', () => ({
    Platform: { OS: os, Version: version },
  }));
}

describe('detectCapabilities', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.doUnmock('react-native');
  });

  it('override true habilita 3D mesmo em platform fraca', async () => {
    mockPlatform('android', 21);
    const { detectCapabilities } = await import('@/lib/deviceCapabilities');
    const c = detectCapabilities(true);
    expect(c.canRender3D).toBe(true);
  });

  it('override false desabilita 3D mesmo em platform forte', async () => {
    mockPlatform('android', 33);
    const { detectCapabilities } = await import('@/lib/deviceCapabilities');
    const c = detectCapabilities(false);
    expect(c.canRender3D).toBe(false);
  });

  it('web habilita 3D em qualidade alta', async () => {
    mockPlatform('web', 0);
    const { detectCapabilities } = await import('@/lib/deviceCapabilities');
    const c = detectCapabilities();
    expect(c.canRender3D).toBe(true);
    expect(c.qualityTier).toBe('high');
  });

  it('iOS 16+ habilita 3D high', async () => {
    mockPlatform('ios', '16.4');
    const { detectCapabilities } = await import('@/lib/deviceCapabilities');
    const c = detectCapabilities();
    expect(c.canRender3D).toBe(true);
    expect(c.qualityTier).toBe('high');
  });

  it('iOS 14 habilita 3D medium', async () => {
    mockPlatform('ios', '14.5');
    const { detectCapabilities } = await import('@/lib/deviceCapabilities');
    const c = detectCapabilities();
    expect(c.canRender3D).toBe(true);
    expect(c.qualityTier).toBe('medium');
  });

  it('iOS 12 cai pro 2D', async () => {
    mockPlatform('ios', '12.0');
    const { detectCapabilities } = await import('@/lib/deviceCapabilities');
    const c = detectCapabilities();
    expect(c.canRender3D).toBe(false);
  });

  it('Android API 28+ habilita 3D high', async () => {
    mockPlatform('android', 30);
    const { detectCapabilities } = await import('@/lib/deviceCapabilities');
    const c = detectCapabilities();
    expect(c.canRender3D).toBe(true);
    expect(c.qualityTier).toBe('high');
  });

  it('Android API 26 habilita 3D medium', async () => {
    mockPlatform('android', 26);
    const { detectCapabilities } = await import('@/lib/deviceCapabilities');
    const c = detectCapabilities();
    expect(c.canRender3D).toBe(true);
    expect(c.qualityTier).toBe('medium');
  });

  it('Android API 24 cai pro 2D', async () => {
    mockPlatform('android', 24);
    const { detectCapabilities } = await import('@/lib/deviceCapabilities');
    const c = detectCapabilities();
    expect(c.canRender3D).toBe(false);
  });

  it('plataforma desconhecida cai pro 2D conservadoramente', async () => {
    mockPlatform('macos', 0);
    const { detectCapabilities } = await import('@/lib/deviceCapabilities');
    const c = detectCapabilities();
    expect(c.canRender3D).toBe(false);
  });
});
