/**
 * EvolutionRevealModal — modal celebratório quando o mascote evolui.
 * Variante mais reusável que `EvolutionModal` (que tem comportamento legado).
 *
 * Use para milestones (primeira semana, ascensão para arquétipo dominante,
 * mutação rara). Para evolução de fase, ainda use `EvolutionModal` legado.
 */
import { useEffect, useRef } from 'react';
import { Modal, View, StyleSheet, Animated, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme, ArchetypeKey } from '@/lib/themes';
import { Typography } from './Typography';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';

interface Props {
  visible: boolean;
  archetype?: ArchetypeKey;
  title: string;
  body: string;
  ctaLabel?: string;
  onClose: () => void;
}

export function EvolutionRevealModal({
  visible,
  archetype,
  title,
  body,
  ctaLabel = 'Continuar',
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const arch = archetype ? theme.tokens.archetype[archetype] : null;
  const accent = arch?.fg ?? theme.colors.primary;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.8);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity]);
  return (
    <Modal visible={visible} onRequestClose={onClose} transparent animationType="fade">
      <Pressable
        accessibilityLabel="Fechar"
        onPress={onClose}
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
      />
      <SafeAreaView pointerEvents="box-none" style={styles.center}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale }],
              opacity,
              backgroundColor: theme.colors.surface,
              borderColor: accent + '55',
              borderRadius: theme.radius.xl,
            },
          ]}
        >
          <View style={[styles.halo, { backgroundColor: accent + '14' }]}>
            <Icon name="sparkles" size={36} color={accent} strokeWidth={2.2} />
          </View>
          <Typography variant="title" align="center" style={{ color: accent }}>{title}</Typography>
          <Typography tone="secondary" align="center">{body}</Typography>
          <Button label={ctaLabel} onPress={onClose} />
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
    card: {
      width: '100%',
      maxWidth: 380,
      padding: theme.spacing.lg + 4,
      borderWidth: 1,
      gap: theme.spacing.md,
      alignItems: 'center',
      ...theme.shadow.md,
    },
    halo: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
