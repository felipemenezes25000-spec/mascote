/**
 * Cliente OpenAI singleton lazy. Instancia uma vez por chave; troca de chave
 * invalida o cache automaticamente (compara `apiKey` atual vs cacheado).
 *
 * `dangerouslyAllowBrowser: true` é necessário para Expo Web — o SDK detecta
 * `window` e barra a importação sem essa flag. Em produção mobile (iOS/Android)
 * o flag não muda comportamento; mas mantém o código portável.
 *
 * Trade-off conhecido: BYOK em cliente expõe a chave ao bundle JS. O usuário
 * está ciente disso (UI deixa claro "BYOK = bring your own key"). Quando o
 * Proxy oficial entrar no ar, ele é preferido automaticamente (ver ai.ts).
 *
 * Timeout/retry: o default do SDK é 600s (10min) + 2 retries — calibrado pra
 * jobs de servidor, NÃO pra chat interativo. `chat-engine.ts` chama o SDK
 * direto (sem o AbortController de `ai.ts`), então sem isso uma requisição
 * travada congelava a UI por até 10min. 20s + 1 retry cobre gpt-4o-mini com
 * folga e degrada pro mock local rapidamente em caso de rede ruim.
 */
import OpenAI from 'openai';
import { getApiKey } from './credentials';

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 1;

let cached: OpenAI | null = null;
let cachedKey: string | null = null;

export async function getOpenAI(): Promise<OpenAI | null> {
  const key = await getApiKey();
  if (!key) {
    // Limpa cache se a chave foi removida no SecureStore — evita usar uma
    // instância stale apontando pra chave que o user já apagou.
    cached = null;
    cachedKey = null;
    return null;
  }
  if (cached && cachedKey === key) return cached;
  cached = new OpenAI({
    apiKey: key,
    dangerouslyAllowBrowser: true,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  cachedKey = key;
  return cached;
}

/** Apenas para testes — limpa cache do cliente. */
export function __resetOpenAIClient(): void {
  cached = null;
  cachedKey = null;
}
