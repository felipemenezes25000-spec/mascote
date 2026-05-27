/**
 * Wrapper de credenciais OpenAI — guarda a API key do usuário em SecureStore
 * (Keychain iOS / Keystore Android; localStorage prefixado no web via secureStore.ts).
 *
 * NUNCA logar a chave. NUNCA expor em mensagens de erro / analytics / breadcrumbs.
 * O wrapper `secureGet/secureSet` já faz fallback automático no web (sem criptografia
 * real, mas pelo menos prefixado e não exposto em URL/params).
 *
 * Validação: chave deve começar com `sk-` e ter tamanho minimo plausível
 * (chaves OpenAI hoje têm ~50 chars + prefix). Fail soft para o caller exibir Alert.
 */
import { getRuntimeConfig } from '@/lib/env/runtime-config';
import { secureGet, secureSet, secureRemove, SECURE_KEYS } from '@/lib/secureStore';

/** Dev-only: EXPO_PUBLIC_OPENAI_API_KEY no .env local (gitignored). Nunca em prod. */
export function getDevOpenAiKeyFallback(): string | null {
  const { isDevelopment } = getRuntimeConfig();
  if (!isDevelopment) return null;
  const raw = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim();
  if (!raw || !raw.startsWith('sk-') || raw.length < 20) return null;
  return raw;
}

export async function resolveOpenAiKey(): Promise<string | null> {
  try {
    const stored = await secureGet(SECURE_KEYS.openAiKey);
    if (stored) return stored;
  } catch {
    // Storage indisponível — tenta fallback de dev abaixo.
  }
  return getDevOpenAiKeyFallback();
}

export async function getApiKey(): Promise<string | null> {
  return resolveOpenAiKey();
}

export async function setApiKey(apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed.startsWith('sk-')) {
    throw new Error('Chave OpenAI inválida — precisa começar com "sk-".');
  }
  if (trimmed.length < 20) {
    throw new Error('Chave OpenAI muito curta — verifique se copiou ela inteira.');
  }
  await secureSet(SECURE_KEYS.openAiKey, trimmed);
}

export async function clearApiKey(): Promise<void> {
  await secureRemove(SECURE_KEYS.openAiKey);
}
