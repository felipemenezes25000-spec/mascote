/**
 * MascotStatusBubble — balão de fala/status que fica perto do mascote na Home.
 * Mostra a frase contextual de `buildMascotContextLine` ou similar.
 */
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme, EmotionKey } from '@/lib/themes';
import { Typography } from './Typography';

interface Props {
  text: string;
  emotion?: EmotionKey;
  style?: ViewStyle;
}

export function MascotStatusBubble({ text, emotion = 'idle', style }: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const e = theme.tokens.emotion[emotion];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Mascote diz: ${text}`}
      style={[
        styles.bubble,
        { backgroundColor: e.bg, borderColor: e.fg + '33' },
        style,
      ]}
    >
      <Typography variant="caption" style={{ color: e.fg, fontWeight: '600' }}>
        {text}
      </Typography>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    bubble: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      maxWidth: 280,
      alignSelf: 'center',
      ...theme.shadow.sm,
    },
  });
}
