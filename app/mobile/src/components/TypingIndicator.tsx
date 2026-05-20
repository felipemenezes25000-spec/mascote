/**
 * Indicador "mascote digitando" durante latência de IA (Proxy/OpenAI: 1-20s).
 * Aparece como bolha de chat estilizada igual ChatBubble do mascote — três
 * pontos pulsando em sequência. Reflete a personalidade (mascotColor).
 *
 * Crítico pra pilar "Chat Plus rápido": sem feedback visual durante uma
 * espera de 5+ segundos, usuário acha que app travou ou IA falhou.
 */

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { useStore } from '@/store';

interface Props {
  mascotColor?: string;
}

export function TypingIndicator({ mascotColor }: Props) {
  const styles = useStyles(makeStyles);
  const reduceMotion = useStore(s => s.settings?.reduce_motion);
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (reduceMotion) {
      dot1.setValue(0.6);
      dot2.setValue(0.6);
      dot3.setValue(0.6);
      return;
    }
    const loop = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.3, duration: 320, useNativeDriver: true }),
        ]),
      );
    const a1 = loop(dot1, 0);
    const a2 = loop(dot2, 120);
    const a3 = loop(dot3, 240);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3, reduceMotion]);

  const bubbleStyle = mascotColor
    ? { backgroundColor: mascotColor + '22', borderColor: mascotColor + '55' }
    : null;
  const dotColor = mascotColor ?? '#999';

  return (
    <View
      style={styles.row}
      accessibilityRole="alert"
      accessibilityLabel="Mascote está digitando"
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.bubble, bubbleStyle]}>
        <Animated.View style={[styles.dot, { backgroundColor: dotColor, opacity: dot1 }]} />
        <Animated.View style={[styles.dot, { backgroundColor: dotColor, opacity: dot2 }]} />
        <Animated.View style={[styles.dot, { backgroundColor: dotColor, opacity: dot3 }]} />
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      marginVertical: 4,
      paddingHorizontal: theme.spacing.md,
      justifyContent: 'flex-start',
    },
    bubble: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm + 4,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      gap: 6,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
  });
}
