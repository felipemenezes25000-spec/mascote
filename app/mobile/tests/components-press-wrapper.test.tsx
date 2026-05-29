/**
 * Regressão: ListItem / QuestCard / StatPill devem renderizar Pressable de
 * forma consistente (interativo ou não), sem cair no bug antigo de passar
 * `style` como função para um <View> — que o RN ignora silenciosamente,
 * deixando a linha sem padding/layout. Travamos: wrapper correto, onPress
 * disparando e estado disabled coerente.
 */
import { describe, expect, it, vi } from 'vitest';
import * as TestRenderer from 'react-test-renderer';
import { ListItem } from '@/components/ui/ListItem';
import { QuestCard } from '@/components/ui/QuestCard';
import { StatPill } from '@/components/ui/StatPill';

function render(node: React.ReactNode): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    r = TestRenderer.create(node as React.ReactElement);
  });
  return r;
}

function pressables(r: TestRenderer.ReactTestRenderer) {
  return r.root.findAll(n => (n.type as unknown) === 'rn-pressable');
}

describe('ListItem press wrapper', () => {
  it('renderiza Pressable desabilitado sem onPress e resolve style função sem quebrar', () => {
    const r = render(<ListItem title="Versão" description="1.0.0" />);
    const [p] = pressables(r);
    expect(p).toBeTruthy();
    expect(p.props.disabled).toBe(true);
    const resolved = (p.props.style as (s: { pressed: boolean }) => unknown)({ pressed: true });
    expect(Array.isArray(resolved)).toBe(true);
  });
  it('dispara onPress quando interativo', () => {
    const fn = vi.fn();
    const r = render(<ListItem title="Abrir" onPress={fn} />);
    const [p] = pressables(r);
    expect(p.props.disabled).toBe(false);
    p.props.onPress();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('QuestCard press wrapper', () => {
  it('quando concluído renderiza Pressable desabilitado', () => {
    const r = render(<QuestCard title="Quest" done onPress={() => undefined} />);
    const [p] = pressables(r);
    expect(p).toBeTruthy();
    expect(p.props.disabled).toBe(true);
  });
  it('dispara onPress quando ativo e não concluído', () => {
    const fn = vi.fn();
    const r = render(<QuestCard title="Quest" onPress={fn} />);
    const [p] = pressables(r);
    expect(p.props.disabled).toBe(false);
    p.props.onPress();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('StatPill', () => {
  it('renderiza View estático quando não há onPress', () => {
    const r = render(<StatPill label="Coins" value={12} />);
    expect(pressables(r).length).toBe(0);
    expect(r.toJSON()).toBeTruthy();
  });
  it('wira onPress como Pressable com role button', () => {
    const fn = vi.fn();
    const r = render(<StatPill label="Coins" value={12} onPress={fn} />);
    const [p] = pressables(r);
    expect(p).toBeTruthy();
    expect(p.props.accessibilityRole).toBe('button');
    p.props.onPress();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
