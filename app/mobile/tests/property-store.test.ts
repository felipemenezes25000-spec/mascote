/**
 * Property-based tests pro Zustand store — toast queue + state setters.
 *
 * Invariantes do toast queue:
 * - FIFO: ordem de enqueue preservada na ordem de display
 * - shiftToast nunca produz queue negativa
 * - enqueueToast com currentToast === null exibe imediatamente
 * - enqueueToast com currentToast !== null adiciona à fila
 *
 * Invariantes do setter:
 * - setProfile/setMascot/etc. são idempotentes (setX(v); setX(v) === setX(v))
 */

import { describe, expect, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useStore } from '@/store';
import type { UnlockToastData } from '@/components/UnlockToast';

const config: fc.Parameters<unknown> = { numRuns: 100, seed: 42, verbose: false };

function makeToast(tag: string): UnlockToastData {
  // UnlockToastData não tem id; usamos `title` como identidade pro test
  return {
    kind: 'achievement',
    emoji: '🏆',
    title: tag,
    subtitle: 'test',
  };
}

beforeEach(() => {
  // Reseta o store entre testes
  useStore.setState({
    toastQueue: [],
    currentToast: null,
    profile: null,
    mascot: null,
    streak: null,
    settings: null,
    wallet: null,
  });
});

describe('property: toast queue', () => {
  it('enqueue N toasts → 1 vira current, N-1 ficam na queue', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        n => {
          useStore.setState({ toastQueue: [], currentToast: null });
          const { enqueueToast } = useStore.getState();
          for (let i = 0; i < n; i++) {
            enqueueToast(makeToast(`t${i}`));
          }
          const s = useStore.getState();
          expect(s.currentToast).not.toBeNull();
          expect(s.currentToast?.title).toBe('t0'); // primeiro vira current imediato
          expect(s.toastQueue.length).toBe(n - 1);
          // Os IDs na queue devem ser t1, t2, ..., t_{n-1} em ordem
          for (let i = 1; i < n; i++) {
            expect(s.toastQueue[i - 1]?.title).toBe(`t${i}`);
          }
        },
      ),
      config,
    );
  });

  it('shiftToast preserva FIFO: o que entra primeiro sai primeiro', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 2, maxLength: 10 }),
        ids => {
          useStore.setState({ toastQueue: [], currentToast: null });
          const { enqueueToast, shiftToast } = useStore.getState();
          for (const id of ids) {
            enqueueToast(makeToast(id));
          }
          // Drena na ordem: current → shift → current → shift ...
          const seen: string[] = [];
          for (let i = 0; i < ids.length; i++) {
            const s = useStore.getState();
            if (s.currentToast) seen.push(s.currentToast.title);
            shiftToast();
          }
          expect(seen).toEqual(ids);
        },
      ),
      config,
    );
  });

  it('shiftToast em queue vazia: currentToast vira null sem crashear', () => {
    useStore.setState({ toastQueue: [], currentToast: makeToast('only') });
    useStore.getState().shiftToast();
    const s = useStore.getState();
    expect(s.currentToast).toBeNull();
    expect(s.toastQueue.length).toBe(0);
    // Idempotente: chamar de novo permanece null
    useStore.getState().shiftToast();
    expect(useStore.getState().currentToast).toBeNull();
  });
});

describe('property: state setters são idempotentes', () => {
  it('setProfile(p); setProfile(p) === setProfile(p) (uma chamada apenas)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (id, name) => {
          useStore.setState({ profile: null });
          const profile = {
            id,
            display_name: name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            age_band: null,
          } as any;
          useStore.getState().setProfile(profile);
          const after1 = useStore.getState().profile;
          useStore.getState().setProfile(profile);
          const after2 = useStore.getState().profile;
          // Referência idêntica (não recriou objeto)
          expect(after1).toBe(after2);
          expect(after2?.id).toBe(id);
        },
      ),
      config,
    );
  });

  it('setProfile(null) limpa o estado completamente', () => {
    useStore.setState({ profile: { id: 'x', display_name: 'old' } as any });
    useStore.getState().setProfile(null);
    expect(useStore.getState().profile).toBeNull();
  });
});

describe('property: enqueue + shift cycle (full lifecycle)', () => {
  it('após drenar toda queue, store volta ao estado inicial (vazio)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 4 }), { minLength: 1, maxLength: 8 }),
        ids => {
          useStore.setState({ toastQueue: [], currentToast: null });
          const { enqueueToast, shiftToast } = useStore.getState();
          ids.forEach(id => enqueueToast(makeToast(id)));
          // Drena tudo: N+1 shifts pra zerar (N na queue + 1 current)
          for (let i = 0; i < ids.length + 1; i++) {
            shiftToast();
          }
          const s = useStore.getState();
          expect(s.currentToast).toBeNull();
          expect(s.toastQueue.length).toBe(0);
        },
      ),
      config,
    );
  });
});
