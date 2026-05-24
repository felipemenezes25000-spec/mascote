import { describe, expect, it } from 'vitest';
import * as TestRenderer from 'react-test-renderer';
import { UnityDebugPanel } from '@/components/unity/UnityDebugPanel';

function render(node: React.ReactNode): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    r = TestRenderer.create(node as React.ReactElement);
  });
  return r;
}

describe('UnityDebugPanel', () => {
  it('renderiza estatísticas ACK no painel debug (Home)', () => {
    const r = render(
      <UnityDebugPanel
        version="8.0.0"
        ready
        lastError={null}
        lastMessage="ack"
        native
        ackLatencyMs={123}
        ackRetryCount={2}
        ackLastSeq={17}
        ackTimeoutCount={1}
      />,
    );

    const texts = r.root.findAll(el => String(el.type) === 'rn-text').map(el => {
      const child = Array.isArray(el.props.children) ? el.props.children.join('') : String(el.props.children ?? '');
      return child;
    });

    expect(texts.some(t => t.includes('ack ms: 123') && t.includes('retry: 2'))).toBe(true);
    expect(texts.some(t => t.includes('ack seq: 17') && t.includes('timeout: 1'))).toBe(true);
  });
});
