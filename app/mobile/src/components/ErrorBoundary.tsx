/**
 * Error Boundary global — captura exceptions em qualquer tela
 * e mostra fallback amigável em vez de tela branca.
 *
 * React não tem error boundary funcional ainda (precisa classe).
 */

import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    // Logger respeita __DEV__ e encaminha pro sink (Sentry quando wired).
    logger.error('[ErrorBoundary]', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    });
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.emoji}>🌿</Text>
          <Text style={styles.title}>Algo deu errado</Text>
          <Text style={styles.body}>
            A culpa é da gente. Tenta de novo? Se persistir, recarrega o app.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.debug}>{String(this.state.error.message)}</Text>
          )}
          <Pressable onPress={this.reset} style={styles.btn}>
            <Text style={styles.btnText}>Tentar de novo</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#FBF6F1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emoji: { fontSize: 64 },
  title: { fontSize: 22, fontWeight: '700', color: '#1F1A14' },
  body: {
    fontSize: 15,
    color: '#5E5448',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  debug: {
    fontSize: 11,
    color: '#9A8F80',
    fontFamily: 'JetBrainsMono_400Regular',
    marginTop: 16,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: '#FF8030',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    marginTop: 16,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
