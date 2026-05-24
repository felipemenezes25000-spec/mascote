import { describe, expect, it, vi } from 'vitest';
import * as TestRenderer from 'react-test-renderer';

function render(node: React.ReactNode): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    r = TestRenderer.create(node as React.ReactElement);
  });
  return r;
}

describe('MascotRenderer fallback chain', () => {
  it('renderiza sem crash em modo default', async () => {
    const { MascotRenderer } = await import('@/components/MascotRenderer');
    const r = render(
      <MascotRenderer
        personality="calmo"
        phase="bebe"
        mood="ok"
        size={120}
      />,
    );
    expect(r.toJSON()).toBeTruthy();
  });

  it('renderiza fallback2d quando env aponta fallback2d', async () => {
    const prev = process.env.EXPO_PUBLIC_MASCOT_RENDERER;
    process.env.EXPO_PUBLIC_MASCOT_RENDERER = 'fallback2d';
    const { MascotRenderer } = await import('@/components/MascotRenderer');
    const r = render(
      <MascotRenderer
        personality="calmo"
        phase="bebe"
        mood="ok"
        size={120}
      />,
    );
    expect(r.toJSON()).toBeTruthy();
    process.env.EXPO_PUBLIC_MASCOT_RENDERER = prev;
  });
});

