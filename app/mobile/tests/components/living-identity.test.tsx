/**
 * Living Identity — testes de smoke + tokens.
 *
 * Garante:
 *  - Componentes renderizam sem erro
 *  - SectionHeader exibe title e subtitle
 *  - LivingCard com onPress aceita Pressable
 *  - LivingCard tones distintos produzem backgrounds distintos
 *  - ProgressPulse aplica width baseado em value
 *  - CreatureHero exibe caption
 *  - CreatureReactionToast exibe message + kind muda accent
 *
 * Filosofia: testes não são pixel-perfect (Maestro/Playwright pra isso).
 * São contratos: "se chamar com props X, render NÃO quebra e estrutura
 * conhecida aparece".
 */

import { describe, expect, it } from 'vitest';
import * as TestRenderer from 'react-test-renderer';
import {
  CreatureHero,
  CreatureReactionToast,
  LivingCard,
  ProgressPulse,
  SectionHeader,
  Typography,
} from '@/components/ui';
import { Text, View } from 'react-native';

describe('Living Identity — SectionHeader', () => {
  it('renderiza title e subtitle', () => {
    const tree = TestRenderer.create(
      <SectionHeader title="Memórias" subtitle="O que ele lembra" />,
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Memórias');
    expect(json).toContain('O que ele lembra');
  });

  it('renderiza sem subtitle (opcional)', () => {
    const tree = TestRenderer.create(<SectionHeader title="Só o título" />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Só o título');
    expect(json).not.toContain('subtitle');
  });

  it('aceita trailing slot', () => {
    const tree = TestRenderer.create(
      <SectionHeader title="Meta" trailing={<Typography variant="caption">Ver tudo</Typography>} />,
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Ver tudo');
  });
});

describe('Living Identity — LivingCard', () => {
  it('renderiza children dentro de View', () => {
    const tree = TestRenderer.create(
      <LivingCard>
        <Text>conteúdo</Text>
      </LivingCard>,
    );
    expect(JSON.stringify(tree.toJSON())).toContain('conteúdo');
  });

  it('com onPress vira Pressable (accessible)', () => {
    let pressed = false;
    const tree = TestRenderer.create(
      <LivingCard onPress={() => { pressed = true; }} accessibilityLabel="card clicável">
        <Text>tap</Text>
      </LivingCard>,
    );
    const root = tree.root.findAll((n) => n.props.accessibilityLabel === 'card clicável');
    expect(root.length).toBeGreaterThan(0);
    // Simula press
    const pressable = root[0];
    if (pressable && typeof pressable.props.onPress === 'function') {
      pressable.props.onPress();
    }
    expect(pressed).toBe(true);
  });

  it('tone diferente produz estilo de fundo diferente', () => {
    const a = TestRenderer.create(<LivingCard tone="neutral"><Text>x</Text></LivingCard>);
    const b = TestRenderer.create(<LivingCard tone="celebrative"><Text>x</Text></LivingCard>);
    const styleA = (a.toJSON() as { props: { style: { backgroundColor: string }[] } } | null);
    const styleB = (b.toJSON() as { props: { style: { backgroundColor: string }[] } } | null);
    expect(JSON.stringify(styleA)).not.toEqual(JSON.stringify(styleB));
  });
});

describe('Living Identity — ProgressPulse', () => {
  it('value=0.5 produz largura 50% no fill', () => {
    const tree = TestRenderer.create(<ProgressPulse value={0.5} />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('50%');
  });

  it('value clamped entre [0, 1]', () => {
    const above = TestRenderer.create(<ProgressPulse value={2.5} />);
    const below = TestRenderer.create(<ProgressPulse value={-1} />);
    expect(JSON.stringify(above.toJSON())).toContain('100%');
    expect(JSON.stringify(below.toJSON())).toContain('0%');
  });

  it('accessibilityValue traduz value pra porcentagem', () => {
    const tree = TestRenderer.create(
      <ProgressPulse value={0.42} accessibilityLabel="streak progress" />,
    );
    // Encontra qualquer node com accessibilityValue setado (apenas 1 esperado)
    const nodes = tree.root.findAll(
      (n) => n.props && n.props.accessibilityRole === 'progressbar',
    );
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes[0]?.props.accessibilityValue).toEqual({ now: 42, min: 0, max: 100 });
  });
});

describe('Living Identity — CreatureHero', () => {
  it('renderiza children + caption', () => {
    const tree = TestRenderer.create(
      <CreatureHero caption="Bipo está aqui" hint="Que bom te ver">
        <View testID="creature-slot" />
      </CreatureHero>,
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Bipo está aqui');
    expect(json).toContain('Que bom te ver');
  });

  it('sem caption/hint, renderiza só o slot (sem texto de fala)', () => {
    const tree = TestRenderer.create(
      <CreatureHero>
        <View testID="creature-slot" />
      </CreatureHero>,
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('creature-slot');
    // Não pode haver textos extras (caption/hint) quando não passados
    expect(json).not.toContain('Bipo está');
    expect(json).not.toContain('Que bom');
  });

  it('halo=false esconde halo decorativo', () => {
    const withHalo = TestRenderer.create(<CreatureHero halo><View /></CreatureHero>);
    const noHalo = TestRenderer.create(<CreatureHero halo={false}><View /></CreatureHero>);
    // Conta nodes — halo adiciona uma View extra na árvore
    const countNodes = (t: TestRenderer.ReactTestRenderer): number =>
      t.root.findAll(() => true).length;
    expect(countNodes(withHalo)).toBeGreaterThan(countNodes(noHalo));
  });
});

describe('Living Identity — CreatureReactionToast', () => {
  it('renderiza message como bodyBold', () => {
    const tree = TestRenderer.create(
      <CreatureReactionToast message="Bipo ganhou olhar profundo" />,
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Bipo ganhou olhar profundo');
  });

  it('ícone aparece em badge à esquerda quando passado', () => {
    const tree = TestRenderer.create(
      <CreatureReactionToast message="missão" icon="✨" />,
    );
    expect(JSON.stringify(tree.toJSON())).toContain('✨');
  });

  it('kind diferente gera borderColor diferente', () => {
    const a = TestRenderer.create(<CreatureReactionToast message="x" kind="celebrate" />);
    const b = TestRenderer.create(<CreatureReactionToast message="x" kind="memory" />);
    expect(JSON.stringify(a.toJSON())).not.toEqual(JSON.stringify(b.toJSON()));
  });

  it('accessibilityLabel padrão é o message', () => {
    const tree = TestRenderer.create(<CreatureReactionToast message="oi" />);
    const node = tree.root.findAll((n) => n.props.accessibilityRole === 'alert');
    expect(node[0]?.props.accessibilityLabel).toBe('oi');
  });
});
