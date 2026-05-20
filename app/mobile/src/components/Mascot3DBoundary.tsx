/**
 * Mascot3DBoundary — error boundary local em volta de Mascot3D.
 *
 * Caso o pipeline 3D quebre (lib WebGL ausente, R3F crash, GPU fail), faz
 * fallback transparente para o `fallback` prop (geralmente Mascot2D),
 * preservando posição/animação/acessórios. Difere do ErrorBoundary global
 * porque NÃO mostra UI de erro — o objetivo é resiliência silenciosa.
 *
 * Em DEV, loga o stack pra investigação. Em prod só envia ao logger
 * (Sentry quando wired).
 */
import { Component, type ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  /** Callback opcional invocado uma vez por instância quando cai pra 2D. */
  onFallback?: (error: Error) => void;
}

interface State {
  failed: boolean;
}

export class Mascot3DBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    logger.warn('[Mascot3D] fallback to 2D', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    });
    this.props.onFallback?.(error);
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
