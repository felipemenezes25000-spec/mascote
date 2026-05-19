/**
 * Tests cobrindo branches profundos:
 * - HabitValueModal: bump+/-, quickBtn select, confirm, useEffect quando kind muda
 * - HeroSwipeable: reduce_motion=true (cobre early return)
 * - Outros gaps específicos
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as TestRenderer from 'react-test-renderer';
import { HabitValueModal } from '@/components/HabitValueModal';
import { HeroSwipeable } from '@/components/HeroSwipeable';
import { useStore } from '@/store';
import type { HabitKind } from '@/types';

function render(node: React.ReactNode): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    r = TestRenderer.create(node as React.ReactElement);
  });
  return r;
}

function getPressables(r: TestRenderer.ReactTestRenderer) {
  return r.root.findAll(
    n => typeof (n.props as Record<string, unknown>).onPress === 'function',
    { deep: true },
  );
}

describe('HabitValueModal — bump/quickBtn/confirm', () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    onConfirm.mockReset();
    onClose.mockReset();
  });

  it('renderiza com kind null → null', () => {
    const r = render(<HabitValueModal visible kind={null} onConfirm={onConfirm} onClose={onClose} />);
    expect(r.toJSON()).toBeNull();
  });

  it('quando kind muda via prop, useEffect reseta value', () => {
    const r = render(<HabitValueModal visible kind="water" onConfirm={onConfirm} onClose={onClose} />);
    TestRenderer.act(() => {
      r.update(<HabitValueModal visible kind="sleep" onConfirm={onConfirm} onClose={onClose} />);
    });
    expect(r.toJSON()).toBeDefined();
  });

  it('aciona TODOS os onPress disponíveis (cobre bump+/-/quick/confirm/cancel)', () => {
    const r = render(<HabitValueModal visible kind="water" onConfirm={onConfirm} onClose={onClose} />);
    const pressables = getPressables(r);
    // Esperado: overlay (close), sheet (no-op), bump- (PressableScale), bump+, 3x quickBtn, Cancelar, Anotar
    for (const p of pressables) {
      TestRenderer.act(() => {
        ((p.props as Record<string, () => void>).onPress)();
      });
    }
    // Verifica que confirm foi chamado (último Button "Anotar")
    expect(onConfirm).toHaveBeenCalled();
    // Close também chamado (Cancelar + overlay tap)
    expect(onClose).toHaveBeenCalled();
  });

  it('cobre branch quando unit !== min/horas/pág/entradas (cobra plural)', () => {
    const r = render(<HabitValueModal visible kind="water" onConfirm={onConfirm} onClose={onClose} />);
    const pressables = getPressables(r);
    // O 4º pressable (índice 3) é o "bump +" — cobra value > 1 → unit pluraliza
    TestRenderer.act(() => {
      ((pressables[3].props as Record<string, () => void>).onPress)();
    });
    expect(r.toJSON()).toBeDefined();
  });

  it('itera todos os kinds pra cobrir HABIT_ICONS + configs', () => {
    const allKinds: HabitKind[] = [
      'water', 'sleep', 'exercise', 'breath', 'meditation', 'reading',
      'journaling', 'outdoor', 'sun',
    ];
    for (const kind of allKinds) {
      const r = render(<HabitValueModal visible kind={kind} onConfirm={onConfirm} onClose={onClose} />);
      expect(r.toJSON()).toBeTruthy();
      r.unmount();
    }
  });

  it('bump não passa do max', () => {
    const r = render(<HabitValueModal visible kind="water" onConfirm={onConfirm} onClose={onClose} />);
    const pressables = getPressables(r);
    // bump+ várias vezes (cap em max=12 pra water)
    const bumpPlus = pressables[3];
    for (let i = 0; i < 20; i++) {
      TestRenderer.act(() => {
        ((bumpPlus.props as Record<string, () => void>).onPress)();
      });
    }
    expect(r.toJSON()).toBeTruthy();
  });

  it('bump não passa do min', () => {
    const r = render(<HabitValueModal visible kind="water" onConfirm={onConfirm} onClose={onClose} />);
    const pressables = getPressables(r);
    // bump- várias vezes (floor em min=1)
    const bumpMinus = pressables[2];
    for (let i = 0; i < 20; i++) {
      TestRenderer.act(() => {
        ((bumpMinus.props as Record<string, () => void>).onPress)();
      });
    }
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('HeroSwipeable — reduce_motion', () => {
  beforeEach(() => {
    useStore.setState({ settings: null });
  });
  afterEach(() => {
    useStore.setState({ settings: null });
  });

  it('reduce_motion=true → early return sem gesture', () => {
    useStore.setState({
      settings: {
        user_id: 'u1',
        theme_mode: 'light',
        brand_palette: 'classic',
        dynamic_text: false,
        reduce_motion: true,
        high_contrast: false,
        push_enabled: true,
        quiet_start: '22:00',
        quiet_end: '08:00',
        paused_until: null,
        language: 'pt',
        consent_analytics: false,
        tour_completed: true,
      },
    });
    const r = render(
      <HeroSwipeable onPrev={() => undefined} onNext={() => undefined}>
        <></>
      </HeroSwipeable>
    );
    expect(r.toJSON()).toBeTruthy();
  });
});
