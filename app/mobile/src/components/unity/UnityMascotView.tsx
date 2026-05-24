/**
 * View Unity — nativa quando módulo disponível, placeholder graceful caso contrário.
 */

import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Typography } from '@/components/ui';
import { useTheme } from '@/lib/useTheme';
import type { UnityMascotState } from './UnityMascotTypes';
import { unityMascotBridge } from './UnityMascotBridge';
import { useUnityMascot } from './useUnityMascot';
import { UnityDebugPanel } from './UnityDebugPanel';

export interface UnityMascotViewProps {
  state: UnityMascotState | null;
  size?: number;
  simulateFailure?: boolean;
  onReady?: (version: string) => void;
  onFallback?: () => void;
}

function UnityMascotViewImpl({
  state,
  size = 220,
  simulateFailure,
  onReady,
  onFallback,
}: UnityMascotViewProps) {
  const theme = useTheme();
  const native = unityMascotBridge.isNativeAvailable();
  const { ready, version, lastError, lastMessage, debugPanel } = useUnityMascot({
    state,
    simulateFailure,
    onReady,
    onFallback,
  });
  const ackStats = unityMascotBridge.getAckStats();

  return (
    <View
      style={[styles.shell, { width: size, height: size }]}
      accessibilityLabel="mascote Unity"
      accessibilityRole="image"
    >
      {!ready ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : null}
      <Typography variant="caption" tone="secondary" style={styles.label}>
        {simulateFailure
          ? 'Unity indisponível'
          : ready
            ? native
              ? `Unity nativo ${version ?? ''}`
              : `Unity ${version ?? 'stub'}`
            : 'Unity carregando…'}
      </Typography>
      {debugPanel ? (
        <UnityDebugPanel
          version={version}
          ready={ready}
          lastError={lastError}
          lastMessage={lastMessage}
          native={native}
          ackLatencyMs={ackStats.lastAckLatencyMs}
          ackRetryCount={ackStats.retryCount}
          ackLastSeq={ackStats.lastAckSeq}
          ackTimeoutCount={ackStats.timeoutCount}
        />
      ) : lastError ? (
        <Typography variant="mono" tone="secondary" style={styles.debug}>
          {lastError}
        </Typography>
      ) : null}
    </View>
  );
}

export const UnityMascotView = memo(UnityMascotViewImpl);

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: { textAlign: 'center' },
  debug: { fontSize: 10, textAlign: 'center', maxWidth: '90%' },
});
