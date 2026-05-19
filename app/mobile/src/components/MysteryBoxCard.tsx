import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useStyles, useTheme } from '@/lib/useTheme';
import { noShadow, type Theme } from '@/lib/themes';

/**
 * MysteryBox premium — icon SVG (package/gift) + badge dinâmico.
 * State 'available': gradient laranja com gift icon e badge "1".
 * State 'done': cinza, package icon, label "AMANHÃ".
 */

interface Props {
  available: boolean;
  onOpen: () => void;
}

export function MysteryBoxCard({ available, onOpen }: Props) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onOpen}
      disabled={!available}
      style={[styles.card, !available && styles.cardDone]}
      accessibilityLabel={available ? 'Abrir caixa surpresa' : 'Caixa amanhã'}
    >
      <View style={[styles.iconWrap, !available && styles.iconWrapDone]}>
        <Icon
          name={available ? 'gift' : 'package'}
          size={28}
          color={available ? theme.colors.primary : theme.colors.textDim}
          strokeWidth={2}
        />
      </View>
      <Text style={[styles.label, !available && styles.labelDone]}>
        {available ? 'CAIXA' : 'AMANHÃ'}
      </Text>
      {available && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>1</Text>
        </View>
      )}
    </PressableScale>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      width: 100,
      backgroundColor: theme.colors.text,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      ...theme.shadow.md,
    },
    cardDone: {
      backgroundColor: theme.colors.bg2,
      borderColor: theme.colors.border,
      ...noShadow(),
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary + '22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapDone: {
      backgroundColor: theme.colors.border + '40',
    },
    label: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
      color: '#fff',
      fontFamily: 'JetBrainsMono_500Medium',
    },
    labelDone: { color: theme.colors.textDim },
    badge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: theme.colors.error,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.text,
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
      fontFamily: 'PlusJakartaSans_700Bold',
    },
  });
}
