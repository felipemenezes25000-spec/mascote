/**
 * StaggeredView — wrapper para entrada cinematográfica de listas/cards.
 *
 * Usa o `entering` API do Reanimated 3 com FadeInDown.springify() + delay
 * proporcional ao index. Resultado: cards "caem" um após o outro com mola
 * suave, sem precisar declarar SharedValue por item.
 *
 * Padrão visto em apps premium como Linear (transição de issue list),
 * Apple Notes (notas aparecem em cascata), Things 3.
 *
 * Respeita `reduce_motion` do user — sem animação se desligado.
 */

import { type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, type EntryExitAnimationFunction } from 'react-native-reanimated';
import { useStore } from '@/store';

interface Props {
  index?: number;
  /** Delay base por index (ms). Default 60ms (stagger natural). */
  step?: number;
  /** Delay inicial fixo (ms). Default 0. */
  initialDelay?: number;
  /** Distância vertical do fade-in (px). Default 16. */
  distance?: number;
  /** Override do entering (ex: SlideInRight). */
  entering?: EntryExitAnimationFunction;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function StaggeredView({
  index = 0,
  step = 60,
  initialDelay = 0,
  distance = 16,
  entering,
  children,
  style,
}: Props) {
  const reduceMotion = useStore(s => s.settings?.reduce_motion);

  if (reduceMotion) {
    return <Animated.View style={style}>{children}</Animated.View>;
  }

  const anim = entering ?? FadeInDown.duration(420)
    .delay(initialDelay + index * step)
    .springify()
    .damping(16)
    .mass(0.6)
    .withInitialValues({ transform: [{ translateY: distance }], opacity: 0 });

  return (
    <Animated.View entering={anim as any} style={style}>
      {children}
    </Animated.View>
  );
}
