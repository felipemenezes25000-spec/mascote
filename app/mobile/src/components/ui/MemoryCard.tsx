/**
 * MemoryCard — card de memória colecionável.
 * Mostra: data, título, snippet, badge de raridade (se houver), tone arquétipo.
 */
import { View, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme, RarityLevel } from '@/lib/themes';
import { Typography } from './Typography';
import { Badge } from './Badge';

export interface MemoryCardData {
  id: string;
  title: string;
  snippet?: string;
  date: string; // ISO ou label local
  rarity?: RarityLevel;
  emoji?: string;
}

interface Props {
  memory: MemoryCardData;
  onPress?: () => void;
  style?: ViewStyle;
}

export function MemoryCard({ memory, onPress, style }: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Memória: ${memory.title}`}
      style={({ pressed }: { pressed?: boolean }) => [
        styles.card,
        pressed && { opacity: 0.92 },
        style,
      ]}
    >
      {memory.emoji ? <Typography style={styles.emoji}>{memory.emoji}</Typography> : null}
      <View style={styles.body}>
        <Typography variant="caption" tone="dim">{memory.date}</Typography>
        <Typography variant="bodyBold" numberOfLines={2}>{memory.title}</Typography>
        {memory.snippet ? <Typography variant="caption" tone="secondary" numberOfLines={2}>{memory.snippet}</Typography> : null}
        {memory.rarity ? (
          <View style={styles.rarity}>
            <Badge label={memory.rarity.toUpperCase()} variant={{ rarity: memory.rarity }} />
          </View>
        ) : null}
      </View>
    </Wrapper>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 4,
      flexDirection: 'row',
      alignItems: 'flex-start',
      ...theme.shadow.sm,
    },
    emoji: { fontSize: 24, marginRight: theme.spacing.sm },
    body: { flex: 1, gap: 4 },
    rarity: { marginTop: 6 },
  });
}
