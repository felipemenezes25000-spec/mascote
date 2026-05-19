import { describe, expect, it } from 'vitest';
import * as TestRenderer from 'react-test-renderer';
import { useState } from 'react';

describe('sanity TSX with react-test-renderer', () => {
  it('renders trivial component', () => {
    function Hello() {
      return null;
    }
    let tree: TestRenderer.ReactTestRenderer | null = null;
    TestRenderer.act(() => {
      tree = TestRenderer.create(<Hello />);
    });
    expect(tree).toBeTruthy();
  });

  it('reads state via custom renderHook', () => {
    let captured: number | undefined;
    function Probe() {
      const [n] = useState(42);
      captured = n;
      return null;
    }
    TestRenderer.act(() => {
      TestRenderer.create(<Probe />);
    });
    expect(captured).toBe(42);
  });
});
