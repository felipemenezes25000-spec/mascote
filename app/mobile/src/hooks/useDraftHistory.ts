/**
 * useDraftHistory — undo/redo stack genérico pra qualquer state editável.
 *
 * Resolve UNDO/REDO sem `react-undo` ou similar. Mantém stack interno de
 * snapshots + cursor; novas mudanças invalidam o branch "future" (clássico).
 *
 * Limitações intencionais:
 *  - Stack tem cap (default 30) — overflow descarta o mais antigo
 *  - Detecção de "no-op" via reference equality (não deep diff) — chamadas
 *    com `===` igual ao current não criam entry. Pra deep, passe `equals`.
 *  - Sem persistência — history vive só na vida do componente
 *
 * Uso:
 *   const { current, set, undo, redo, canUndo, canRedo, reset } =
 *     useDraftHistory(initial);
 *   set(newValue);  // push no stack
 *   undo();         // volta 1
 *   redo();         // avança 1 (se houver future branch)
 *   reset(newInit); // limpa stack, cursor = 0
 */

import { useCallback, useState } from 'react';

export interface DraftHistoryAPI<T> {
  current: T;
  set: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (initial: T) => void;
  /** Tamanho atual do stack (debug/UI). */
  depth: number;
}

export interface UseDraftHistoryOptions<T> {
  /** Máximo de entries no stack. Default 30. */
  maxSize?: number;
  /**
   * Equality custom — retorna true se 2 values são considerados iguais
   * (skipa push). Default: Object.is (reference). Use deep-equal pra
   * objetos complexos editados imutavelmente.
   */
  equals?: (a: T, b: T) => boolean;
}

export function useDraftHistory<T>(
  initial: T,
  options: UseDraftHistoryOptions<T> = {},
): DraftHistoryAPI<T> {
  const maxSize = options.maxSize ?? 30;
  const equals = options.equals ?? Object.is;

  // Stack em STATE (não ref): cap-by-FIFO pode trimar sem mudar cursor,
  // e nesse caso precisamos rerendear pra refletir o novo stack[cursor].
  // Penalidade: rerender extra durante undo/redo (cursor change re-cria render).
  // Aceito porque a alternativa (ref + force re-render flag) é mais frágil.
  const [stack, setStack] = useState<T[]>([initial]);
  const [cursor, setCursor] = useState<number>(0);

  const set = useCallback(
    (next: T): void => {
      setStack(prevStack => {
        // Re-leitura via setState callback pra evitar stale closures.
        // cursor da closure é OK porque ele JÁ disparou rerender se mudou,
        // que recria este callback com cursor novo.
        const currentVal = prevStack[cursor];
        if (equals(currentVal, next)) return prevStack;

        const truncated = prevStack.slice(0, cursor + 1);
        truncated.push(next);

        const overflow = Math.max(0, truncated.length - maxSize);
        const trimmed = overflow > 0 ? truncated.slice(overflow) : truncated;
        const nextCursor = trimmed.length - 1;

        // Atualiza cursor em paralelo. React batched updates garante que
        // ambos os setStates aplicam num único rerender.
        setCursor(nextCursor);
        return trimmed;
      });
    },
    [cursor, equals, maxSize],
  );

  const undo = useCallback((): void => {
    setCursor(c => (c > 0 ? c - 1 : c));
  }, []);

  const redo = useCallback((): void => {
    setCursor(c => (c < stack.length - 1 ? c + 1 : c));
  }, [stack.length]);

  const reset = useCallback((newInitial: T): void => {
    setStack([newInitial]);
    setCursor(0);
  }, []);

  return {
    current: stack[cursor],
    set,
    undo,
    redo,
    canUndo: cursor > 0,
    canRedo: cursor < stack.length - 1,
    reset,
    depth: stack.length,
  };
}
