/**
 * Error Boundary global — captura exceptions em qualquer tela
 * e mostra fallback amigável em vez de tela branca.
 *
 * React não tem error boundary funcional ainda (precisa classe).
 */

import { Component, type ReactNode } from 'react';
import { Appearance, Pressable, StyleSheet, Text, View } from 'react-native';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// ErrorBoundary é class component (React não suporta hooks aqui), então não
// pode usar useTheme(). Lemos Appearance no momento da render — se o usuário
// trocar tema enquanto a tela de erro está aberta, ele recarrega o app e o
// boundary reseta. Vale o trade-off vs. forçar um wrapper funcional só pra
// ler o store de tema.
const palette = (isDark: boolean) =>
  isDark
    ? { bg: '#15110D', text: '#FCF3E7', textDim: '#C6B6A0', debug: '#A89578' }
    : { bg: '#FBF6F1', text: '#1F1A14', textDim: '#5E5448', debug: '#9A8F80' };

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
      const c = palette(Appearance.getColorScheme() === 'dark');
      return (
        <View style={[styles.wrap, { backgroundColor: c.bg }]}>
          <Text style={styles.emoji}>🌿</Text>
          <Text style={[styles.title, { color: c.text }]}>Algo deu errado</Text>
          <Text style={[styles.body, { color: c.textDim }]}>
            A culpa é da gente. Tenta de novo? Se persistir, recarrega o app.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={[styles.debug, { color: c.debug }]}>{String(this.state.error.message)}</Text>
          )}
          <Pressable
            onPress={this.reset}
            style={styles.btn}
            accessibilityRole="button"
            accessibilityLabel="Tentar de novo"
          >
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emoji: { fontSize: 64 },
  title: { fontSize: 22, fontWeight: '700' },
  body: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  debug: {
    fontSize: 11,
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
