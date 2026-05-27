/**
 * ProceduralMarks — renderiza marks únicos do ProceduralGenome no SVG do Mascot2D.
 *
 * Cada mark recebe coordenadas estáveis por (placement + seed) — re-renders
 * não movem o mark. Animações por kind (spot/star/rune/crescent — ver spec B.8).
 *
 * Roda DENTRO do <G transform={...}> da cabeça em Mascot2D — coordenadas
 * são em viewBox "0 0 200 200" (a mesma do mascote inteiro).
 */

import { memo, useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Circle, G, Path } from 'react-native-svg';
import type { ProceduralGenome } from '@/types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

interface Props {
  marks: ProceduralGenome['marks'];
  accent: string;
  deep: string;
  gold: string;
  reduceMotion?: boolean;
}

function ProceduralMarksImpl({ marks, accent, deep, gold, reduceMotion }: Props) {
  return (
    <G>
      {marks.map((m, i) => {
        const fill = m.color === 'accent' ? accent : m.color === 'deep' ? deep : gold;
        const pos = placementCoords(m.placement, m.seed);
        const key = `mark-${i}-${m.seed}`;
        switch (m.kind) {
          case 'spot':
            return <PulsingSpot key={key} cx={pos.x} cy={pos.y} fill={fill} reduceMotion={reduceMotion} />;
          case 'star':
            return <TwinklingStar key={key} cx={pos.x} cy={pos.y} fill={fill} reduceMotion={reduceMotion} />;
          case 'rune':
            return <GlowingRune key={key} cx={pos.x} cy={pos.y} fill={fill} reduceMotion={reduceMotion} />;
          case 'crescent':
            return <RotatingCrescent key={key} cx={pos.x} cy={pos.y} fill={fill} reduceMotion={reduceMotion} />;
          case 'stripe':
            return <Path key={key} d={`M ${pos.x - 6} ${pos.y} Q ${pos.x} ${pos.y - 3} ${pos.x + 6} ${pos.y}`} stroke={fill} strokeWidth="2" fill="none" strokeLinecap="round" />;
          case 'scar':
            return <Path key={key} d={`M ${pos.x - 5} ${pos.y - 2} L ${pos.x + 5} ${pos.y + 2}`} stroke={fill} strokeWidth="1.5" />;
          case 'leaf':
            return <Path key={key} d={`M ${pos.x} ${pos.y - 4} Q ${pos.x + 4} ${pos.y} ${pos.x} ${pos.y + 4} Q ${pos.x - 4} ${pos.y} ${pos.x} ${pos.y - 4} Z`} fill={fill} />;
          default:
            return null;
        }
      })}
    </G>
  );
}

export const ProceduralMarks = memo(ProceduralMarksImpl);

// ============================================================
// Posicionamento determinístico
// ============================================================

function placementCoords(
  placement: ProceduralGenome['marks'][number]['placement'],
  seed: number,
): { x: number; y: number } {
  const rng = mulberry32(seed >>> 0);
  switch (placement) {
    case 'cheek':
      // Bochecha esquerda ou direita
      return rng() < 0.5
        ? { x: 70 + rng() * 6, y: 110 + rng() * 6 }
        : { x: 130 + rng() * 6 - 6, y: 110 + rng() * 6 };
    case 'forehead':
      return { x: 92 + rng() * 16, y: 78 + rng() * 6 };
    case 'body':
      return { x: 85 + rng() * 30, y: 150 + rng() * 20 };
    case 'tail':
      return { x: 155 + rng() * 12, y: 180 + rng() * 8 };
    default:
      return { x: 100, y: 100 };
  }
}

function mulberry32(a: number) {
  return function () {
    let t = (a = (a + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================
// Animações por mark (spec B.8)
// ============================================================

function PulsingSpot({ cx, cy, fill, reduceMotion }: { cx: number; cy: number; fill: string; reduceMotion?: boolean }) {
  const opacity = useSharedValue(0.9);
  useEffect(() => {
    cancelAnimation(opacity);
    if (reduceMotion) {
      opacity.value = 0.9;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(opacity);
  }, [reduceMotion]);
  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.value }));
  return <AnimatedCircle cx={cx} cy={cy} r={2.5} fill={fill} animatedProps={animatedProps} />;
}

function TwinklingStar({ cx, cy, fill, reduceMotion }: { cx: number; cy: number; fill: string; reduceMotion?: boolean }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(scale);
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 500, easing: Easing.out(Easing.ease) }),
        withTiming(0.9, { duration: 300 }),
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 2500 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(scale);
  }, [reduceMotion]);
  const animatedProps = useAnimatedProps(() => ({
    transform: `translate(${cx} ${cy}) scale(${scale.value}) translate(${-cx} ${-cy})`,
  }));
  return (
    <AnimatedG animatedProps={animatedProps}>
      <Path d={`M ${cx} ${cy - 4} l 1 3 l 3 1 l -3 1 l -1 3 l -1 -3 l -3 -1 l 3 -1 z`} fill={fill} />
    </AnimatedG>
  );
}

function GlowingRune({ cx, cy, fill, reduceMotion }: { cx: number; cy: number; fill: string; reduceMotion?: boolean }) {
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    cancelAnimation(opacity);
    if (reduceMotion) {
      opacity.value = 0.8;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(opacity);
  }, [reduceMotion]);
  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.value }));
  return (
    <AnimatedCircle cx={cx} cy={cy} r={3.5} fill={fill} animatedProps={animatedProps} />
  );
}

function RotatingCrescent({ cx, cy, fill, reduceMotion }: { cx: number; cy: number; fill: string; reduceMotion?: boolean }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(rot);
    if (reduceMotion) {
      rot.value = 0;
      return;
    }
    rot.value = withRepeat(
      withTiming(360, { duration: 12_000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rot);
  }, [reduceMotion]);
  const animatedProps = useAnimatedProps(() => ({
    transform: `translate(${cx} ${cy}) rotate(${rot.value}) translate(${-cx} ${-cy})`,
  }));
  return (
    <AnimatedG animatedProps={animatedProps}>
      <Path d={`M ${cx - 3} ${cy} a 3 3 0 1 0 6 0 a 2.2 2.2 0 1 1 -6 0 z`} fill={fill} />
    </AnimatedG>
  );
}
