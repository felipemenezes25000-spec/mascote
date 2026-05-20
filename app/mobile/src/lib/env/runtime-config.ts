/**
 * Runtime-config — single source of truth para ambiente e fail-fast em produção.
 *
 * Antes desse arquivo, cada serviço lia `process.env.EXPO_PUBLIC_*` direto e a
 * detecção de mau-build era warn-only (ver billing-provider.ts:24). Em prod
 * com mock isso significa: usuário paga R$ 0,00, a tela exibe "ativado", e a
 * verdade só aparece quando o suporte recebe a primeira reclamação.
 *
 * Esse módulo:
 * - Lê env vars UMA VEZ (na primeira chamada) e expõe um objeto tipado.
 * - `assertProductionConfig()` LANÇA em prod-mal-configurado (chamar no boot).
 * - Bloqueia explicitamente `EXPO_PUBLIC_OPENAI_API_KEY` em prod — chave OpenAI
 *   pública vaza no bundle JS (qualquer um com APK + jadx extrai).
 *
 * Regra: produção SÓ pode rodar com billing real (RevenueCat ready) E sem
 * chave OpenAI pública no env. Chaves ficam em expo-secure-store (per-user)
 * ou no proxy backend (`EXPO_PUBLIC_AI_PROXY_URL`).
 */
import { getBillingProviderKind, validateBillingEnv, type BillingEnvValidation } from '@/lib/billing-config';

export type RuntimeEnv = 'development' | 'staging' | 'production' | 'test';

export interface RuntimeConfig {
  env: RuntimeEnv;
  isProduction: boolean;
  isDevelopment: boolean;
  isStaging: boolean;
  isTest: boolean;
  billing: BillingEnvValidation;
  /** `true` se EXPO_PUBLIC_OPENAI_API_KEY tiver valor não-vazio. NUNCA aceitar em prod. */
  hasPublicOpenAIKey: boolean;
  /** URL do proxy de IA (recomendado em prod). */
  aiProxyUrl: string | null;
}

function readEnv(name: string): string | undefined {
  // process.env é estaticamente substituído pelo Metro/Babel em build time —
  // por isso variáveis EXPO_PUBLIC_* aparecem como literais no bundle final.
  // Aqui só lemos o que já foi resolvido.
  const v = process.env?.[name];
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizeEnv(raw: string | undefined): RuntimeEnv {
  const lower = (raw ?? '').toLowerCase();
  if (lower === 'production' || lower === 'prod') return 'production';
  if (lower === 'staging' || lower === 'stage') return 'staging';
  if (lower === 'test' || lower === 'testing') return 'test';
  return 'development';
}

/**
 * Determinístico, sem cache — testes precisam alterar env e revalidar.
 * Em hot-path (boot), chamar UMA vez e armazenar o resultado.
 */
export function getRuntimeConfig(): RuntimeConfig {
  const rawEnv = readEnv('EXPO_PUBLIC_ENV') ?? readEnv('NODE_ENV');
  const env = normalizeEnv(rawEnv);
  const billing = validateBillingEnv();

  return {
    env,
    isProduction: env === 'production',
    isDevelopment: env === 'development',
    isStaging: env === 'staging',
    isTest: env === 'test',
    billing,
    hasPublicOpenAIKey: readEnv('EXPO_PUBLIC_OPENAI_API_KEY') !== undefined,
    aiProxyUrl: readEnv('EXPO_PUBLIC_AI_PROXY_URL') ?? null,
  };
}

export interface ProductionConfigViolation {
  code:
    | 'mock_billing_in_production'
    | 'misconfigured_billing'
    | 'public_openai_key_in_production';
  message: string;
  /** Action item objetivo (mostrar pro dev/CI). */
  fix: string;
}

/**
 * Valida o config para produção. Em vez de throw direto, retorna a lista —
 * permite que o boot decida se loga, exibe tela de erro, ou aborta.
 *
 * Outside production: retorna []. Nunca bloqueia dev/test.
 */
export function getProductionViolations(config: RuntimeConfig = getRuntimeConfig()): ProductionConfigViolation[] {
  if (!config.isProduction) return [];
  const issues: ProductionConfigViolation[] = [];

  if (config.billing.provider === 'mock') {
    issues.push({
      code: 'mock_billing_in_production',
      message: 'Billing está em modo mock num build de produção. Usuários não serão cobrados de verdade.',
      fix: 'Defina EXPO_PUBLIC_BILLING_PROVIDER=revenuecat e configure as chaves do RevenueCat antes de publicar.',
    });
  } else if (config.billing.mode === 'production_misconfigured') {
    issues.push({
      code: 'misconfigured_billing',
      message: `Billing real está configurado mas incompleto: ${config.billing.detail}`,
      fix: 'Complete a configuração do RevenueCat (chaves + RC_ENABLED + react-native-purchases linkado).',
    });
  }

  if (config.hasPublicOpenAIKey) {
    issues.push({
      code: 'public_openai_key_in_production',
      message:
        'EXPO_PUBLIC_OPENAI_API_KEY está definido — variáveis EXPO_PUBLIC_* viram literais no bundle. Qualquer um com o APK extrai essa chave.',
      fix:
        'Remova EXPO_PUBLIC_OPENAI_API_KEY do .env de produção. Use o proxy (EXPO_PUBLIC_AI_PROXY_URL) ou deixe o usuário colar a chave em Configurações (vai pro expo-secure-store).',
    });
  }

  return issues;
}

/**
 * Boot guard — chamar UMA vez no root layout antes de renderizar telas.
 * Lança Error se config de produção estiver insegura.
 *
 * Por contrato, NUNCA lança em dev/test. Use isso pra falhar build/CI,
 * não pra esconder bugs em ambiente real.
 */
export function assertProductionConfig(config: RuntimeConfig = getRuntimeConfig()): void {
  const violations = getProductionViolations(config);
  if (violations.length === 0) return;

  const summary = violations.map((v, i) => `  ${i + 1}. [${v.code}] ${v.message}\n     ⟶ ${v.fix}`).join('\n');
  throw new Error(
    `assertProductionConfig: build de produção com ${violations.length} violação(ões):\n${summary}`,
  );
}
