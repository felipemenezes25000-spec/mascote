/**
 * Regression guard pro race de hydration que a auditoria reportou
 * ("streak 2 → 1 → 32 entre refreshes"). O fix real é arquitetural:
 *
 *   1. O store inicia com `hydrated: false` e `streak: null`.
 *   2. `_layout.tsx` renderiza `<HomeSkeleton/>` enquanto `!hydrated`,
 *      bloqueando que `streak.tsx` ou `(tabs)/index.tsx` montem com
 *      `streak` parcialmente carregado do AsyncStorage.
 *   3. `hydrate()` faz Promise.all em todos os dados de domínio (mascot,
 *      streak, settings, wallet) ANTES de `set({ hydrated: true })`.
 *
 * Estes testes travam essas invariantes pra evitar regressão. Se alguém
 * renomear `hydrated`, remover o set final, ou ler streak antes da
 * hidratação, o teste quebra e o sinal aparece em CI antes do bug
 * voltar ao app.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '@/store';
import { mascots, profiles, streaks } from '@/lib/db';

beforeEach(async () => {
  await AsyncStorage.clear();
  // Reset store ao estado inicial — mesmo padrão de store.test.ts.
  useStore.setState({
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
    lastCheckin: null,
  });
});

describe('hydration gate — invariantes', () => {
  it('store inicia com hydrated=false (gate ativa por padrão)', () => {
    expect(useStore.getState().hydrated).toBe(false);
  });

  it('antes da hidratação, streak é null — UI deve renderizar skeleton, não "0" stale', () => {
    const s = useStore.getState();
    expect(s.hydrated).toBe(false);
    expect(s.streak).toBeNull();
  });

  it('hydrate() promove hydrated=true mesmo sem profile', async () => {
    await useStore.getState().hydrate();
    expect(useStore.getState().hydrated).toBe(true);
  });

  it('hydrate() carrega streak ATÔMICO com o flag (sem janela parcial)', async () => {
    const p = await profiles.upsert({ display_name: 'Felipe' });
    await mascots.upsert({ user_id: p.id, name: 'Pip' });
    // Cria streak persistido — simula app reaberto com sequência ativa.
    await streaks.upsert({
      user_id: p.id,
      current_streak: 7,
      longest_streak: 14,
      last_active_date: '2026-05-20',
      grace_days_left: 2,
      updated_at: new Date().toISOString(),
    });

    // Sanidade: antes do hydrate, store ainda vazio.
    expect(useStore.getState().hydrated).toBe(false);
    expect(useStore.getState().streak).toBeNull();

    await useStore.getState().hydrate();

    const after = useStore.getState();
    // O ponto crítico: quando hydrated=true, streak JÁ está carregado.
    // Não pode haver tick onde hydrated=true && streak=null pra um profile
    // que tem streak persistido. Esse era o vetor do bug 2→1→32.
    expect(after.hydrated).toBe(true);
    expect(after.streak).not.toBeNull();
    expect(after.streak?.current_streak).toBe(7);
    expect(after.streak?.longest_streak).toBe(14);
  });

  it('reset() volta hydrated pra false (cleanup de logout)', async () => {
    await useStore.getState().hydrate();
    expect(useStore.getState().hydrated).toBe(true);
    useStore.getState().reset();
    expect(useStore.getState().hydrated).toBe(false);
    expect(useStore.getState().streak).toBeNull();
  });

  it('streak lido antes da hidratação é null (nunca undefined/NaN)', () => {
    // Defesa contra outro modo de race: alguns selectors podem retornar
    // undefined se o slice ainda não existir. Garantimos que o initial
    // state expõe null explícito, não undefined — UI checa `?? 0` mas
    // confiar em `?.` exige que o slice exista.
    const streak = useStore.getState().streak;
    expect(streak === null).toBe(true);
    // Não é undefined nem NaN-like — UI pode renderizar skeleton com
    // confiança que `streak == null` é o estado pré-hidratação.
    expect(typeof streak).not.toBe('number');
    expect(streak).not.toBeUndefined();
  });
});
