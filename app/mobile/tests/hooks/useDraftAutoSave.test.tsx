/**
 * useDraftAutoSave — persistência debounced em AsyncStorage.
 *
 * Invariantes:
 *  - Restore no mount chama onRestore UMA VEZ (mesmo com userId estável)
 *  - draft=null não persiste (evita salvar pré-load)
 *  - Mudanças seguidas em <debounceMs disparam UM ÚNICO save (debounce)
 *  - clear() remove a key + cancela debounce pendente
 *  - storageKey por userId (sem leak entre profiles)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '../helpers/renderHook';
import { useDraftAutoSave } from '@/hooks/useDraftAutoSave';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useDraftAutoSave restore', () => {
  it('onRestore chamado com null quando storage vazio', async () => {
    const onRestore = vi.fn();
    renderHook(() =>
      useDraftAutoSave({ userId: 'user-A', draft: null, onRestore }),
    );
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith(null), { timeout: 500 });
  });

  it('onRestore restaura payload válido do storage', async () => {
    const envelope = {
      schema: 1,
      saved_at: new Date().toISOString(),
      payload: { name: 'Festivo', value: 42 },
    };
    await AsyncStorage.setItem('mascote:atelier_draft:user-A', JSON.stringify(envelope));

    const onRestore = vi.fn();
    renderHook(() =>
      useDraftAutoSave({ userId: 'user-A', draft: null, onRestore }),
    );
    await waitFor(
      () =>
        expect(onRestore).toHaveBeenCalledWith({ name: 'Festivo', value: 42 }),
      { timeout: 500 },
    );
  });

  it('schema incompatível dispara onRestore(null)', async () => {
    await AsyncStorage.setItem(
      'mascote:atelier_draft:user-A',
      JSON.stringify({ schema: 99, payload: { x: 1 } }),
    );
    const onRestore = vi.fn();
    renderHook(() =>
      useDraftAutoSave({ userId: 'user-A', draft: null, onRestore }),
    );
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith(null), { timeout: 500 });
  });

  it('JSON corrompido não crasha — onRestore(null)', async () => {
    await AsyncStorage.setItem('mascote:atelier_draft:user-A', 'not-json{');
    const onRestore = vi.fn();
    renderHook(() =>
      useDraftAutoSave({ userId: 'user-A', draft: null, onRestore }),
    );
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith(null), { timeout: 500 });
  });
});

describe('useDraftAutoSave save', () => {
  it('draft=null não persiste', async () => {
    renderHook(() => useDraftAutoSave({ userId: 'user-A', draft: null }));
    // Espera após restore — não deve ter criado entry no storage.
    await new Promise(r => setTimeout(r, 100));
    const raw = await AsyncStorage.getItem('mascote:atelier_draft:user-A');
    expect(raw).toBeNull();
  });

  it('draft válido persiste após debounce', async () => {
    const h = renderHook<ReturnType<typeof useDraftAutoSave>, { draft: { v: number } | null }>(
      props => useDraftAutoSave({ userId: 'user-A', draft: props.draft, debounceMs: 50 }),
      { initialProps: { draft: null } },
    );
    // Aguarda restore inicial
    await new Promise(r => setTimeout(r, 30));
    // Set draft
    h.rerender({ draft: { v: 42 } });
    await waitFor(
      async () => {
        const raw = await AsyncStorage.getItem('mascote:atelier_draft:user-A');
        expect(raw).not.toBeNull();
        const env = JSON.parse(raw!);
        expect(env.payload.v).toBe(42);
        expect(env.schema).toBe(1);
      },
      { timeout: 500 },
    );
  });

  it('múltiplas mudanças em <debounce disparam UM ÚNICO save', async () => {
    const setItemSpy = vi.spyOn(AsyncStorage, 'setItem');
    const h = renderHook<ReturnType<typeof useDraftAutoSave>, { draft: number | null }>(
      props => useDraftAutoSave({ userId: 'user-A', draft: props.draft, debounceMs: 100 }),
      { initialProps: { draft: null } },
    );
    await new Promise(r => setTimeout(r, 30)); // espera restore
    setItemSpy.mockClear();

    h.rerender({ draft: 1 });
    h.rerender({ draft: 2 });
    h.rerender({ draft: 3 });
    h.rerender({ draft: 4 });

    await new Promise(r => setTimeout(r, 250));
    // Apenas 1 setItem call (o último valor)
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    const lastCall = setItemSpy.mock.calls[0];
    const env = JSON.parse(lastCall[1] as string);
    expect(env.payload).toBe(4);
    setItemSpy.mockRestore();
  });
});

describe('useDraftAutoSave clear', () => {
  it('clear() remove storage + lastSavedAt = null', async () => {
    await AsyncStorage.setItem(
      'mascote:atelier_draft:user-A',
      JSON.stringify({ schema: 1, saved_at: 'x', payload: { v: 1 } }),
    );
    const h = renderHook(() =>
      useDraftAutoSave({ userId: 'user-A', draft: null }),
    );
    await new Promise(r => setTimeout(r, 30));

    await act(async () => {
      await h.result.current.clear();
    });

    const raw = await AsyncStorage.getItem('mascote:atelier_draft:user-A');
    expect(raw).toBeNull();
    expect(h.result.current.lastSavedAt).toBeNull();
  });

  it('clear cancela debounce pendente', async () => {
    const setItemSpy = vi.spyOn(AsyncStorage, 'setItem');
    const h = renderHook<ReturnType<typeof useDraftAutoSave>, { draft: number | null }>(
      props => useDraftAutoSave({ userId: 'user-A', draft: props.draft, debounceMs: 200 }),
      { initialProps: { draft: null } },
    );
    await new Promise(r => setTimeout(r, 30));
    setItemSpy.mockClear();

    h.rerender({ draft: 42 });
    // Antes do debounce vencer, chamar clear
    await act(async () => {
      await h.result.current.clear();
    });

    // Espera além do debounce — não deve ter dado save
    await new Promise(r => setTimeout(r, 300));
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });
});

describe('useDraftAutoSave isolation', () => {
  it('storage key contém userId — isolamento entre users', async () => {
    await AsyncStorage.setItem(
      'mascote:atelier_draft:user-A',
      JSON.stringify({ schema: 1, saved_at: 'x', payload: { from: 'A' } }),
    );
    const onRestore = vi.fn();
    renderHook(() =>
      useDraftAutoSave({ userId: 'user-B', draft: null, onRestore }),
    );
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith(null), { timeout: 500 });
  });

  it('userId=null não dispara restore nem save', async () => {
    const onRestore = vi.fn();
    renderHook(() =>
      useDraftAutoSave({ userId: null, draft: { v: 1 }, onRestore }),
    );
    await new Promise(r => setTimeout(r, 100));
    expect(onRestore).not.toHaveBeenCalled();
  });
});
