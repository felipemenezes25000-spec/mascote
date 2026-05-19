/**
 * Testes do wrapper SecureStore.
 *
 * Pontos críticos:
 * - Falhas no backend NUNCA quebram a UI (retorna null / engole erro).
 * - `__setBackend` permite injetar um mock determinístico.
 * - `SECURE_KEYS.openAiKey` deve ser uma chave conhecida (regressão de UX).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SECURE_KEYS, __setBackend, secureGet, secureRemove, secureSet, type SecureBackend } from '@/lib/secureStore';

function makeMemBackend(): SecureBackend & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async getItem(k) { return store.get(k) ?? null; },
    async setItem(k, v) { store.set(k, v); },
    async removeItem(k) { store.delete(k); },
  };
}

describe('SecureStore wrapper', () => {
  beforeEach(() => {
    __setBackend(null);
  });
  afterEach(() => {
    __setBackend(null);
  });

  it('secureGet retorna valor previamente armazenado', async () => {
    const b = makeMemBackend();
    __setBackend(b);
    await secureSet('k', 'v');
    expect(await secureGet('k')).toBe('v');
  });

  it('secureGet retorna null quando chave não existe', async () => {
    __setBackend(makeMemBackend());
    expect(await secureGet('inexistente')).toBeNull();
  });

  it('secureSet sobrescreve valor anterior', async () => {
    const b = makeMemBackend();
    __setBackend(b);
    await secureSet('k', 'v1');
    await secureSet('k', 'v2');
    expect(await secureGet('k')).toBe('v2');
  });

  it('secureRemove apaga a chave', async () => {
    const b = makeMemBackend();
    __setBackend(b);
    await secureSet('k', 'v');
    await secureRemove('k');
    expect(await secureGet('k')).toBeNull();
  });

  it('secureGet engole erros do backend e retorna null', async () => {
    __setBackend({
      getItem: () => Promise.reject(new Error('keychain locked')),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    });
    expect(await secureGet('k')).toBeNull();
  });

  it('secureSet engole erros do backend (silent)', async () => {
    __setBackend({
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.reject(new Error('disk full')),
      removeItem: () => Promise.resolve(),
    });
    await expect(secureSet('k', 'v')).resolves.toBeUndefined();
  });

  it('secureRemove engole erros (silent)', async () => {
    __setBackend({
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.reject(new Error('locked')),
    });
    await expect(secureRemove('k')).resolves.toBeUndefined();
  });

  it('SECURE_KEYS.openAiKey é a chave canônica', () => {
    expect(SECURE_KEYS.openAiKey).toBe('mascote.openai_key');
  });

  it('default backend funciona quando nenhum é setado (cai pro web AsyncStorage)', async () => {
    // setBackend(null) → próximo call tenta defaultBackend().
    // Em ambiente node + react-native mock, Platform.OS = 'web' → AsyncStorage path.
    __setBackend(null);
    await secureSet('autotest_k', 'autotest_v');
    expect(await secureGet('autotest_k')).toBe('autotest_v');
    await secureRemove('autotest_k');
    expect(await secureGet('autotest_k')).toBeNull();
  });

  it('PENTEST: valor com caracteres binários é preservado', async () => {
    __setBackend(makeMemBackend());
    const binary = '\x00\x01\xff\x7f';
    await secureSet('binkey', binary);
    expect(await secureGet('binkey')).toBe(binary);
  });

  it('PENTEST: chave vazia não corrompe storage', async () => {
    const b = makeMemBackend();
    __setBackend(b);
    await secureSet('', 'x');
    expect(await secureGet('')).toBe('x');
    expect(b.store.size).toBe(1);
  });
});
