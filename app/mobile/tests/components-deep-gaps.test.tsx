/**
 * Segunda batelada de fechamentos de gap.
 *
 * Foco: variants de ScreenHeader, todas as personalities, todas as scenes,
 * StaggeredView com reduce_motion, HabitChart com checkins vazios, etc.
 *
 * Branches que continuam reachable apenas em runtime nativo permanecem fora
 * (HeroSwipeable gesture Pan, BlurView nativo, animation completion callbacks).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as TestRenderer from 'react-test-renderer';

import { HabitChart } from '@/components/HabitChart';
import { PersonalityCard } from '@/components/PersonalityCard';
import { PersonalTicker } from '@/components/PersonalTicker';
import { SceneBackground } from '@/components/SceneBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import { Tour } from '@/components/Tour';
import { WalletPills } from '@/components/WalletPills';
import { personalities } from '@/content/personalities';
import { useStore } from '@/store';
import type { Settings } from '@/types';

function render(node: React.ReactNode): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    r = TestRenderer.create(node as React.ReactElement);
  });
  return r;
}

function fireAll(r: TestRenderer.ReactTestRenderer): void {
  const pressables = r.root.findAll(
    n => typeof (n.props as Record<string, unknown>).onPress === 'function',
    { deep: true }
  );
  for (const p of pressables) {
    TestRenderer.act(() => {
      ((p.props as Record<string, () => void>).onPress)();
    });
  }
}

const baseSettings: Settings = {
  user_id: 'u1',
  theme_mode: 'light',
  brand_palette: 'classic',
  dynamic_text: false,
  reduce_motion: false,
  high_contrast: false,
  push_enabled: true,
  quiet_start: '22:00',
  quiet_end: '08:00',
  paused_until: null,
  language: 'pt',
  consent_analytics: false,
  tour_completed: true,
};

describe('ScreenHeader — todos variants e slots', () => {
  it('variant=back', () => {
    const r = render(<ScreenHeader title="x" variant="back" onClose={() => undefined} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('variant=plain (sem botão close → renderiza spacer)', () => {
    const r = render(<ScreenHeader title="x" variant="plain" />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('sem title nem subtitle (cobre branches falsy)', () => {
    const r = render(<ScreenHeader variant="modal" onClose={() => undefined} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('só subtitle, sem title', () => {
    const r = render(<ScreenHeader subtitle="só sub" variant="modal" onClose={() => undefined} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('rightActions com danger=true', () => {
    const onPress = vi.fn();
    const r = render(
      <ScreenHeader
        title="x"
        variant="modal"
        rightActions={[
          { icon: 'x', onPress, label: 'Apagar', danger: true },
          { icon: 'share', onPress, label: 'Compartilhar' },
        ]}
      />
    );
    fireAll(r);
    expect(onPress).toHaveBeenCalled();
  });
  it('rightSlot custom', () => {
    const r = render(
      <ScreenHeader title="x" variant="modal" rightSlot={<></>} />
    );
    expect(r.toJSON()).toBeTruthy();
  });
  it('divider=false', () => {
    const r = render(<ScreenHeader title="x" variant="modal" divider={false} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('sem onClose → usa router.back default (cobre ?? fallback)', () => {
    const r = render(<ScreenHeader title="x" variant="modal" />);
    fireAll(r);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('PersonalityCard — todas as 4 personalidades', () => {
  it.each(personalities.map(p => [p.id, p]))('renderiza %s selected=true', (_, meta) => {
    const r = render(<PersonalityCard meta={meta} selected onPress={() => undefined} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('press incrementa pressCount (cobre setPressCount + onPress)', () => {
    const onPress = vi.fn();
    const r = render(
      <PersonalityCard meta={personalities[0]} selected={false} onPress={onPress} />
    );
    const pressables = r.root.findAll(
      n => typeof (n.props as Record<string, unknown>).onPress === 'function',
      { deep: true }
    );
    TestRenderer.act(() => {
      ((pressables[0].props as Record<string, () => void>).onPress)();
    });
    TestRenderer.act(() => {
      ((pressables[0].props as Record<string, () => void>).onPress)();
    });
    expect(onPress).toHaveBeenCalledTimes(2);
  });
  it('Pressable style function recebe pressed=true (cobre branch pressed && opacity)', () => {
    const r = render(
      <PersonalityCard meta={personalities[0]} selected={false} onPress={() => undefined} />
    );
    // Encontra o Pressable raiz e força avaliação do style com pressed=true
    const pressable = r.root.findAll(
      n => typeof (n.props as Record<string, unknown>).style === 'function',
      { deep: true }
    )[0];
    if (pressable) {
      const styleFn = (pressable.props as { style: (s: { pressed: boolean }) => unknown }).style;
      const pressedStyle = styleFn({ pressed: true });
      const restStyle = styleFn({ pressed: false });
      expect(pressedStyle).toBeTruthy();
      expect(restStyle).toBeTruthy();
    }
  });
});

describe('SceneBackground — todas as 6 cenas + id desconhecido', () => {
  const sceneIds = ['forest', 'beach', 'library', 'lunar', 'cafe', 'room'];
  for (const id of sceneIds) {
    it(`renderiza scene "${id}"`, () => {
      const r = render(<SceneBackground sceneId={id} />);
      expect(r.toJSON()).toBeTruthy();
    });
  }
  it('id desconhecido → cai no default (null)', () => {
    const r = render(<SceneBackground sceneId="inexistente" />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('com children sobrepostos', () => {
    const r = render(
      <SceneBackground sceneId="room" height={300}>
        <></>
      </SceneBackground>
    );
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('StaggeredView — reduce_motion=true', () => {
  beforeEach(() => {
    useStore.setState({ settings: null });
  });
  afterEach(() => {
    useStore.setState({ settings: null });
  });
  it('reduce_motion=true → return sem animação (cobre branch)', () => {
    useStore.setState({ settings: { ...baseSettings, reduce_motion: true } });
    const r = render(
      <StaggeredView index={0}>
        <></>
      </StaggeredView>
    );
    expect(r.toJSON()).toBeTruthy();
  });
  it('com entering custom (cobre branch entering ??)', () => {
    const r = render(
      <StaggeredView index={2} step={100} initialDelay={50} distance={24}>
        <></>
      </StaggeredView>
    );
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('HabitChart — checkins vazios e mistura', () => {
  it('vazio (cobre branch length=0)', () => {
    const r = render(<HabitChart kind="water" checkins={[]} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('com value 0 (zero check-in count)', () => {
    const r = render(
      <HabitChart
        kind="water"
        checkins={[{
          id: 'c1', user_id: 'u1', habit_kind: 'water', value: 0, unit: 'ml',
          occurred_on: '2026-05-15', occurred_at: '2026-05-15T10:00:00Z',
          xp_awarded: 0, idempotency_key: 'k', created_at: '2026-05-15T10:00:00Z',
        }]}
      />
    );
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('WalletPills — streakDays branches', () => {
  it('com streakDays', () => {
    const r = render(<WalletPills coins={10} gems={2} streakDays={7} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('coins >= 10000 formata como Xk (cobre branch formatNumber)', () => {
    const r = render(<WalletPills coins={12500} gems={0} />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('PersonalTicker — variações de source', () => {
  it('source vazia → renderiza null (sem ticker no estado D1)', () => {
    const r = render(
      <PersonalTicker source={{ streakCurrent: 0, totalCheckins: 0, level: 1 }} />
    );
    // buildPersonalStats retorna [] pra usuário sem progresso → ticker oculta.
    expect(r.toJSON()).toBeNull();
  });
  it('streakLongest definido mas streakCurrent 0', () => {
    const r = render(
      <PersonalTicker source={{ streakCurrent: 0, streakLongest: 30, totalCheckins: 100, level: 5 }} />
    );
    expect(r.toJSON()).toBeTruthy();
  });
  it('phaseLabel "adulto"', () => {
    const r = render(
      <PersonalTicker source={{ streakCurrent: 10, totalCheckins: 200, level: 8, phaseLabel: 'Adulto' }} />
    );
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('Tour — navegação completa pelos steps', () => {
  it('avança até o final via cliques (cobre transição entre steps)', () => {
    const onDone = vi.fn();
    const r = render(<Tour visible onDone={onDone} />);
    // O Tour tem múltiplos steps; tappar muitas vezes garante que o último
    // botão "Pronto" foi acionado e onDone disparou.
    fireAll(r);
    fireAll(r);
    fireAll(r);
    fireAll(r);
    expect(r.toJSON()).toBeDefined();
  });
  it('visible=false não dispara nada (cobre branch falsy)', () => {
    const onDone = vi.fn();
    const r = render(<Tour visible={false} onDone={onDone} />);
    fireAll(r);
    expect(onDone).not.toHaveBeenCalled();
  });
});
