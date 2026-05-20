import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { PressableScale } from '@/components/PressableScale';
import type { Mascot as MascotType, MascotPhase } from '@/types';

import { emergentPhaseLabels } from '@/lib/phaseLabels';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

interface Props {
  visible: boolean;
  mascot: MascotType | null;
  fromPhase: MascotPhase | null;
  onClose: () => void;
  /** Storytelling opcional — quando passado, sobrescreve título e exibe body. */
  storyTitle?: string;
  storyBody?: string;
  storyQuote?: string;
}

export function EvolutionModal({ visible, mascot, fromPhase, onClose, storyTitle, storyBody, storyQuote }: Props) {
  const styles = useStyles(makeStyles);
  const glow = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const sparkle1 = useSharedValue(0);
  const sparkle2 = useSharedValue(0);
  const sparkle3 = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Cancela animações em curso antes de reassignar valores iniciais —
      // sem isso, withRepeat anteriores continuam rodando enquanto novos
      // são empilhados a cada abrir/fechar rápido (causa jank).
      cancelAnimation(glow);
      cancelAnimation(scale);
      cancelAnimation(sparkle1);
      cancelAnimation(sparkle2);
      cancelAnimation(sparkle3);
      glow.value = 0;
      scale.value = 0.6;
      sparkle1.value = 0;
      sparkle2.value = 0;
      sparkle3.value = 0;

      scale.value = withSequence(
        withTiming(1.1, { duration: 600, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 350 })
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900 }),
          withTiming(0.6, { duration: 900 })
        ),
        -1,
        false
      );
      sparkle1.value = withRepeat(
        withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })),
        -1
      );
      sparkle2.value = withDelay(
        300,
        withRepeat(
          withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })),
          -1
        )
      );
      sparkle3.value = withDelay(
        600,
        withRepeat(
          withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })),
          -1
        )
      );
    } else {
      cancelAnimation(glow);
      cancelAnimation(sparkle1);
      cancelAnimation(sparkle2);
      cancelAnimation(sparkle3);
      cancelAnimation(scale);
    }
    return () => {
      cancelAnimation(glow);
      cancelAnimation(sparkle1);
      cancelAnimation(sparkle2);
      cancelAnimation(sparkle3);
      cancelAnimation(scale);
    };
  }, [visible]);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.4 * glow.value,
    transform: [{ scale: 0.9 + 0.2 * glow.value }],
  }));
  const s1Style = useAnimatedStyle(() => ({ opacity: sparkle1.value, transform: [{ scale: sparkle1.value }] }));
  const s2Style = useAnimatedStyle(() => ({ opacity: sparkle2.value, transform: [{ scale: sparkle2.value }] }));
  const s3Style = useAnimatedStyle(() => ({ opacity: sparkle3.value, transform: [{ scale: sparkle3.value }] }));

  if (!mascot) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.center, { pointerEvents: 'box-none' }]}>
          <Animated.View style={[styles.glow, glowStyle]} />
          <Animated.View style={[styles.sparkle, styles.s1, s1Style]}>
            <Icon name="sparkle" size={26} color="#FFD56B" strokeWidth={1.6} fill="#FFD56B" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, styles.s2, s2Style]}>
            <Icon name="sparkle" size={22} color="#FFD56B" strokeWidth={1.6} fill="#FFD56B" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, styles.s3, s3Style]}>
            <Icon name="sparkle" size={28} color="#FFD56B" strokeWidth={1.6} fill="#FFD56B" />
          </Animated.View>
          <Animated.View style={mascotStyle}>
            <Mascot
              personality={mascot.personality}
              phase={mascot.phase}
              mood="empolgado"
              size={240}
            />
          </Animated.View>
          <View style={styles.textBox}>
            <View style={styles.kickerRow}>
              <Icon name="sparkles" size={11} color="#FFD56B" strokeWidth={2.4} />
              <Text style={styles.kicker}>EVOLUÇÃO</Text>
            </View>
            <Text style={styles.title}>
              {storyTitle ?? `${mascot.name} mudou para ${emergentPhaseLabels[mascot.phase]}`}
            </Text>
            {fromPhase && (
              <View style={styles.fromRow}>
                <Text style={styles.from}>{emergentPhaseLabels[fromPhase]}</Text>
                <Icon name="arrow-right" size={11} color="#D7CDE6" strokeWidth={2.2} />
                <Text style={[styles.from, styles.fromBold]}>{emergentPhaseLabels[mascot.phase]}</Text>
              </View>
            )}
            {storyBody ? (
              <Text style={styles.story}>{storyBody}</Text>
            ) : (
              <Text style={styles.hint}>Você cuidou — ele cresceu.</Text>
            )}
            {storyQuote && (
              <View style={styles.quoteBubble}>
                <Text style={styles.quoteText}>{storyQuote}</Text>
              </View>
            )}
          </View>
          <PressableScale style={styles.ctaBtn} onPress={onClose} accessibilityLabel="Continuar">
            <Text style={styles.ctaText}>Continuar</Text>
            <Icon name="arrow-right" size={14} color="#fff" strokeWidth={2.6} />
          </PressableScale>
        </View>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(20,16,28,0.85)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    center: { alignItems: 'center', gap: theme.spacing.lg, padding: theme.spacing.lg },
    glow: {
      position: 'absolute',
      top: 30,
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: theme.colors.primarySoft,
    },
    sparkle: {
      position: 'absolute',
    },
    s1: { top: 40, left: 30 },
    s2: { top: 100, right: 30 },
    s3: { top: 200, left: 50 },
    textBox: { alignItems: 'center', gap: 6 },
    kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    kicker: {
      color: '#FFD56B',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.8,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    title: {
      color: '#fff',
      fontSize: 30,
      textAlign: 'center',
      fontFamily: 'InstrumentSerif_400Regular',
      letterSpacing: -0.6,
      lineHeight: 34,
      marginTop: 4,
    },
    fromRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    from: {
      color: '#D7CDE6',
      fontSize: 13,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
    },
    fromBold: {
      color: '#FFD56B',
      fontStyle: 'normal',
      fontFamily: 'InstrumentSerif_400Regular',
    },
    hint: {
      color: '#D7CDE6',
      fontSize: 14,
      marginTop: 6,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
    },
    story: {
      color: '#EDE5F5',
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      maxWidth: 320,
    },
    quoteBubble: {
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: 'rgba(255,213,107,0.3)',
    },
    quoteText: {
      color: '#FFD56B',
      fontStyle: 'italic',
      fontSize: 15,
      textAlign: 'center',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      lineHeight: 20,
    },
    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: 14,
      borderRadius: theme.radius.pill,
    },
    ctaText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
      fontFamily: 'PlusJakartaSans_700Bold',
      letterSpacing: 0.2,
    },
  });
}
