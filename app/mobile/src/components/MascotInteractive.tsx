/**
 * MascotInteractive — wrapper de gestos para o mascote.
 *
 * Captura interações táteis e converte em animações + voz + haptics:
 *  - Tap simples: o mascote olha pra você (`react`).
 *  - Double tap: comemora (`celebrate`).
 *  - Long press: relaxa (`rest`) — momento de calma.
 *  - Pan/drag: carinho (`pet`) — soma vínculo (XP suave) limitado.
 *
 * Respeita `reduceMotion` (sem haptics, animação curta).
 *
 * Não chama backends — só dispara callbacks para o pai decidir efeitos
 * persistentes (ex.: incrementar bond_xp ou voice line).
 */
import { useCallback, useRef } from 'react';
import { Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

export type MascotGestureKind = 'tap' | 'double' | 'long' | 'pet';

interface Props {
  children: React.ReactNode;
  /** Disparado em cada gesto reconhecido. */
  onGesture: (kind: MascotGestureKind) => void;
  /** Frame visível pra a11y. */
  accessibilityLabel?: string;
  reduceMotion?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Quando habilitado, ignora gestos. */
  disabled?: boolean;
}

const DOUBLE_TAP_MS = 280;
const LONG_PRESS_MS = 600;

export function MascotInteractive({
  children,
  onGesture,
  accessibilityLabel,
  reduceMotion,
  style,
  disabled,
}: Props) {
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const lastPetAtRef = useRef(0);

  const haptic = useCallback(
    (kind: 'light' | 'medium' = 'light') => {
      if (Platform.OS === 'web' || reduceMotion) return;
      try {
        if (kind === 'medium') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        /* haptics opcional */
      }
    },
    [reduceMotion],
  );

  const handlePressIn = useCallback(() => {
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      haptic('medium');
      onGesture('long');
    }, LONG_PRESS_MS);
  }, [haptic, onGesture]);

  const handlePressOut = useCallback(() => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  }, []);

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (longPressFiredRef.current) return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      haptic('medium');
      onGesture('double');
      return;
    }
    lastTapRef.current = now;
    haptic('light');
    onGesture('tap');
  }, [disabled, haptic, onGesture]);

  // Pan/drag — usamos onTouchMove pra contar movimento contínuo. Throttle
  // evita 60fps de toasts: 1 evento "pet" a cada 350ms basta pra UX.
  const handleTouchMove = useCallback(() => {
    if (disabled) return;
    const now = Date.now();
    if (now - lastPetAtRef.current < 350) return;
    lastPetAtRef.current = now;
    onGesture('pet');
  }, [disabled, onGesture]);

  return (
    <View
      onTouchMove={handleTouchMove}
      style={style}
      pointerEvents="box-only"
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Interagir com o mascote'}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        style={style}
      >
        {children}
      </Pressable>
    </View>
  );
}
