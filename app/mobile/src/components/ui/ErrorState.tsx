/**
 * ErrorState — exibe mensagem de erro + ação opcional (retry).
 */
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import { Typography } from './Typography';
import { Button } from '@/components/Button';

interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Algo deu errado', message, onRetry }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.base, { backgroundColor: theme.tokens.emotion.comforted.bg, borderRadius: theme.radius.md }]}>
      <Typography variant="bodyBold" tone="error" align="center">{title}</Typography>
      {message ? <Typography variant="caption" tone="secondary" align="center">{message}</Typography> : null}
      {onRetry ? (
        <View style={styles.action}>
          <Button label="Tentar de novo" onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { padding: 16, gap: 8 },
  action: { marginTop: 8, alignSelf: 'center' },
});
