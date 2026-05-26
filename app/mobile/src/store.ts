import { create } from 'zustand';
import type { HabitKind, Mascot, MascotDNA, Profile, Settings, Streak, Wallet } from '@/types';
import { applyHabitDrift, sanitizeGenome } from '@/lib/dna';
import { readSystemReduceMotion } from '@/lib/accessibility';
import { mascots, profiles, runMigrations, settings, streaks, wallet as walletDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import { SECURE_KEYS, secureGet, secureRemove, secureSet } from '@/lib/secureStore';
import type { UnlockToastData } from '@/components/UnlockToast';
import type { LifeState, SimulationEvent } from '@/sim/types';
import { orchestrateLifeSimulation } from '@/sim/orchestrate';
import { hasReturnCelebration } from '@/sim';

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
  /** Estado de vida simulada (LifeSimulator). */
  lifeState: LifeState | null;
  /** Eventos do último tick — consumidos por behavior/rendering. */
  lifeEvents: SimulationEvent[];
  /** Micro-copy da simulação para status bubble. */
  lifeSummaryLine: string | null;
  /** Micro-copy proativa (triggers contextuais) para status bubble. */
  proactiveBubbleLine: string | null;
  /** Flag visual: retorno após ausência longa. */
  lifeReturnCelebration: boolean;
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
  /** Aplica drift de hábito no DNA. SEMPRE não-negativo (sem culpa). */
  driftDnaFromHabit: (habit: HabitKind, intensity?: number) => Promise<void>;
  /** Sobrescreve DNA arbitrariamente (debug/preset). Sanitiza na borda. */
  setDna: (dna: MascotDNA) => Promise<void>;
  /** Limpa estado em memória após reset/exclusão de conta. */
  reset: () => void;
  /** Roda tick de simulação offline/online e atualiza mascot + life state. */
  runLifeSimulation: () => Promise<void>;
  clearLifeEvents: () => void;
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
  lifeState: null,
  lifeEvents: [],
  lifeSummaryLine: null,
  proactiveBubbleLine: null,
  lifeReturnCelebration: false,

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
      // Sem .catch, keychain corrompido (raro mas documentado em migrations
      // de iOS) rejeitava Promise.all inteiro, hydrate abortava antes do
      // `set({hydrated:true})` -> splash infinito.
      secureGet(SECURE_KEYS.openAiKey).catch(() => null),
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
    const [mascot, streak, set_, w, settingsPersisted] = await Promise.all([
      mascots.forUser(profile.id).catch(() => null),
      streaks.get(profile.id).catch(() => null),
      settings.get(profile.id).catch(() => null),
      walletDb.get(profile.id).catch(() => null),
      settings.hasPersisted(profile.id).catch(() => false),
    ]);
    let resolvedSettings = set_;
    // Primeira sessão: honra "reduzir movimento" do SO antes de qualquer toggle manual.
    if (!settingsPersisted && resolvedSettings) {
      try {
        const osReduce = await readSystemReduceMotion();
        if (osReduce) {
          resolvedSettings = await settings.update(profile.id, { reduce_motion: true });
        }
      } catch {
        // intencional: defaults seguem válidos
      }
    }
    /* v8 ignore stop */
    let resolvedMascot = mascot;
    let lifeState: LifeState | null = null;
    let lifeEvents: SimulationEvent[] = [];
    let lifeSummaryLine: string | null = null;
    let lifeReturnCelebration = false;
    if (mascot) {
      try {
        const sim = await orchestrateLifeSimulation(mascot);
        resolvedMascot = sim.mascot;
        lifeState = sim.lifeState;
        lifeEvents = sim.events;
        lifeSummaryLine = sim.summaryLine ?? null;
        lifeReturnCelebration = hasReturnCelebration(sim.events);
      } catch (err) {
        logger.warn('[store] life simulation failed on hydrate', {
          reason: err instanceof Error ? err.message : 'unknown',
        });
      }
    }
    set({
      profile,
      mascot: resolvedMascot,
      streak,
      settings: resolvedSettings,
      wallet: w,
      openAiKey,
      hydrated: true,
      lifeState,
      lifeEvents,
      lifeSummaryLine,
      lifeReturnCelebration,
    });
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
    // Forma funcional evita race quando múltiplos toasts são enfileirados
    // no mesmo tick (ex: processUnlocks disparando vários).
    set(state =>
      state.currentToast === null
        ? { currentToast: t }
        : { toastQueue: [...state.toastQueue, t] },
    );
  },

  shiftToast() {
    set(state => {
      if (state.toastQueue.length > 0) {
        const [next, ...rest] = state.toastQueue;
        return { currentToast: next, toastQueue: rest };
      }
      return { currentToast: null };
    });
  },

  async driftDnaFromHabit(habit, intensity) {
    const state = get();
    const m = state.mascot;
    if (!m || !m.dna) return;
    const nextDna = applyHabitDrift(m.dna, { habit, intensity });
    const persisted = await mascots.updateDna(m.user_id, nextDna);
    if (persisted) set({ mascot: persisted });
    else logger.warn('[store] driftDnaFromHabit: mascot não encontrado');
  },

  async setDna(dna) {
    const state = get();
    const m = state.mascot;
    if (!m) return;
    const safe = sanitizeGenome(dna);
    const persisted = await mascots.updateDna(m.user_id, safe);
    if (persisted) set({ mascot: persisted });
  },

  reset() {
    set({
      hydrated: false,
      profile: null,
      mascot: null,
      streak: null,
      settings: null,
      wallet: null,
      openAiKey: null,
      toastQueue: [],
      currentToast: null,
      lifeState: null,
      lifeEvents: [],
      lifeSummaryLine: null,
      proactiveBubbleLine: null,
      lifeReturnCelebration: false,
    });
  },

  async runLifeSimulation() {
    const m = get().mascot;
    if (!m) return;
    try {
      const sim = await orchestrateLifeSimulation(m);
      set({
        mascot: sim.mascot,
        lifeState: sim.lifeState,
        lifeEvents: sim.events,
        lifeSummaryLine: sim.summaryLine ?? null,
        lifeReturnCelebration: hasReturnCelebration(sim.events),
      });
    } catch (err) {
      logger.warn('[store] runLifeSimulation failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
    }
  },

  clearLifeEvents() {
    set({ lifeEvents: [], lifeReturnCelebration: false });
  },
}));
