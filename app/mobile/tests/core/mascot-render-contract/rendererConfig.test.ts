import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getMascotRendererConfig,
  getMascotRendererMode,
  isUnityEnabled,
  resolveEffectiveRendererMode,
} from '@/core/mascot-render-contract/rendererConfig';

describe('rendererConfig', () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.EXPO_PUBLIC_MASCOT_RENDERER;
    delete process.env.EXPO_PUBLIC_UNITY_ENABLED;
    delete process.env.EXPO_PUBLIC_UNITY_QUALITY;
    delete process.env.EXPO_PUBLIC_UNITY_DEBUG_PANEL;
  });

  afterEach(() => {
    process.env = env;
  });

  it('default é three com Unity desligado', () => {
    expect(getMascotRendererMode()).toBe('three');
    expect(isUnityEnabled()).toBe(false);
    expect(resolveEffectiveRendererMode()).toBe('three');
  });

  it('unity mode sem EXPO_PUBLIC_UNITY_ENABLED cai para three', () => {
    process.env.EXPO_PUBLIC_MASCOT_RENDERER = 'unity';
    expect(getMascotRendererConfig().mode).toBe('three');
  });

  it('unity ativo quando mode + flag', () => {
    process.env.EXPO_PUBLIC_MASCOT_RENDERER = 'unity';
    process.env.EXPO_PUBLIC_UNITY_ENABLED = 'true';
    expect(resolveEffectiveRendererMode()).toBe('unity');
  });

  it('fallback2d quando configurado', () => {
    process.env.EXPO_PUBLIC_MASCOT_RENDERER = 'fallback2d';
    expect(resolveEffectiveRendererMode()).toBe('fallback2d');
  });
});
