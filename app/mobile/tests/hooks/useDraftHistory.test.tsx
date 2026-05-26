/**
 * useDraftHistory — undo/redo stack genérico.
 *
 * Invariantes:
 *  - set push novo entry só se != current (equality check)
 *  - undo decrementa cursor; redo incrementa
 *  - set após undo trunca o "future branch"
 *  - maxSize aplica FIFO (descarta mais antigo)
 *  - reset zera stack pra single entry com novo initial
 */

import { describe, expect, it } from 'vitest';
import { renderHook, act } from '../helpers/renderHook';
import { useDraftHistory } from '@/hooks/useDraftHistory';

describe('useDraftHistory', () => {
  it('inicia com initial como current, canUndo/canRedo false', () => {
    const h = renderHook(() => useDraftHistory(0));
    expect(h.result.current.current).toBe(0);
    expect(h.result.current.canUndo).toBe(false);
    expect(h.result.current.canRedo).toBe(false);
    expect(h.result.current.depth).toBe(1);
  });

  it('set push novo entry e habilita undo', () => {
    const h = renderHook(() => useDraftHistory(0));
    act(() => h.result.current.set(1));
    expect(h.result.current.current).toBe(1);
    expect(h.result.current.canUndo).toBe(true);
    expect(h.result.current.canRedo).toBe(false);
    expect(h.result.current.depth).toBe(2);
  });

  it('set com valor === current é NO-OP (não cria entry)', () => {
    const h = renderHook(() => useDraftHistory(0));
    act(() => h.result.current.set(0)); // mesma ref
    expect(h.result.current.depth).toBe(1);
    expect(h.result.current.canUndo).toBe(false);
  });

  it('undo decrementa cursor; canRedo passa a true', () => {
    const h = renderHook(() => useDraftHistory(0));
    act(() => h.result.current.set(1));
    act(() => h.result.current.set(2));
    expect(h.result.current.current).toBe(2);

    act(() => h.result.current.undo());
    expect(h.result.current.current).toBe(1);
    expect(h.result.current.canUndo).toBe(true);
    expect(h.result.current.canRedo).toBe(true);

    act(() => h.result.current.undo());
    expect(h.result.current.current).toBe(0);
    expect(h.result.current.canUndo).toBe(false);
    expect(h.result.current.canRedo).toBe(true);
  });

  it('redo após undo restaura', () => {
    const h = renderHook(() => useDraftHistory(0));
    act(() => h.result.current.set(1));
    act(() => h.result.current.undo());
    act(() => h.result.current.redo());
    expect(h.result.current.current).toBe(1);
    expect(h.result.current.canRedo).toBe(false);
  });

  it('undo no boundary é NO-OP (não crash)', () => {
    const h = renderHook(() => useDraftHistory(0));
    act(() => h.result.current.undo());
    act(() => h.result.current.undo());
    expect(h.result.current.current).toBe(0);
    expect(h.result.current.depth).toBe(1);
  });

  it('redo no boundary é NO-OP', () => {
    const h = renderHook(() => useDraftHistory(0));
    act(() => h.result.current.redo());
    expect(h.result.current.current).toBe(0);
  });

  it('set após undo trunca future branch', () => {
    const h = renderHook(() => useDraftHistory(0));
    act(() => h.result.current.set(1));
    act(() => h.result.current.set(2));
    act(() => h.result.current.set(3));
    // Stack: [0, 1, 2, 3], cursor 3
    act(() => h.result.current.undo()); // cursor 2 (current=2)
    act(() => h.result.current.undo()); // cursor 1 (current=1)
    act(() => h.result.current.set(99)); // trunca 2 e 3, push 99
    expect(h.result.current.current).toBe(99);
    expect(h.result.current.canRedo).toBe(false);
    expect(h.result.current.depth).toBe(3); // [0, 1, 99]
  });

  it('maxSize aplica FIFO (descarta mais antigo)', () => {
    const h = renderHook(() => useDraftHistory(0, { maxSize: 3 }));
    act(() => h.result.current.set(1));
    act(() => h.result.current.set(2));
    act(() => h.result.current.set(3)); // overflow — descarta 0
    act(() => h.result.current.set(4)); // overflow — descarta 1
    expect(h.result.current.depth).toBe(3);
    expect(h.result.current.current).toBe(4);
    // Undo todo o stack: deve chegar em 2 (não 0)
    act(() => h.result.current.undo());
    act(() => h.result.current.undo());
    expect(h.result.current.current).toBe(2);
    expect(h.result.current.canUndo).toBe(false);
  });

  it('reset zera stack pra single entry', () => {
    const h = renderHook(() => useDraftHistory(0));
    act(() => h.result.current.set(1));
    act(() => h.result.current.set(2));
    act(() => h.result.current.reset(99));
    expect(h.result.current.current).toBe(99);
    expect(h.result.current.depth).toBe(1);
    expect(h.result.current.canUndo).toBe(false);
    expect(h.result.current.canRedo).toBe(false);
  });

  it('equals custom pra objetos', () => {
    const equals = (a: { x: number }, b: { x: number }) => a.x === b.x;
    const h = renderHook(() =>
      useDraftHistory<{ x: number }>({ x: 0 }, { equals }),
    );
    act(() => h.result.current.set({ x: 0 })); // different ref mas equals = true → NO-OP
    expect(h.result.current.depth).toBe(1);

    act(() => h.result.current.set({ x: 1 })); // equals = false → push
    expect(h.result.current.depth).toBe(2);
  });

  it('aceita null em initial e set (use case do atelier)', () => {
    const h = renderHook(() => useDraftHistory<{ name: string } | null>(null));
    expect(h.result.current.current).toBeNull();
    act(() => h.result.current.set({ name: 'A' }));
    expect(h.result.current.current?.name).toBe('A');
    act(() => h.result.current.set(null));
    expect(h.result.current.current).toBeNull();
    expect(h.result.current.depth).toBe(3);
  });
});
