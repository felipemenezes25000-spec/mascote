import { create } from 'zustand';
import type { Mascot, Profile, Settings, Streak, Wallet } from '@/types';
import { mascots, profiles, runMigrations, settings, streaks, wallet as walletDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import { SECURE_KEYS, secureGet, secureRemove, secureSet } from '@/lib/secureStore';
import type { UnlockToastData } from '@/components/UnlockToast';

interface AppState {
  hydrated: boolean;
  profile: Profile | null;
  mascot: Mascot | null;
  streak: Streak | null;
  settings: Settings | null;
  wallet: Wallet | null;
  openAiKey: string | null;
  toastQueue: UnlockToastData[];
  currentToast: UnlockToastData | null;
  hydrate: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
  setMascot: (m: Mascot | null) => void;
  setStreak: (s: Streak | null) => void;
  setSettings: (s: Settings | null) => void;
  setWallet: (w: Wallet | null) => void;
  refreshMascot: () => Promise<void>;
  refreshStreak: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  setOpenAiKey: (key: string | null) => void;
  enqueueToast: (t: UnlockToastData) => void;
  shiftToast: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  hydrated: false,
  profile: null,
  mascot: null,
  streak: null,
  settings: null,
  wallet: null,
  openAiKey: null,
  toastQueue: [],
  currentToast: null,

  async hydrate() {
    // Migrations PRIMEIRO. Se schema mudou, queremos transformar antes de
    // qualquer leitura de domínio, senão lemos tipo antigo como se fosse novo.
    // Se migrations falharem, ainda tentamos hidratar — telas degradam mas
    // app não trava em "splash infinito".
    try {
      await runMigrations();
    } catch {
      // intencional: prossegue mesmo sem migration completa
    }
    // Hidrata a chave OpenAI em paralelo com profile. Sem isso, BYOK
    // perde-se a cada cold start (regressão UX).
    /* v8 ignore start — `.catch(() => null)` em profiles.get é redundância
       defensiva: profiles.get tem try/catch interno e retorna null/[] em erro,
       nunca rejeita. O early-return `if (!profile)` é exercitado em testes. */
    const [openAiKey, profile] = await Promise.all([
      secureGet(SECURE_KEYS.openAiKey),
      profiles.get().catch(() => null),
    ]);
    if (!profile) {
      set({ openAiKey, hydrated: true });
      return;
    }
    /* v8 ignore stop */
    // Leituras por usuário rodam em paralelo — eram 4 awaits sequenciais
    // (~80-150ms no AsyncStorage de device baixo) que dava pra colapsar
    // numa única espera. Promise.all + catch defaultivo por valor.
    /* v8 ignore start — todos os getters abaixo têm try/catch interno;
       estes .catch são redundância defensiva caso o contrato mude. */
    const [mascot, streak, set_, w] = await Promise.all([
      mascots.forUser(profile.id).catch(() => null),
      streaks.get(profile.id).catch(() => null),
      settings.get(profile.id).catch(() => null),
      walletDb.get(profile.id).catch(() => null),
    ]);
    /* v8 ignore stop */
    set({ profile, mascot, streak, settings: set_, wallet: w, openAiKey, hydrated: true });
  },

  setProfile(p) {
    set({ profile: p });
  },
  setMascot(m) {
    set({ mascot: m });
  },
  setStreak(s) {
    set({ streak: s });
  },
  setSettings(s) {
    set({ settings: s });
  },
  setWallet(w) {
    set({ wallet: w });
  },

  async refreshMascot() {
    const p = get().profile;
    if (!p) return;
    const m = await mascots.forUser(p.id);
    set({ mascot: m });
  },

  async refreshStreak() {
    const p = get().profile;
    if (!p) return;
    const s = await streaks.get(p.id);
    set({ streak: s });
  },

  async refreshSettings() {
    const p = get().profile;
    if (!p) return;
    const s = await settings.get(p.id);
    set({ settings: s });
  },

  async refreshWallet() {
    const p = get().profile;
    if (!p) return;
    const w = await walletDb.get(p.id);
    set({ wallet: w });
  },

  setOpenAiKey(key) {
    set({ openAiKey: key });
    // Persiste no SecureStore. Fire-and-forget — UI já reflete o estado.
    // Loga falhas: secureSet engole exceções internas, mas se o backend
    // estiver indisponível por completo o user perde o BYOK no próximo
    // cold start sem nenhum sinal — o log ajuda a diagnosticar.
    const persist = key
      ? secureSet(SECURE_KEYS.openAiKey, key)
      : secureRemove(SECURE_KEYS.openAiKey);
    /* v8 ignore start — secureSet/secureRemove engolem erros internamente,
       então este .catch é uma guard defensiva contra mudança de contrato
       (evita unhandled rejection se um dia secureStore propagar). */
    void persist.catch(err => {
      logger.warn('[store] secure persist failed for openAiKey', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
    });
    /* v8 ignore stop */
  },

  enqueueToast(t) {
    const state = get();
    if (state.currentToast === null) {
      set({ currentToast: t });
    } else {
      set({ toastQueue: [...state.toastQueue, t] });
    }
  },

  shiftToast() {
    const state = get();
    if (state.toastQueue.length > 0) {
      const [next, ...rest] = state.toastQueue;
      set({ currentToast: next, toastQueue: rest });
    } else {
      set({ currentToast: null });
    }
  },
}));
