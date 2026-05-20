/**
 * MascotAmbient — wrapper de "vida" ambiental ao redor do Mascot.
 *
 * Easter eggs visuais que não dependem de input:
 *  - Curious tilt: micro rotação a cada 6-9s (parece "respirar com a cena")
 *  - Z's flutuantes: aparecem entre 22h-5h (modo sono)
 *  - Sparkles ambientais: aparecem entre 6h-9h (modo manhã energética)
 *
 * Respeita `reduce_motion`. Não mexe no SVG interno do Mascot — só overlays
 * absolutamente posicionados em torno dele.
 */

import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';

type Mode = 'sleep' | 'morning' | 'idle';

function modeFromHour(h: number): Mode {
  if (h >= 22 || h < 6) return 'sleep';
  if (h >= 6 && h < 10) return 'morning';
  return 'idle';
}

interface Props {
  size: number;
  children: React.ReactNode;
  reduceMotion?: boolean;
  /** Force override (pra testes). */
  modeOverride?: Mode;
}

function MascotAmbientImpl({ size, children, reduceMotion, modeOverride }: Props) {
  const theme = useTheme();
  const reduceMotionStore = useStore(s => s.settings?.reduce_motion);
  const shouldAnimate = !(reduceMotion ?? reduceMotionStore);
  const [hour, setHour] = useState(() => new Date().getHours());
  const mode: Mode = modeOverride ?? modeFromHour(hour);

  // Re-checa hora a cada 60s (caso o user fique muito tempo na tela)
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Curious tilt: rotação suave sin oscilante
  const tilt = useSharedValue(0);
  useEffect(() => {
    // Cancela qualquer loop em curso ANTES de reassignar — sem isso,
    // toggles rápidos de shouldAnimate empilham withRepeat órfãos.
    cancelAnimation(tilt);
    if (!shouldAnimate) {
      tilt.value = 0;
      return;
    }
    tilt.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 3600, easing: Easing.inOut(Easing.ease) }),
        withTiming(-1.4, { duration: 3600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(tilt);
  }, [shouldAnimate]);

  const tiltStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tilt.value}deg` }],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size + 20 }]}>
      <Animated.View style={[styles.inner, tiltStyle]}>{children}</Animated.View>

      {mode === 'sleep' && shouldAnimate && (
        <SleepZs size={size} color={theme.colors.textSecondary} />
      )}
      {mode === 'morning' && shouldAnimate && (
        <MorningSparkles size={size} color={theme.colors.gold} />
      )}
    </View>
  );
}

/** Three "Z"s flutuando pra cima e fade-out, ciclo de 2.4s. */
function SleepZs({ size, color }: { size: number; color: string }) {
  return (
    <>
      <ZParticle size={size} color={color} delay={0} x={size * 0.62} />
      <ZParticle size={size} color={color} delay={800} x={size * 0.7} />
      <ZParticle size={size} color={color} delay={1600} x={size * 0.66} />
    </>
  );
}

function ZParticle({ size, color, delay, x }: { size: number; color: string; delay: number; x: number }) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.7, { duration: 1200 }),
          withTiming(0, { duration: 800 })
        ),
        -1,
        false
      )
    );
    ty.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(-size * 0.18, { duration: 2400, easing: Easing.out(Easing.cubic) })
        ),
        -1,
        false
      )
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(ty);
    };
  }, []);

  const aStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: size * 0.15,
          pointerEvents: 'none',
        } as ViewStyle,
        aStyle,
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 6h10l-10 12h10"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

/** Sparkles douradas piscando ao redor do mascote (modo manhã). */
function MorningSparkles({ size, color }: { size: number; color: string }) {
  const positions = useMemo(
    () => [
      { x: 0.18, y: 0.22, delay: 0, scale: 0.8 },
      { x: 0.78, y: 0.18, delay: 600, scale: 1 },
      { x: 0.86, y: 0.55, delay: 1200, scale: 0.7 },
      { x: 0.12, y: 0.58, delay: 1800, scale: 0.9 },
    ],
    []
  );
  return (
    <>
      {positions.map((p, i) => (
        <SparkleParticle
          key={i}
          size={size}
          color={color}
          delay={p.delay}
          x={p.x * size}
          y={p.y * size}
          scale={p.scale}
        />
      ))}
    </>
  );
}

function SparkleParticle({
  size,
  color,
  delay,
  x,
  y,
  scale,
}: {
  size: number;
  color: string;
  delay: number;
  x: number;
  y: number;
  scale: number;
}) {
  const opacity = useSharedValue(0);
  const s = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0, { duration: 900 }),
          withTiming(0, { duration: 1600 })
        ),
        -1,
        false
      )
    );
    s.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(scale, { duration: 500, easing: Easing.out(Easing.back(2)) }),
          withTiming(scale, { duration: 900 }),
          withTiming(0.6, { duration: 600 })
        ),
        -1,
        false
      )
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(s);
    };
  }, []);

  const aStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: s.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          pointerEvents: 'none',
        } as ViewStyle,
        aStyle,
      ]}
    >
      <Svg width={14} height={14} viewBox="0 0 24 24" fill={color}>
        <Path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  inner: { alignItems: 'center', justifyContent: 'center' },
});

/**
 * memoizado: setInterval interno re-renderiza a cada 60s; sem memo, Home
 * propagava re-renders por outras causas e MascotAmbient reanimava.
 */
export const MascotAmbient = memo(MascotAmbientImpl);
