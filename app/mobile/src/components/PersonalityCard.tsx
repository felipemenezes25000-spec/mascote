import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Mascot } from '@/components/Mascot';
import { useStyles } from '@/lib/useTheme';
import { makeShadow } from '@/lib/themes';
import type { Theme } from '@/lib/themes';
import type { PersonalityMeta } from '@/content/personalities';

interface Props {
  meta: PersonalityMeta;
  selected: boolean;
  onPress: () => void;
}

export function PersonalityCard({ meta, selected, onPress }: Props) {
  const styles = useStyles(makeStyles);
  const [pressCount, setPressCount] = useState(0);

  // animação de seleção (scale + halo)
  const scale = useSharedValue(1);
  const halo = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.02 : 1, { damping: 14, stiffness: 180 });
    if (selected) {
      halo.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.5, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      );
    } else {
      cancelAnimation(halo);
      halo.value = withTiming(0, { duration: 200 });
    }
    return () => {
      cancelAnimation(scale);
      cancelAnimation(halo);
    };
  }, [selected]);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value * 0.55 }));

  const handlePress = () => {
    setPressCount(c => c + 1);
    onPress();
  };

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          selected && {
            borderColor: meta.primaryColor,
            borderWidth: 2,
            backgroundColor: meta.accentColor + '12',
            ...makeShadow(meta.primaryColor, 0, 6, 22, 0.18, 4),
          },
          pressed && { opacity: 0.96 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Escolher ${meta.label}, ${meta.mascotName}`}
        accessibilityState={{ selected }}
      >
        <View style={styles.mascotWrap}>
          {/* halo atrás do mascote quando selecionado */}
          <Animated.View
            style={[
              styles.halo,
              { backgroundColor: meta.primaryColor },
              haloStyle,
            ]}
          />
          <Mascot
            personality={meta.id}
            phase="crianca"
            mood="feliz"
            size={72}
            reactTrigger={pressCount}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <Text style={styles.label}>{meta.label}</Text>
            <Text style={[styles.mascotName, { color: meta.primaryColor }]}>· {meta.mascotName}</Text>
          </View>
          <Text style={styles.tagline}>{meta.tagline}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {meta.description}
          </Text>
        </View>
        {selected && (
          <View style={[styles.check, { backgroundColor: meta.primaryColor }]}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    mascotWrap: {
      width: 76,
      height: 76,
      alignItems: 'center',
      justifyContent: 'center',
    },
    halo: {
      position: 'absolute',
      width: 88,
      height: 88,
      borderRadius: 44,
      opacity: 0,
    },
    headerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' },
    label: { ...theme.text.h3, color: theme.colors.text },
    mascotName: {
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontStyle: 'italic',
      fontSize: 16,
      lineHeight: 22,
    },
    tagline: { ...theme.text.sm, color: theme.colors.textSecondary, marginBottom: 4 },
    description: { ...theme.text.sm, color: theme.colors.textDim },
    check: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkText: { color: '#fff', fontWeight: '800', fontSize: 14, lineHeight: 16 },
  });
}
