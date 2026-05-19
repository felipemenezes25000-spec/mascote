/**
 * Smoke tests dos componentes secundários — garantem que cada um renderiza
 * em isolamento sem crashar. Não verifica visual, apenas estrutura mínima
 * e cobertura de branches dos props.
 */

import { describe, expect, it, vi } from 'vitest';
import * as TestRenderer from 'react-test-renderer';
import { ChatBubble } from '@/components/ChatBubble';
import { ComboRing } from '@/components/ComboRing';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { DailyRewardStrip, DAILY_REWARDS } from '@/components/DailyRewardStrip';
import { EmptyState } from '@/components/EmptyState';
import { EndowmentCard, EndowmentRow } from '@/components/EndowmentCard';
import { EvolutionModal } from '@/components/EvolutionModal';
import { HabitChart } from '@/components/HabitChart';
import { HabitValueModal } from '@/components/HabitValueModal';
import { Heatmap } from '@/components/Heatmap';
import { HeroSwipeable } from '@/components/HeroSwipeable';
import { HomeSkeleton } from '@/components/HomeSkeleton';
import { Icon } from '@/components/Icon';
import { LimitedEventBanner } from '@/components/LimitedEventBanner';
import { MissionCard } from '@/components/MissionCard';
import { MysteryBoxCard } from '@/components/MysteryBoxCard';
import { NotificationBell } from '@/components/NotificationBell';
import { PersonalityCard } from '@/components/PersonalityCard';
import { personalities } from '@/content/personalities';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Skeleton } from '@/components/Skeleton';
import { StaggeredView } from '@/components/StaggeredView';
import { Tour } from '@/components/Tour';
import { UnlockToast } from '@/components/UnlockToast';
import { WalletPills } from '@/components/WalletPills';

function render(node: React.ReactNode): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    r = TestRenderer.create(node as React.ReactElement);
  });
  return r;
}

describe('ChatBubble', () => {
  it('renderiza role=user', () => {
    const r = render(<ChatBubble role="user" text="oi" />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('renderiza role=mascot', () => {
    const r = render(<ChatBubble role="mascot" text="oi de volta" />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('renderiza com safety flag watch', () => {
    const r = render(<ChatBubble role="mascot" text="x" safetyFlag="watch" />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('renderiza com safety flag critical (estilo de crise)', () => {
    const r = render(<ChatBubble role="mascot" text="x" safetyFlag="critical" />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('mascot com mascotColor aplica tint custom', () => {
    const r = render(<ChatBubble role="mascot" text="x" mascotColor="#7BAE7A" />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('ComboRing', () => {
  it('renderiza diferentes níveis de combo', () => {
    for (const combo of [1, 2, 3, 4, 5]) {
      const r = render(<ComboRing combo={combo} bonusPct={combo * 5} />);
      expect(r.toJSON()).toBeTruthy();
      r.unmount();
    }
  });
});

describe('ConfettiBurst', () => {
  it('renderiza visible=true', () => {
    const r = render(<ConfettiBurst visible />);
    expect(r.toJSON()).toBeDefined();
  });
  it('visible=false', () => {
    const r = render(<ConfettiBurst visible={false} />);
    expect(r.toJSON()).toBeDefined();
  });
});

describe('DailyRewardStrip', () => {
  it('renderiza com claimedToday=false', () => {
    const r = render(
      <DailyRewardStrip currentDay={1} claimedToday={false} onClaim={() => undefined} />
    );
    expect(r.toJSON()).toBeTruthy();
  });
  it('renderiza com claimedToday=true', () => {
    const r = render(
      <DailyRewardStrip currentDay={3} claimedToday onClaim={() => undefined} />
    );
    expect(r.toJSON()).toBeTruthy();
  });
  it('exporta DAILY_REWARDS array', () => {
    expect(DAILY_REWARDS.length).toBeGreaterThan(0);
  });
});

describe('EmptyState', () => {
  it('renderiza com title + body', () => {
    const r = render(<EmptyState title="Vazio" body="Nada aqui ainda" />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('renderiza com emoji', () => {
    const r = render(<EmptyState title="Vazio" emoji="📭" body="x" />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('EndowmentCard / EndowmentRow', () => {
  it('EndowmentRow renderiza com items', () => {
    const r = render(
      <EndowmentRow
        items={[
          { label: 'check-ins', value: '42' },
          { label: 'streak', value: '7' },
          { label: 'nível', value: '3' },
        ]}
      />
    );
    expect(r.toJSON()).toBeTruthy();
  });
  it('EndowmentCard renderiza', () => {
    const r = render(<EndowmentCard label="check-ins" value="42" />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('EndowmentCard com emoji', () => {
    const r = render(<EndowmentCard label="streak" value="7" emoji="🔥" />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('EndowmentCard com icon SVG (caminho do icon, não emoji)', () => {
    const r = render(<EndowmentCard label="check-ins" value="12" icon="trophy" />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('EndowmentCard sem icon nem emoji (caminho null)', () => {
    const r = render(<EndowmentCard label="streak" value="0" />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('EvolutionModal', () => {
  const mascot = {
    id: 'm1', user_id: 'u1', name: 'Robo', personality: 'calmo' as const,
    phase: 'bebe' as const, mood: 'feliz' as const, xp: 100, level: 2,
    energy: 80, health: 100, last_seen_at: 'x', created_at: 'x',
  };
  it('renderiza visible=false', () => {
    const r = render(
      <EvolutionModal visible={false} mascot={mascot} fromPhase="ovo" onClose={() => undefined} />
    );
    expect(r.toJSON()).toBeDefined();
  });
  it('renderiza visible=true', () => {
    const r = render(
      <EvolutionModal visible mascot={mascot} fromPhase="bebe" onClose={() => undefined} />
    );
    expect(r.toJSON()).toBeDefined();
  });
  it('com storyTitle/Body customizados', () => {
    const r = render(
      <EvolutionModal
        visible
        mascot={mascot}
        fromPhase="bebe"
        onClose={() => undefined}
        storyTitle="Cresceu!"
        storyBody="você plantou e ele cresceu"
        storyQuote="constância"
      />
    );
    expect(r.toJSON()).toBeDefined();
  });
});

describe('HabitChart', () => {
  it('renderiza com checkins', () => {
    const checkins = [1, 2, 3, 4, 5, 4, 3].map((c, i) => ({
      id: 'c' + i, user_id: 'u1',
      habit_kind: 'water' as const, value: c, unit: null,
      occurred_on: '2026-05-' + String(15 + i).padStart(2, '0'),
      occurred_at: '2026-05-' + String(15 + i).padStart(2, '0') + 'T08:00:00Z',
      xp_awarded: 10, idempotency_key: 'k' + i, created_at: 'x',
    }));
    const r = render(<HabitChart kind="water" checkins={checkins} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('renderiza com checkins vazio', () => {
    const r = render(<HabitChart kind="water" checkins={[]} />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('HabitValueModal', () => {
  it('renderiza visible=true', () => {
    const r = render(
      <HabitValueModal
        visible
        kind="water"
        onConfirm={() => undefined}
        onClose={() => undefined}
      />
    );
    expect(r.toJSON()).toBeTruthy();
  });
  it('renderiza visible=false', () => {
    const r = render(
      <HabitValueModal
        visible={false}
        kind="sleep"
        onConfirm={() => undefined}
        onClose={() => undefined}
      />
    );
    expect(r.toJSON()).toBeDefined();
  });
});

describe('Heatmap', () => {
  it('renderiza com countsByDate', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 30; i++) counts[`2026-05-${String(i + 1).padStart(2, '0')}`] = i % 4;
    const r = render(<Heatmap countsByDate={counts} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('renderiza com weeks customizado', () => {
    const r = render(<Heatmap countsByDate={{}} weeks={4} />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('HeroSwipeable', () => {
  it('renderiza com callbacks de swipe', () => {
    const r = render(
      <HeroSwipeable onPrev={() => undefined} onNext={() => undefined}>
        <></>
      </HeroSwipeable>
    );
    expect(r.toJSON()).toBeTruthy();
  });
  it('aceita threshold customizado', () => {
    const r = render(
      <HeroSwipeable onPrev={() => undefined} onNext={() => undefined} threshold={100}>
        <></>
      </HeroSwipeable>
    );
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('HomeSkeleton', () => {
  it('renderiza placeholder', () => {
    const r = render(<HomeSkeleton />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('Icon', () => {
  it('renderiza todos os IconNames conhecidos sem crash', () => {
    const names: import('@/components/Icon').IconName[] = [
      'home', 'message-circle', 'sparkles', 'bar-chart', 'arrow-left', 'arrow-right',
      'chevron-right', 'chevron-down', 'x', 'plus', 'check',
      'flame', 'star', 'trophy', 'target', 'zap', 'gift', 'coins', 'gem', 'package', 'crown',
      'droplet', 'moon', 'dumbbell', 'wind', 'heart', 'book', 'pencil', 'tree', 'sun',
      'bell', 'settings', 'user', 'share', 'info', 'help-circle', 'alert-triangle',
      'shield', 'sparkle', 'clock', 'calendar', 'lock', 'unlock',
    ];
    for (const name of names) {
      const r = render(<Icon name={name} size={24} color="#000" strokeWidth={2} />);
      expect(r.toJSON()).toBeDefined();
      r.unmount();
    }
  });

  it('aceita fill prop', () => {
    const r = render(<Icon name="heart" size={24} color="#000" strokeWidth={2} fill="#f00" />);
    expect(r.toJSON()).toBeDefined();
  });
});

describe('LimitedEventBanner', () => {
  it('renderiza (banner condicional pode estar null)', () => {
    const r = render(<LimitedEventBanner />);
    // Pode ser null se nenhum evento ativo
    expect(r.toJSON()).toBeDefined();
  });
});

describe('MissionCard', () => {
  it('renderiza pending', () => {
    const r = render(
      <MissionCard
        title="Beba 2 copos"
        description="curtinha"
        xp={20}
        completed={false}
        onPress={() => undefined}
      />
    );
    expect(r.toJSON()).toBeTruthy();
  });
  it('renderiza completed', () => {
    const r = render(
      <MissionCard title="ok" description="" xp={10} completed onPress={() => undefined} />
    );
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('MysteryBoxCard', () => {
  it('available=true', () => {
    const r = render(<MysteryBoxCard available onOpen={() => undefined} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('available=false', () => {
    const r = render(<MysteryBoxCard available={false} onOpen={() => undefined} />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('NotificationBell', () => {
  it('renderiza com profileId', () => {
    const r = render(<NotificationBell profileId="u1" refreshKey={0} />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('PersonalityCard', () => {
  const calmo = personalities.find(p => p.id === 'calmo')!;
  const motivador = personalities.find(p => p.id === 'motivador')!;
  it('renderiza calmo selected=false', () => {
    const r = render(
      <PersonalityCard meta={calmo} selected={false} onPress={() => undefined} />
    );
    expect(r.toJSON()).toBeTruthy();
  });
  it('renderiza motivador selected=true', () => {
    const r = render(
      <PersonalityCard meta={motivador} selected onPress={() => undefined} />
    );
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('PressableScale', () => {
  it('renderiza com onPress', () => {
    const r = render(
      <PressableScale onPress={() => undefined}>
        <></>
      </PressableScale>
    );
    expect(r.toJSON()).toBeTruthy();
  });
  it('disabled', () => {
    const r = render(
      <PressableScale onPress={() => undefined} disabled>
        <></>
      </PressableScale>
    );
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('ScreenHeader', () => {
  it('renderiza title + subtitle', () => {
    const r = render(<ScreenHeader title="Titulo" subtitle="sub" />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('variant modal', () => {
    const r = render(<ScreenHeader title="X" subtitle="" variant="modal" />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('Skeleton', () => {
  it('renderiza com width/height', () => {
    const r = render(<Skeleton width={100} height={20} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('renderiza com radius', () => {
    const r = render(<Skeleton width={50} height={50} radius={25} />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('StaggeredView', () => {
  it('renderiza com index', () => {
    const r = render(
      <StaggeredView index={0}>
        <></>
      </StaggeredView>
    );
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('Tour', () => {
  it('visible=true mostra primeira etapa', () => {
    const r = render(<Tour visible onDone={() => undefined} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('visible=false', () => {
    const r = render(<Tour visible={false} onDone={() => undefined} />);
    expect(r.toJSON()).toBeDefined();
  });
});

describe('UnlockToast', () => {
  it('null sem data → não renderiza', () => {
    const r = render(<UnlockToast data={null} onDone={() => undefined} />);
    expect(r.toJSON()).toBeDefined();
  });
  it('renderiza com toast data', () => {
    const r = render(
      <UnlockToast
        data={{
          kind: 'achievement',
          title: 'Conquista',
          subtitle: 'parabéns',
          emoji: '🏆',
        }}
        onDone={() => undefined}
      />
    );
    expect(r.toJSON()).toBeDefined();
  });
});

describe('WalletPills', () => {
  it('renderiza moedas + gems', () => {
    const r = render(<WalletPills coins={100} gems={5} streakDays={7} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('renderiza sem streakDays', () => {
    const r = render(<WalletPills coins={0} gems={0} />);
    expect(r.toJSON()).toBeTruthy();
  });
});
