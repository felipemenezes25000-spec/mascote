/**
 * Hook que consolida bootstrap da Home num único `useEffect` paralelizado.
 *
 * Substitui o anti-padrão de 6 chamadas `refreshX()` manuais espalhadas em
 * cada handler — em vez disso, expomos `reload()` que recarrega tudo.
 *
 * Não substitui o store global (zustand) ainda — `profile/mascot/streak/wallet`
 * continuam lá porque outras telas precisam. Esse hook cobre o estado
 * *exclusivo da Home* (mission, todayCheckins, combo, daily, box).
 */

import { useCallback, useEffect, useState } from 'react';
import { loadHomeState, type HomeBootstrap } from '@/services/home';
import type { Profile } from '@/types';

export interface UseHomeStateResult extends Partial<HomeBootstrap> {
  ready: boolean;
  reload: () => Promise<void>;
}

export function useHomeState(profile: Profile | null): UseHomeStateResult {
  const [state, setState] = useState<HomeBootstrap | null>(null);

  const reload = useCallback(async () => {
    if (!profile) return;
    const s = await loadHomeState(profile);
    setState(s);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) {
      setState(null);
      return;
    }
    void reload();
  }, [profile?.id, reload]);

  return {
    ready: state !== null,
    reload,
    ...(state ?? {}),
  };
}
