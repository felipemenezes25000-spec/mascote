/**
 * useDraftAutoSave — persiste draft em AsyncStorage com debounce.
 *
 * Use case: usuário está customizando, app crasha / kill / fica em background
 * por horas. Sem auto-save, todo trabalho some. Com auto-save, restore on
 * mount próximo + clear quando user comita ou descarta explicitamente.
 *
 * Estratégia:
 *  - Debounce do save (default 800ms idle) — evita 1 write por tap de slider
 *  - Restauração assíncrona no mount via callback `onRestore`
 *  - clear() expõe API pra caller invocar após persist real (commit) ou
 *    discard explícito (cancel)
 *  - storageKey por user_id pra não vazar entre profiles
 *
 * Trade-off: AsyncStorage é simples mas serial (1 write por vez). Pra storage
 * intensivo (frame-rate) usar MMKV. Pro Atelier (800ms debounce) é fine.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

const STORAGE_PREFIX = 'mascote:atelier_draft:';

interface AutoSaveEnvelope<T> {
  schema: 1;
  saved_at: string;
  payload: T;
}

export interface UseDraftAutoSaveOptions<T> {
  /** ID do usuário — usado como suffix da storage key. */
  userId: string | null;
  /** Draft atual — null = não persistir (typicamente antes de load). */
  draft: T | null;
  /** Debounce em ms (default 800). */
  debounceMs?: number;
  /** Chamado UMA VEZ no mount com draft restaurado (null se não havia). */
  onRestore?: (restored: T | null) => void;
}

export interface DraftAutoSaveAPI {
  /** Quando foi o último save bem-sucedido. */
  lastSavedAt: string | null;
  /** Limpa storage E para o debounce. Use APÓS commit real ou discard. */
  clear: () => Promise<void>;
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function useDraftAutoSave<T>(
  options: UseDraftAutoSaveOptions<T>,
): DraftAutoSaveAPI {
  const { userId, draft, debounceMs = 800, onRestore } = options;
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  // Restauração no mount — UMA VEZ por userId
  useEffect(() => {
    if (!userId || restoredRef.current) return;
    restoredRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey(userId));
        if (cancelled) return;
        if (!raw) {
          onRestoreRef.current?.(null);
          return;
        }
        const env = JSON.parse(raw) as AutoSaveEnvelope<T>;
        if (env?.schema === 1 && env.payload !== undefined) {
          onRestoreRef.current?.(env.payload);
          setLastSavedAt(env.saved_at);
        } else {
          onRestoreRef.current?.(null);
        }
      } catch (e) {
        logger.warn?.('[useDraftAutoSave] restore failed', {
          reason: e instanceof Error ? e.message : 'unknown',
        });
        onRestoreRef.current?.(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Save debounced em cada mudança de draft (após restore inicial)
  useEffect(() => {
    if (!userId || draft === null) return;
    if (!restoredRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const env: AutoSaveEnvelope<T> = {
        schema: 1,
        saved_at: new Date().toISOString(),
        payload: draft,
      };
      AsyncStorage.setItem(storageKey(userId), JSON.stringify(env))
        .then(() => setLastSavedAt(env.saved_at))
        .catch(e => {
          logger.warn?.('[useDraftAutoSave] save failed', {
            reason: e instanceof Error ? e.message : 'unknown',
          });
        });
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [userId, draft, debounceMs]);

  const clear = useCallback(async (): Promise<void> => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (!userId) return;
    try {
      await AsyncStorage.removeItem(storageKey(userId));
      setLastSavedAt(null);
    } catch (e) {
      logger.warn?.('[useDraftAutoSave] clear failed', {
        reason: e instanceof Error ? e.message : 'unknown',
      });
    }
  }, [userId]);

  return { lastSavedAt, clear };
}
