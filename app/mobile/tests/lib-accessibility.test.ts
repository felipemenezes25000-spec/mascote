import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccessibilityInfo, Platform } from 'react-native';
import { readSystemReduceMotion } from '@/lib/accessibility';

describe('readSystemReduceMotion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('web: lê matchMedia prefers-reduced-motion', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('window', { matchMedia });

    await expect(readSystemReduceMotion()).resolves.toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');

    Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
  });

  it('nativo: delega para AccessibilityInfo', async () => {
    const platform = Platform as { OS: string };
    const prev = platform.OS;
    platform.OS = 'ios';
    vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValueOnce(true);

    await expect(readSystemReduceMotion()).resolves.toBe(true);

    platform.OS = prev;
  });

  it('nativo: retorna false se API falhar', async () => {
    const platform = Platform as { OS: string };
    const prev = platform.OS;
    platform.OS = 'android';
    vi.mocked(AccessibilityInfo.isReduceMotionEnabled).mockRejectedValueOnce(new Error('fail'));

    await expect(readSystemReduceMotion()).resolves.toBe(false);

    platform.OS = prev;
  });
});
