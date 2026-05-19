/**
 * `renderHook` minimal por cima do `react-test-renderer`.
 *
 * @testing-library/react-native v12 não bate com vitest 4 + rolldown — a
 * cadeia de tipos de `act.d.ts` quebra a parse de TSX. Como precisamos só
 * de renderHook, escrevemos uma versão de 30 linhas que serve o mesmo papel.
 *
 * API:
 *  - `renderHook(() => useFoo())` → { result, rerender, unmount }
 *  - `act(() => ...)` re-exportado do react-test-renderer
 */

import * as TestRenderer from 'react-test-renderer';
import { type ReactNode } from 'react';

export interface HookResult<T> {
  current: T;
}

export interface RenderHookReturn<T, P> {
  result: HookResult<T>;
  rerender: (newProps?: P) => void;
  unmount: () => void;
}

interface ProbeProps<T> {
  hook: () => T;
  capture: (v: T) => void;
}

function HookProbe<T>({ hook, capture }: ProbeProps<T>): ReactNode {
  capture(hook());
  return null;
}

/**
 * Renderiza um hook em isolamento, captura `result.current`, e expõe
 * `rerender` pra forçar re-render (com props novas, se aplicável).
 *
 * Exemplo:
 *  const { result, rerender } = renderHook(({ x }) => useFoo(x), {
 *    initialProps: { x: 1 },
 *  });
 *  rerender({ x: 2 });
 *  expect(result.current).toBe(...);
 */
export function renderHook<T, P = void>(
  hookFn: (props: P) => T,
  options: { initialProps?: P } = {}
): RenderHookReturn<T, P> {
  const result: HookResult<T> = { current: undefined as unknown as T };
  let currentProps = options.initialProps as P;
  let renderer!: TestRenderer.ReactTestRenderer;

  TestRenderer.act(() => {
    renderer = TestRenderer.create(
      <HookProbe<T>
        hook={() => hookFn(currentProps)}
        capture={v => { result.current = v; }}
      />
    );
  });

  function rerender(newProps?: P): void {
    if (newProps !== undefined) currentProps = newProps;
    TestRenderer.act(() => {
      renderer.update(
        <HookProbe<T>
          hook={() => hookFn(currentProps)}
          capture={v => { result.current = v; }}
        />
      );
    });
  }

  function unmount(): void {
    TestRenderer.act(() => {
      renderer.unmount();
    });
  }

  return { result, rerender, unmount };
}

export const act = TestRenderer.act;

/**
 * Espera condição ficar verdadeira (poll cada ~10ms até timeout).
 * Necessário pra hooks com useEffect que disparam fetch async.
 */
export async function waitFor(
  predicate: () => void | Promise<void>,
  opts: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const timeout = opts.timeout ?? 1000;
  const interval = opts.interval ?? 10;
  const deadline = Date.now() + timeout;
  let lastErr: unknown = null;
  while (Date.now() < deadline) {
    try {
      await predicate();
      return;
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, interval));
    }
  }
  throw lastErr ?? new Error('waitFor timed out');
}
