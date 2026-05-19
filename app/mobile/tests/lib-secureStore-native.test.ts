/**
 * Cobre paths não-web de secureStore:
 * - Platform.OS != 'web' → tenta expo-secure-store
 * - expo-secure-store import falha → fallback pra AsyncStorage com prefixo
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(async () => {
  await AsyncStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock('react-native');
  vi.doUnmock('expo-secure-store');
  vi.resetModules();
});

describe('secureStore — Platform.OS = ios + expo-secure-store funcional', () => {
  it('chama SecureStore.setItemAsync/getItemAsync/deleteItemAsync', async () => {
    const mem = new Map<string, string>();
    vi.doMock('react-native', () => ({
      Platform: { OS: 'ios', select: <T,>(o: any) => o.ios ?? o.default },
      StyleSheet: { create: <T,>(x: T) => x },
    }));
    vi.doMock('expo-secure-store', () => ({
      getItemAsync: vi.fn(async (k: string) => mem.get(k) ?? null),
      setItemAsync: vi.fn(async (k: string, v: string) => { mem.set(k, v); }),
      deleteItemAsync: vi.fn(async (k: string) => { mem.delete(k); }),
    }));
    const { secureSet, secureGet, secureRemove, __setBackend } = await import('@/lib/secureStore');
    __setBackend(null); // força criar default backend
    await secureSet('k', 'v');
    expect(await secureGet('k')).toBe('v');
    await secureRemove('k');
    expect(await secureGet('k')).toBeNull();
  });
});

describe('secureStore — Platform.OS = android + expo-secure-store falha import', () => {
  it('fallback para AsyncStorage com prefixo "secure:"', async () => {
    vi.doMock('react-native', () => ({
      Platform: { OS: 'android', select: <T,>(o: any) => o.android ?? o.default },
      StyleSheet: { create: <T,>(x: T) => x },
    }));
    // expo-secure-store import lança
    vi.doMock('expo-secure-store', () => {
      throw new Error('module not found');
    });
    const { secureSet, secureGet, __setBackend } = await import('@/lib/secureStore');
    __setBackend(null);
    await secureSet('k', 'v');
    // fallback usa prefixo 'secure:' no AsyncStorage
    expect(await AsyncStorage.getItem('secure:k')).toBe('v');
    expect(await secureGet('k')).toBe('v');
  });
});
