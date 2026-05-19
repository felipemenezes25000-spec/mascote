import { StyleSheet, Text, View } from 'react-native';
import { useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

interface Props {
  role: 'user' | 'mascot';
  text: string;
  mascotColor?: string;
  safetyFlag?: 'safe' | 'watch' | 'high' | 'critical';
}

export function ChatBubble({ role, text, mascotColor, safetyFlag }: Props) {
  const styles = useStyles(makeStyles);
  const isUser = role === 'user';
  const isCrisis = safetyFlag === 'critical';
  return (
    <View
      style={[
        styles.row,
        { justifyContent: isUser ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.user : styles.mascot,
          isCrisis && styles.crisis,
          !isUser && mascotColor ? { backgroundColor: mascotColor + '22', borderColor: mascotColor + '55' } : null,
        ]}
      >
        <Text style={[styles.text, isUser ? styles.userText : styles.mascotText]}>
          {text}
        </Text>
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
    },
    bubble: {
      maxWidth: '82%',
      paddingVertical: theme.spacing.sm + 2,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
    },
    user: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      borderBottomRightRadius: 4,
    },
    mascot: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderBottomLeftRadius: 4,
    },
    crisis: {
      backgroundColor: '#FFF5F1',
      borderColor: theme.colors.error,
    },
    text: { ...theme.text.body },
    userText: { color: '#fff' },
    mascotText: { color: theme.colors.text },
  });
}
