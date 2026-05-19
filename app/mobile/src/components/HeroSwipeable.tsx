/**
 * HeroSwipeable — gesture wrapper pra trocar de cenário no hero.
 *
 * Pan horizontal: arraste à esquerda = próxima scene, à direita = anterior.
 * Threshold: 50px de translação OU velocidade > 480.
 *
 * Visual feedback durante o drag: o conteúdo se move junto (translateX) e
 * tem opacity decay; ao soltar, volta com spring (snap-back) ou dispara
 * callback (swipe confirmado).
 *
 * Respeita `reduce_motion` — vira no-op se ativo.
 */

import { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useStore } from '@/store';

interface Props {
  onPrev: () => void;
  onNext: () => void;
  children: ReactNode;
  /** Distância em px que dispara swipe confirmado. Default 50. */
  threshold?: number;
}

export function HeroSwipeable({ onPrev, onNext, children, threshold = 50 }: Props) {
  const reduceMotion = useStore(s => s.settings?.reduce_motion);
  const tx = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: tx.value }],
      opacity: interpolate(Math.abs(tx.value), [0, 80], [1, 0.72], 'clamp'),
    };
  });

  if (reduceMotion) {
    return <Animated.View style={styles.wrap}>{children}</Animated.View>;
  }

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-15, 15])
    .onUpdate(e => {
      tx.value = e.translationX * 0.65; // resistência (sente o peso)
    })
    .onEnd(e => {
      const passed = Math.abs(e.translationX) > threshold || Math.abs(e.velocityX) > 480;
      if (passed) {
        const dir = e.translationX < 0 ? 'next' : 'prev';
        tx.value = withSpring(0, { damping: 14, stiffness: 220, mass: 0.6 });
        if (dir === 'next') runOnJS(onNext)();
        else runOnJS(onPrev)();
      } else {
        tx.value = withSpring(0, { damping: 18, stiffness: 280, mass: 0.5 });
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.wrap, animStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
});
