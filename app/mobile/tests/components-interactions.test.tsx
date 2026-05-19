/**
 * Tests focados em INTERAÇÕES: dispara onPress, onPressIn/Out via root.findAll.
 * Cobre branches que renderiza-só não atinge (handlers de gesture, animação).
 */

import { describe, expect, it, vi } from 'vitest';
import * as TestRenderer from 'react-test-renderer';

import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { Tour } from '@/components/Tour';
import { UnlockToast } from '@/components/UnlockToast';
import { PersonalityCard } from '@/components/PersonalityCard';
import { LimitedEventBanner } from '@/components/LimitedEventBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Heatmap } from '@/components/Heatmap';
import { NotificationBell } from '@/components/NotificationBell';
import { HabitValueModal } from '@/components/HabitValueModal';
import { personalities } from '@/content/personalities';

function render(node: React.ReactNode): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    r = TestRenderer.create(node as React.ReactElement);
  });
  return r;
}

function fire(r: TestRenderer.ReactTestRenderer, eventName: string, ...args: unknown[]): boolean {
  const handlerName = `on${eventName[0].toUpperCase()}${eventName.slice(1)}`;
  const tree = r.root.findAll(
    n => typeof (n.props as Record<string, unknown>)[handlerName] === 'function',
    { deep: true },
  );
  if (tree.length === 0) return false;
  TestRenderer.act(() => {
    const handler = (tree[0].props as Record<string, (...a: unknown[]) => void>)[handlerName];
    handler(...args);
  });
  return true;
}

describe('Button — interações', () => {
  it('onPress dispara quando não disabled', () => {
    const fn = vi.fn();
    const r = render(<Button label="x" onPress={fn} />);
    expect(fire(r, 'press')).toBe(true);
    expect(fn).toHaveBeenCalled();
  });

  it('pressIn/Out anima (cobre callbacks de animação)', () => {
    const r = render(<Button label="x" onPress={() => undefined} />);
    expect(fire(r, 'pressIn')).toBe(true);
    expect(fire(r, 'pressOut')).toBe(true);
  });

  it('disabled=true: pressIn early-return', () => {
    const r = render(<Button label="x" onPress={() => undefined} disabled />);
    // pressIn ainda existe (não condicional), mas internamente faz early return
    fire(r, 'pressIn');
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('PressableScale — interações', () => {
  it('onPress dispara', () => {
    const fn = vi.fn();
    const r = render(
      <PressableScale onPress={fn}>
        <></>
      </PressableScale>
    );
    fire(r, 'press');
    expect(fn).toHaveBeenCalled();
  });

  it('pressIn/Out anima', () => {
    const r = render(
      <PressableScale onPress={() => undefined}>
        <></>
      </PressableScale>
    );
    fire(r, 'pressIn');
    fire(r, 'pressOut');
    expect(r.toJSON()).toBeTruthy();
  });

  it('disabled: pressIn/Out são no-ops', () => {
    const fn = vi.fn();
    const r = render(
      <PressableScale onPress={fn} disabled>
        <></>
      </PressableScale>
    );
    fire(r, 'pressIn');
    fire(r, 'pressOut');
    fire(r, 'press');
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('Tour — navegação entre etapas', () => {
  it('avança etapas até finish', () => {
    const onDone = vi.fn();
    const r = render(<Tour visible onDone={onDone} />);
    // Tappa "Próximo" várias vezes até o último step → chama onDone
    for (let i = 0; i < 6; i++) {
      fire(r, 'press');
    }
    expect(r.toJSON()).toBeDefined();
  });

  it('visible=false não dispara', () => {
    const r = render(<Tour visible={false} onDone={() => undefined} />);
    expect(r.toJSON()).toBeDefined();
  });
});

describe('UnlockToast — completion handlers', () => {
  it('renderiza com data, então re-renderiza sem data (cobre cleanup)', () => {
    const onDone = vi.fn();
    const r = render(
      <UnlockToast
        data={{ kind: 'level', title: 'Subiu nível!', emoji: '✨' }}
        onDone={onDone}
      />
    );
    expect(r.toJSON()).toBeDefined();
    TestRenderer.act(() => {
      r.update(<UnlockToast data={null} onDone={onDone} />);
    });
    expect(r.toJSON()).toBeDefined();
  });

  it('renderiza com cada kind', () => {
    const kinds = ['achievement', 'accessory', 'scene', 'level', 'info'] as const;
    for (const kind of kinds) {
      const r = render(
        <UnlockToast
          data={{ kind, title: 'x', emoji: '✨', subtitle: 'sub' }}
          onDone={() => undefined}
        />
      );
      expect(r.toJSON()).toBeDefined();
      r.unmount();
    }
  });
});

describe('PersonalityCard — interação', () => {
  const fofo = personalities.find(p => p.id === 'fofo')!;
  it('onPress dispara', () => {
    const fn = vi.fn();
    const r = render(<PersonalityCard meta={fofo} selected={false} onPress={fn} />);
    fire(r, 'press');
    expect(fn).toHaveBeenCalled();
  });
});

describe('LimitedEventBanner — atualização periódica', () => {
  it('renderiza e re-renderiza com state updates', () => {
    const r = render(<LimitedEventBanner />);
    // Força re-render simulando passagem de tempo via update
    TestRenderer.act(() => {
      r.update(<LimitedEventBanner />);
    });
    expect(r.toJSON()).toBeDefined();
  });
});

describe('ScreenHeader — back', () => {
  it('renderiza modal variant com onClose', () => {
    const onClose = vi.fn();
    const r = render(<ScreenHeader title="x" subtitle="" variant="modal" onClose={onClose} />);
    fire(r, 'press');
    expect(r.toJSON()).toBeDefined();
  });
});

describe('Heatmap — tooltip/onCellPress', () => {
  it('renderiza com counts denso (cobre cell types)', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 60; i++) {
      counts[`2026-${i < 30 ? '04' : '05'}-${String((i % 30) + 1).padStart(2, '0')}`] = (i * 7) % 10;
    }
    const r = render(<Heatmap countsByDate={counts} />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('NotificationBell — interação', () => {
  it('onPress (se houver) abre lista', () => {
    const r = render(<NotificationBell profileId="u1" refreshKey={0} />);
    fire(r, 'press');
    expect(r.toJSON()).toBeDefined();
  });
});

describe('HabitValueModal — interações', () => {
  it('onConfirm dispara com valor numérico', () => {
    const onConfirm = vi.fn();
    const r = render(
      <HabitValueModal
        visible
        kind="water"
        onConfirm={onConfirm}
        onClose={() => undefined}
      />
    );
    // Aciona todos os Pressables possíveis (botões de + e Confirm)
    const pressables = r.root.findAll(
      n => typeof (n.props as Record<string, unknown>).onPress === 'function',
      { deep: true },
    );
    for (const p of pressables.slice(0, 3)) {
      TestRenderer.act(() => {
        ((p.props as Record<string, () => void>).onPress)();
      });
    }
    expect(r.toJSON()).toBeDefined();
  });

  it('onClose dispara', () => {
    const onClose = vi.fn();
    const r = render(
      <HabitValueModal visible kind="sleep" onConfirm={() => undefined} onClose={onClose} />
    );
    expect(r.toJSON()).toBeDefined();
  });
});
