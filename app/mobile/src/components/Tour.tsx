import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { t } from '@/lib/i18n';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

/**
 * Tour de onboarding — 4 passos com SVG icons, dots indicators e CTA pill.
 * Cinematográfico: fade backdrop escuro, card centralizado com icon hero.
 *
 * Copy via i18n (tour.step{N}_*); só o ícone fica no código.
 */

const STEP_ICONS: readonly IconName[] = ['sparkles', 'check', 'target', 'gift'];
const STEP_COUNT = STEP_ICONS.length;

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function Tour({ visible, onDone }: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [step, setStep] = useState(0);
  const opacity = useSharedValue(1);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  function next() {
    if (step + 1 < STEP_COUNT) {
      setStep(step + 1);
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => {
        exitTimerRef.current = null;
        onDone();
        setStep(0);
        opacity.value = withTiming(1);
      }, 220);
    }
  }

  function skip() {
    // Limpa timer pendente — se o user pulou logo após "Bora começar",
    // o setTimeout ainda firaria onDone+setStep depois.
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    onDone();
  }

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const icon = STEP_ICONS[step];
  const title = t(`tour.step${step + 1}_title`);
  const body = t(`tour.step${step + 1}_body`);
  const isLast = step + 1 >= STEP_COUNT;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={skip}>
      <Animated.View style={[styles.backdrop, animatedStyle]}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Icon name={icon} size={40} color={theme.colors.primary} strokeWidth={1.6} />
          </View>
          <Text style={styles.kicker}>
            {t('tour.step_kicker', step + 1, STEP_COUNT)}
          </Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          <View style={styles.dots}>
            {STEP_ICONS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <PressableScale onPress={next} style={styles.cta} accessibilityRole="button" accessibilityLabel={t('tour.next_a11y')}>
            <Text style={styles.ctaText}>
              {isLast ? t('tour.start') : t('tour.next')}
            </Text>
            <Icon
              name={isLast ? 'sparkles' : 'arrow-right'}
              size={16}
              color="#fff"
              strokeWidth={2.4}
            />
          </PressableScale>
          <Pressable onPress={skip} hitSlop={10} style={styles.skip} accessibilityRole="button" accessibilityLabel={t('tour.skip_a11y')}>
            <Text style={styles.skipText}>{t('tour.skip')}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(20,16,28,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.xl,
      alignItems: 'center',
      gap: theme.spacing.sm,
      maxWidth: 360,
      width: '100%',
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.glass,
    },
    iconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
    },
    kicker: {
      fontSize: 10,
      color: theme.colors.primary,
      fontWeight: '800',
      letterSpacing: 1.6,
      marginTop: theme.spacing.sm,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    title: {
      ...theme.text.h2,
      color: theme.colors.text,
      textAlign: 'center',
      fontSize: 26,
      lineHeight: 30,
      letterSpacing: -0.4,
    },
    body: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    dots: { flexDirection: 'row', gap: 6, marginVertical: theme.spacing.md },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.border },
    dotActive: { backgroundColor: theme.colors.primary, width: 24 },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: 14,
      borderRadius: theme.radius.pill,
      marginTop: theme.spacing.sm,
      width: '100%',
      ...theme.shadow.md,
    },
    ctaText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
      fontFamily: 'PlusJakartaSans_700Bold',
      letterSpacing: 0.1,
    },
    skip: { paddingVertical: theme.spacing.sm },
    skipText: {
      ...theme.text.sm,
      color: theme.colors.textDim,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
    },
  });
}
