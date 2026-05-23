/**
 * Painel debug Unity — visível com EXPO_PUBLIC_UNITY_DEBUG_PANEL=true.
 */

import { StyleSheet, View } from 'react-native';
import { Typography } from '@/components/ui';

export interface UnityDebugPanelProps {
  version: string | null;
  ready: boolean;
  lastError: string | null;
  lastMessage: string | null;
  native: boolean;
}

export function UnityDebugPanel({
  version,
  ready,
  lastError,
  lastMessage,
  native,
}: UnityDebugPanelProps) {
  return (
    <View style={styles.panel} accessibilityLabel="Painel debug Unity">
      <Typography variant="mono" tone="secondary" style={styles.line}>
        {ready ? '✓ pronto' : '… carregando'} · {native ? 'nativo' : 'stub'}
      </Typography>
      {version ? (
        <Typography variant="mono" tone="secondary" style={styles.line}>
          v{version}
        </Typography>
      ) : null}
      {lastMessage ? (
        <Typography variant="mono" tone="secondary" style={styles.line}>
          último: {lastMessage}
        </Typography>
      ) : null}
      {lastError ? (
        <Typography variant="mono" tone="secondary" style={styles.error}>
          {lastError}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    gap: 2,
  },
  line: { fontSize: 9, color: '#ccc' },
  error: { fontSize: 9, color: '#f88' },
});
