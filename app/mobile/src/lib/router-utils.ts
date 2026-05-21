/**
 * Helpers de navegação que toleram entry-points sem histórico.
 *
 * router.back() loga warning "GO_BACK was not handled by any navigator" quando
 * a tela foi acessada via deep-link/URL direta (sem prev screen). Em produção
 * o user fica preso. safeBack cai pra rota de fallback nesse caso.
 */
import { router } from 'expo-router';

export function safeBack(fallback: string = '/'): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
