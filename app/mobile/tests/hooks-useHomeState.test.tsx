import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from './helpers/renderHook';
import { useHomeState } from '@/hooks/useHomeState';
import { profiles, resetAll } from '@/lib/db';
import type { Profile } from '@/types';

declare const __asyncStorageReset: () => void;

describe('useHomeState', () => {
  beforeEach(async () => {
    __asyncStorageReset();
    await resetAll();
  });
  afterEach(async () => {
    await resetAll();
  });

  it('profile null → não carrega, ready false', () => {
    const { result } = renderHook(() => useHomeState(null));
    expect(result.current.ready).toBe(false);
    expect(result.current.todayCheckins).toBeUndefined();
  });

  it('com profile → carrega bootstrap', async () => {
    const profile = await profiles.upsert({ display_name: 'A', age_band: '25-34' });
    const { result } = renderHook(() => useHomeState(profile));
    await waitFor(() => {
      if (!result.current.ready) throw new Error('not ready');
    });
    expect(result.current.todayCheckins).toEqual({});
    expect(result.current.comboLevel).toBe(1);
    expect(result.current.mission).toBeNull();
  });

  it('reload() força re-fetch', async () => {
    const profile = await profiles.upsert({ display_name: 'A', age_band: '25-34' });
    const { result } = renderHook(() => useHomeState(profile));
    await waitFor(() => {
      if (!result.current.ready) throw new Error('not ready');
    });
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.ready).toBe(true);
  });

  it('reload sem profile é no-op', async () => {
    const { result } = renderHook(() => useHomeState(null));
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.ready).toBe(false);
  });

  it('mudança de profile retriggers carga', async () => {
    const p1 = await profiles.upsert({ display_name: 'A', age_band: '25-34' });
    const { result, rerender } = renderHook<
      ReturnType<typeof useHomeState>,
      { p: Profile | null }
    >(
      ({ p }) => useHomeState(p),
      { initialProps: { p: p1 } }
    );
    await waitFor(() => {
      if (!result.current.ready) throw new Error('not ready');
    });
    rerender({ p: null });
    await waitFor(() => {
      if (result.current.ready) throw new Error('still ready');
    });
  });
});
