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
import { secureGet, secureSet, secureRemove, SECURE_KEYS } from '@/lib/secureStore';

export async function getApiKey(): Promise<string | null> {
  try {
    return await secureGet(SECURE_KEYS.openAiKey);
  } catch {
    // Storage indisponível — comporta-se como "sem chave" e cai pro modo local.
    return null;
  }
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
