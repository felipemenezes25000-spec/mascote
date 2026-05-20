/**
 * ChatReplyRating — feedback de resposta da IA.
 */

import { describe, expect, it, vi } from 'vitest';
import * as TestRenderer from 'react-test-renderer';
import { ChatReplyRating } from '@/components/ChatReplyRating';

describe('ChatReplyRating', () => {
  it('chama onRate com helpful=true e mostra agradecimento', () => {
    const onRate = vi.fn();
    const tree = TestRenderer.create(<ChatReplyRating onRate={onRate} />);
    const utilBtn = tree.root.findByProps({ accessibilityLabel: 'Resposta útil' });
    TestRenderer.act(() => {
      utilBtn.props.onPress();
    });
    expect(onRate).toHaveBeenCalledWith(true, false);
    expect(tree.root.findByProps({ children: 'Obrigado pelo feedback' })).toBeTruthy();
  });

  it('chama onRate com repetition=true em Repetiu?', () => {
    const onRate = vi.fn();
    const tree = TestRenderer.create(<ChatReplyRating onRate={onRate} />);
    const btn = tree.root.findByProps({ accessibilityLabel: 'Já vi essa resposta antes' });
    TestRenderer.act(() => {
      btn.props.onPress();
    });
    expect(onRate).toHaveBeenCalledWith(false, true);
  });

  it('chama onRate com helpful=false em Não ajudou', () => {
    const onRate = vi.fn();
    const tree = TestRenderer.create(<ChatReplyRating onRate={onRate} />);
    const btn = tree.root.findByProps({ accessibilityLabel: 'Resposta não ajudou' });
    TestRenderer.act(() => {
      btn.props.onPress();
    });
    expect(onRate).toHaveBeenCalledWith(false, false);
  });
});
