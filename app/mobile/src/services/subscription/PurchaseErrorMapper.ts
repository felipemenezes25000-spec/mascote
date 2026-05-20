/**
 * Mapeia erros de billing (RevenueCat / lojas) para mensagens PT-BR honestas.
 */

import type { PurchaseError } from './SubscriptionTypes';

const KNOWN: Record<string, Omit<PurchaseError, 'code'>> = {
  user_cancelled: {
    message: 'User cancelled purchase',
    userMessage: 'Compra cancelada. Seu mascote continua do jeitinho que estava.',
    recoverable: true,
  },
  payment_pending: {
    message: 'Payment pending',
    userMessage: 'Pagamento pendente — aguarde a confirmação da loja.',
    recoverable: true,
  },
  store_problem: {
    message: 'Store unavailable',
    userMessage: 'A loja está indisponível agora. Tente de novo em alguns minutos.',
    recoverable: true,
  },
  product_not_available: {
    message: 'Product not found',
    userMessage: 'Este plano ainda não está disponível na sua região.',
    recoverable: false,
  },
  already_purchased: {
    message: 'Already subscribed',
    userMessage: 'Você já tem Plus ativo. Use "Restaurar compras" se não aparecer.',
    recoverable: true,
  },
  network_error: {
    message: 'Network error',
    userMessage: 'Sem conexão estável. Verifique a internet e tente de novo.',
    recoverable: true,
  },
  billing_unavailable: {
    message: 'Billing not configured',
    userMessage: 'Assinaturas ainda não estão ativas neste build.',
    recoverable: false,
  },
};

export function mapPurchaseError(codeOrMessage: string): PurchaseError {
  const key = codeOrMessage.toLowerCase().replace(/\s+/g, '_');
  const hit = KNOWN[key];
  if (hit) return { code: key, ...hit };

  if (/cancel/i.test(codeOrMessage)) return { code: 'user_cancelled', ...KNOWN.user_cancelled };
  if (/network|offline|fetch/i.test(codeOrMessage)) return { code: 'network_error', ...KNOWN.network_error };

  return {
    code: 'unknown',
    message: codeOrMessage,
    userMessage: 'Não conseguimos concluir a compra. Tente de novo ou restaure compras.',
    recoverable: true,
  };
}
