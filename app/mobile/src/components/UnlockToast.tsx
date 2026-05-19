import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

/**
 * Toast premium — desliza do topo com spring, mostra ícone SVG temático
 * + kicker mono + title serif. Aceita compat `emoji` (mascot evolutions usam).
 * Auto-dismiss 2.4s + fade 300ms.
 */

export interface UnlockToastData {
  kind: 'achievement' | 'accessory' | 'scene' | 'level' | 'info';
  emoji: string;
  title: string;
  subtitle?: string;
}

interface Props {
  data: UnlockToastData | null;
  onDone: () => void;
}

function kindIcon(k: UnlockToastData['kind']): IconName {
  switch (k) {
    case 'achievement':
      return 'trophy';
    case 'accessory':
      return 'package';
    case 'scene':
      return 'sparkles';
    case 'level':
      return 'star';
    default:
      return 'sparkle';
  }
}

function kindLabel(k: UnlockToastData['kind']): string {
  switch (k) {
    case 'achievement':
      return 'CONQUISTA';
    case 'accessory':
      return 'NOVO ACESSÓRIO';
    case 'scene':
      return 'NOVO CENÁRIO';
    case 'level':
      return 'NÍVEL';
    default:
      return 'AVISO';
  }
}

function kindColor(k: UnlockToastData['kind'], theme: Theme): string {
  switch (k) {
    case 'achievement':
      return theme.colors.gold;
    case 'accessory':
      return theme.colors.primary;
    case 'scene':
      return theme.colors.lilac;
    case 'level':
      return theme.colors.gold;
    default:
      return theme.colors.primary;
  }
}

export function UnlockToast({ data, onDone }: Props) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(-80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (data) {
      // Reseta as shared values pro estado inicial ANTES do withSequence —
      // sem isso, quando um toast novo chega logo após o anterior, a animação
      // começa do `y=-100`/`opacity=0` do final do anterior, ficando lenta e
      // com fade-in invisível no começo.
      y.value = -80;
      opacity.value = 0;
      y.value = withSequence(
        withTiming(20, { duration: 350, easing: Easing.out(Easing.cubic) }),
        withDelay(
          2400,
          withTiming(-100, { duration: 300 }, finished => {
            if (finished) runOnJS(onDone)();
          }),
        ),
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(2400, withTiming(0, { duration: 300 })),
      );
    }
    return () => {
      cancelAnimation(y);
      cancelAnimation(opacity);
    };
  }, [data]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  if (!data) return null;

  const accent = kindColor(data.kind, theme);

  return (
    <Animated.View
      style={[styles.wrap, { paddingTop: insets.top, pointerEvents: 'none' }, style]}
    >
      <View style={[styles.toast, { borderColor: accent + '50' }]}>
        <View style={[styles.iconCircle, { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
          <Icon name={kindIcon(data.kind)} size={20} color={accent} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: accent }]}>{kindLabel(data.kind)}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {data.title}
          </Text>
          {data.subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {data.subtitle}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
    },
    toast: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      borderWidth: 1,
      ...theme.shadow.md,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    kicker: {
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 1.2,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    title: {
      color: theme.colors.text,
      marginTop: 2,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 17,
      lineHeight: 20,
      letterSpacing: -0.2,
    },
    subtitle: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      marginTop: 1,
      lineHeight: 14,
    },
  });
}
