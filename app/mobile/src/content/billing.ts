/**
 * Fonte única de verdade para planos e preços do Mascote.
 *
 * Quando os mesmos tiers/preços apareciam em telas diferentes (paywall.tsx
 * e subscription.tsx), divergiam — R$19,90 vs R$24,90, 2 tiers vs 3 tiers.
 * Esse arquivo centraliza pra evitar drift. Preço canônico: R$ 19,90/mês,
 * R$ 199,00/ano — alinhado com landing mascotevirtual.com.br.
 *
 * IMPORTANTE: estes são preços de DEMO. Em produção real, o app precisa
 * integrar com RevenueCat / StoreKit / Play Billing e ler IDs de SKU
 * dali. Tratar valores hardcoded como mock até essa integração existir.
 */

export type BillingTierId = 'free' | 'plus_monthly' | 'plus_annual';

export interface BillingTier {
  id: BillingTierId;
  name: string;
  /** Preço mensal efetivo, em centavos. 0 = grátis. */
  monthlyCents: number;
  /** Preço total cobrado por ciclo (mensal ou anual), em centavos. */
  totalCents: number;
  /** Período de cobrança. */
  period: 'free' | 'monthly' | 'annual';
  /** Trial em dias. 0 = sem trial. */
  trialDays: number;
  /** Benefícios listados, em ordem de prioridade pra layout. */
  benefits: readonly string[];
  /** Tag visual (ex: "RECOMENDADO", "ATUAL", undefined = sem badge). */
  badge?: string;
  /** Para anual: comparação com o mensal. */
  savingsPct?: number;
}

const free: BillingTier = {
  id: 'free',
  name: 'Free',
  monthlyCents: 0,
  totalCents: 0,
  period: 'free',
  trialDays: 0,
  benefits: [
    'Mascote evolui até a fase Adolescente',
    'Chat IA 10 mensagens por dia',
    'Cenário Quartinho',
    'Relatório semanal básico',
  ],
};

const plusMonthly: BillingTier = {
  id: 'plus_monthly',
  name: 'Bipo Plus',
  monthlyCents: 1990,
  totalCents: 1990,
  period: 'monthly',
  trialDays: 7,
  benefits: [
    'Mascote evolui até a fase Evoluído',
    'Chat IA ilimitado',
    'Todos os cenários (incluindo Biblioteca, Lua, Café)',
    'Streak Freeze ilimitado',
    'Acessórios e formas raras sazonais',
    'Relatório Plus com exportação',
    'Sem anúncios. Sem culpa.',
  ],
};

const plusAnnual: BillingTier = {
  id: 'plus_annual',
  name: 'Bipo Plus Anual',
  monthlyCents: Math.round(19900 / 12),
  totalCents: 19900,
  period: 'annual',
  trialDays: 7,
  benefits: plusMonthly.benefits,
  badge: 'RECOMENDADO',
  savingsPct: Math.round((1 - 19900 / 12 / 1990) * 100),
};

export const BILLING_TIERS: readonly BillingTier[] = [free, plusMonthly, plusAnnual];

export function getTier(id: BillingTierId): BillingTier {
  const t = BILLING_TIERS.find(t => t.id === id);
  if (!t) throw new Error(`[billing] unknown tier: ${id}`);
  return t;
}

/** Formata centavos como "R$ X,YY" PT-BR. */
export function formatBRL(cents: number): string {
  const reais = cents / 100;
  return `R$ ${reais.toFixed(2).replace('.', ',')}`;
}

export function formatPerMonth(tier: BillingTier): string {
  if (tier.period === 'free') return 'Grátis';
  if (tier.period === 'monthly') return `${formatBRL(tier.totalCents)}/mês`;
  // anual
  return `${formatBRL(tier.monthlyCents)}/mês (cobrado ${formatBRL(tier.totalCents)}/ano)`;
}
