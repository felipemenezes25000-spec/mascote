/**
 * Wrapper para `expo-secure-store` com fallback automático para AsyncStorage no
 * web (onde SecureStore não funciona). No mobile, usa Keychain (iOS) / Keystore
 * + EncryptedSharedPreferences (Android).
 *
 * NUNCA logue valores retornados — esta camada existe pra guardar segredos
 * (chave OpenAI, futuros tokens). Tratamento de erro silencioso (return null)
 * é proposital: queremos `getItem` nunca rejeitar e quebrar a UI.
 *
 * Para testes, exportamos `__setBackend()` que permite injetar um mock.
 */
import { Platform } from 'react-native';

export interface SecureBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

let backend: SecureBackend | null = null;

async function defaultBackend(): Promise<SecureBackend> {
  if (Platform.OS === 'web') {
    // Web: SecureStore não existe — usa AsyncStorage como melhor esforço.
    // Aviso explícito: dados no localStorage do navegador NÃO são criptografados.
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    return {
      getItem: k => AsyncStorage.getItem(`secure:${k}`),
      setItem: (k, v) => AsyncStorage.setItem(`secure:${k}`, v),
      removeItem: k => AsyncStorage.removeItem(`secure:${k}`),
    };
  }
  try {
    const SecureStore = await import('expo-secure-store');
    return {
      getItem: k => SecureStore.getItemAsync(k),
      setItem: (k, v) => SecureStore.setItemAsync(k, v),
      removeItem: k => SecureStore.deleteItemAsync(k),
    };
  } catch {
    /* v8 ignore start — fallback ultimo recurso pra ambientes que negam ambos
       expo-secure-store E AsyncStorage falha. Exercitar exigiria mock do
       Module Registry, contra-produtivo. */
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    return {
      getItem: k => AsyncStorage.getItem(`secure:${k}`),
      setItem: (k, v) => AsyncStorage.setItem(`secure:${k}`, v),
      removeItem: k => AsyncStorage.removeItem(`secure:${k}`),
    };
    /* v8 ignore stop */
  }
}

async function getBackend(): Promise<SecureBackend> {
  if (!backend) backend = await defaultBackend();
  return backend;
}

export async function secureGet(key: string): Promise<string | null> {
  try {
    const b = await getBackend();
    return await b.getItem(key);
  } catch {
    return null;
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  try {
    const b = await getBackend();
    await b.setItem(key, value);
  } catch {
    // engole — secureSet nunca pode quebrar a UI
  }
}

export async function secureRemove(key: string): Promise<void> {
  try {
    const b = await getBackend();
    await b.removeItem(key);
  } catch {
    // engole
  }
}

/** Apenas para testes — injeta um backend mock. */
export function __setBackend(b: SecureBackend | null): void {
  backend = b;
}

export const SECURE_KEYS = {
  openAiKey: 'mascote.openai_key',
} as const;
