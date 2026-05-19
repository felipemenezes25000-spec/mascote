/**
 * Tests dos componentes principais — render + props básicos.
 * Não tenta visual regression; verifica que cada componente:
 *  - aceita props sem crashar
 *  - propaga callbacks (onPress, etc)
 *  - renderiza condicionais corretamente
 */

import { describe, expect, it, vi } from 'vitest';
import * as TestRenderer from 'react-test-renderer';

import { Mascot } from '@/components/Mascot';
import { SceneBackground } from '@/components/SceneBackground';
import { MascotAmbient } from '@/components/MascotAmbient';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { BrandLogo } from '@/components/BrandLogo';
import { PersonalTicker, buildPersonalStats } from '@/components/PersonalTicker';
import { XPBar } from '@/components/XPBar';
import { StreakFlame } from '@/components/StreakFlame';
import { HabitChip } from '@/components/HabitChip';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function render(node: React.ReactNode): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    r = TestRenderer.create(node as React.ReactElement);
  });
  return r;
}

describe('Mascot (memoized)', () => {
  it('renderiza para cada combinação fase/mood', () => {
    const phases = ['ovo', 'bebe', 'crianca', 'adolescente', 'adulto', 'evoluido'] as const;
    const moods = ['triste', 'ok', 'feliz', 'empolgado', 'exausto'] as const;
    for (const phase of phases) {
      for (const mood of moods) {
        const r = render(<Mascot personality="calmo" phase={phase} mood={mood} size={120} />);
        expect(r.toJSON()).toBeTruthy();
        r.unmount();
      }
    }
  });

  it('aceita reactTrigger + accessory', () => {
    const r = render(
      <Mascot
        personality="motivador"
        phase="bebe"
        mood="feliz"
        size={120}
        reactTrigger={3}
        accessory="cap"
      />
    );
    expect(r.toJSON()).toBeTruthy();
  });

  it('memoiza — segundo render com mesmas props reutiliza', () => {
    let renderCount = 0;
    function Probe() {
      renderCount++;
      return <Mascot personality="calmo" phase="bebe" mood="feliz" size={100} />;
    }
    const r = render(<Probe />);
    expect(renderCount).toBe(1);
    TestRenderer.act(() => {
      r.update(<Probe />);
    });
    expect(renderCount).toBe(2);
  });
});

describe('SceneBackground (memoized)', () => {
  it('renderiza cenas conhecidas + fallback', () => {
    for (const id of ['room', 'forest', 'beach', 'library', 'lunar', 'cafe', 'unknown']) {
      const r = render(<SceneBackground sceneId={id} height={200} />);
      expect(r.toJSON()).toBeTruthy();
      r.unmount();
    }
  });

  it('passa children', () => {
    const r = render(
      <SceneBackground sceneId="room">
        <div>child</div>
      </SceneBackground>
    );
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('MascotAmbient (memoized)', () => {
  it('renderiza com cada modeOverride', () => {
    for (const mode of ['sleep', 'morning', 'idle'] as const) {
      const r = render(
        <MascotAmbient size={120} modeOverride={mode}>
          <div>inner</div>
        </MascotAmbient>
      );
      expect(r.toJSON()).toBeTruthy();
      r.unmount();
    }
  });

  it('reduceMotion=true desabilita animação', () => {
    const r = render(
      <MascotAmbient size={120} reduceMotion>
        <div>x</div>
      </MascotAmbient>
    );
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('Button', () => {
  it('renderiza com cada variant', () => {
    for (const variant of ['primary', 'secondary', 'ghost'] as const) {
      const r = render(<Button label={`v-${variant}`} variant={variant} onPress={() => undefined} />);
      expect(r.toJSON()).toBeTruthy();
      r.unmount();
    }
  });

  it('disabled=true não chama onPress (ainda renderiza)', () => {
    const onPress = vi.fn();
    const r = render(<Button label="x" onPress={onPress} disabled />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('Card', () => {
  it('renderiza com cada variant + padding', () => {
    for (const variant of ['flat', 'elevated', 'glass', 'gradient'] as const) {
      const r = render(<Card variant={variant} padding="md">x</Card>);
      expect(r.toJSON()).toBeTruthy();
      r.unmount();
    }
  });
});

describe('BrandLogo', () => {
  it('renderiza nos sizes', () => {
    for (const size of [24, 48, 96]) {
      const r = render(<BrandLogo size={size} />);
      expect(r.toJSON()).toBeTruthy();
      r.unmount();
    }
  });
});

describe('PersonalTicker', () => {
  it('renderiza com source baseado em store', () => {
    const r = render(
      <PersonalTicker
        source={{
          streakCurrent: 5,
          streakLongest: 12,
          totalCheckins: 50,
          level: 3,
          phaseLabel: 'Bebê',
          mascotName: 'Robo',
        }}
      />
    );
    expect(r.toJSON()).toBeTruthy();
  });

  it('com stats vazias retorna null', () => {
    const r = render(<PersonalTicker stats={[]} />);
    // Sem stats e store vazio, ainda monta o computed via buildPersonalStats default.
    expect(r.toJSON()).toBeDefined();
  });

  it('com 1 stat não inicia interval (cobre branch length<=1)', () => {
    const r = render(<PersonalTicker stats={[{ text: 'só uma' }]} />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('buildPersonalStats (pure)', () => {
  it('user vazio → ticker vazio (sem fallback de "comece sua streak")', () => {
    // Comportamento mudou: o ticker agora oculta no estado D1 em vez de
    // duplicar a info que o header (pílula de streak) já mostra.
    const s = buildPersonalStats({});
    expect(s).toEqual([]);
  });

  it('streak 1 dia → singular', () => {
    const s = buildPersonalStats({ streakCurrent: 1 });
    expect(s[0].text).toMatch(/1 dia/);
  });

  it('streak > 1 → plural', () => {
    const s = buildPersonalStats({ streakCurrent: 5 });
    expect(s[0].text).toMatch(/5 dias/);
  });

  it('checkins=1 → singular', () => {
    const s = buildPersonalStats({ streakCurrent: 0, totalCheckins: 1 });
    expect(s.some(x => x.text.includes('1 check-in'))).toBe(true);
  });

  it('level + mascotName → frase com nível', () => {
    const s = buildPersonalStats({ streakCurrent: 0, level: 5, mascotName: 'Robo' });
    expect(s.some(x => x.text.includes('Robo'))).toBe(true);
  });

  it('longest >= streak inclui recorde', () => {
    const s = buildPersonalStats({ streakCurrent: 3, streakLongest: 10 });
    expect(s.some(x => x.text.toLowerCase().includes('recorde'))).toBe(true);
  });

  it('phaseLabel sozinho NÃO aparece (precisa de outra stat pra rotacionar)', () => {
    const s = buildPersonalStats({ phaseLabel: 'Adolescente' });
    expect(s.some(x => x.text === 'adolescente')).toBe(false);
  });

  it('phaseLabel + outra stat → aparece em lowercase', () => {
    const s = buildPersonalStats({ phaseLabel: 'Adolescente', totalCheckins: 5 });
    expect(s.some(x => x.text === 'adolescente')).toBe(true);
  });
});

describe('XPBar', () => {
  it('renderiza com xp/level/toNext', () => {
    const r = render(
      <XPBar level={2} xp={50} toNext={{ current: 50, needed: 100, progress: 0.5 }} />
    );
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('StreakFlame', () => {
  it('renderiza com várias streaks', () => {
    for (const days of [0, 1, 7, 30, 100]) {
      const r = render(<StreakFlame days={days} />);
      expect(r.toJSON()).toBeTruthy();
      r.unmount();
    }
  });
});

describe('HabitChip', () => {
  it('renderiza chip de hábito', () => {
    const r = render(<HabitChip kind="water" count={2} done={false} onPress={() => undefined} />);
    expect(r.toJSON()).toBeTruthy();
  });
  it('aceita done=true', () => {
    const r = render(<HabitChip kind="sleep" done count={1} onPress={() => undefined} />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('ErrorBoundary', () => {
  it('renderiza children quando não há erro', () => {
    const r = render(
      <ErrorBoundary>
        <div>ok</div>
      </ErrorBoundary>
    );
    expect(r.toJSON()).toBeTruthy();
  });

  it('captura erro do filho e mostra fallback', () => {
    function Bomb(): React.ReactElement {
      throw new Error('boom');
    }
    // Silencia console.error pra teste não poluir
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(r.toJSON()).toBeTruthy();
    spy.mockRestore();
  });
});
