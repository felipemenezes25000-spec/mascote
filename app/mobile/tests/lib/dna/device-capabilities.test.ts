/**
 * Testes do detector de capabilities (decide entre 3D e 2D).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function mockPlatform(os: string, version: string | number, expoGL = true) {
  vi.doMock('react-native', () => ({
    Platform: { OS: os, Version: version },
  }));
  vi.doMock('expo-modules-core', () => ({
    requireOptionalNativeModule: vi.fn((name: string) =>
      name === 'ExponentGLObjectManager' && expoGL ? {} : null,
    ),
  }));
}

/**
 * Esses testes rodam em pool de threads sem jsdom — não há `document` global.
 * Stubamos via globalThis pra que detectCapabilities() acesse o objeto fake.
 * Cleanup feito em afterEach via `delete (globalThis as any).document`.
 */
function stubWebGLAvailable(available: boolean) {
  const fakeDocument = {
    createElement: (tag: string) => {
      if (tag !== 'canvas') return {};
      return {
        getContext: () => (available ? ({} as WebGLRenderingContext) : null),
      };
    },
  };
  // @ts-expect-error injeção de document fake só pra teste
  globalThis.document = fakeDocument;
}

describe('detectCapabilities', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.doUnmock('react-native');
    // @ts-expect-error limpa stub injetado por stubWebGLAvailable
    delete globalThis.document;
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

  it('web usa 2D estável por padrão (pipeline 3D web ainda imaturo)', async () => {
    mockPlatform('web', 0);
    stubWebGLAvailable(true);
    const { detectCapabilities } = await import('@/lib/deviceCapabilities');
    const c = detectCapabilities();
    expect(c.canRender3D).toBe(false);
    expect(c.reason).toContain('2D');
  });

  it('web com override true ainda permite 3D opt-in (QA / force3D)', async () => {
    mockPlatform('web', 0);
    const { detectCapabilities } = await import('@/lib/deviceCapabilities');
    const c = detectCapabilities(true);
    expect(c.canRender3D).toBe(true);
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

  it('Android forte sem expo-gl nativo cai pro 2D', async () => {
    mockPlatform('android', 34, false);
    const { detectCapabilities } = await import('@/lib/deviceCapabilities');
    const c = detectCapabilities();
    expect(c.canRender3D).toBe(false);
    expect(c.reason).toContain('expo-gl');
  });
});
