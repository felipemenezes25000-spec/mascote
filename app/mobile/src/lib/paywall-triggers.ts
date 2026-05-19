/**
 * Lógica de quando mostrar paywall contextual (ético).
 *
 * Gatilhos: momento de alto valor onde o user JÁ está engajado,
 * NÃO em momento de fragilidade. Apple/Google recomendam — converte mais
 * e respeita o usuário.
 *
 * Persistência: cada gatilho marca `paywall_shown:{trigger}` no AsyncStorage
 * pra não repetir.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Mascot, Streak } from '@/types';

export type PaywallTrigger =
  | 'first_evolution'    // depois da primeira fase nova
  | 'streak_7'           // 1 semana inteira
  | 'level_5'            // marco emocional
  | 'checkin_30'         // 30 check-ins totais
  | 'first_box_opened';  // engajamento orgânico

interface Context {
  mascot: Mascot;
  streak: Streak;
  totalCheckins: number;
  boxOpenedCount: number;
  hasSubscription: boolean;
}

export async function shouldTrigger(ctx: Context): Promise<PaywallTrigger | null> {
  if (ctx.hasSubscription) return null;

  // Ordem importa: mostra o "mais merecido" primeiro
  const triggers: Array<{ id: PaywallTrigger; test: () => boolean }> = [
    { id: 'first_evolution', test: () => ctx.mascot.phase !== 'ovo' && ctx.mascot.phase !== 'bebe' },
    { id: 'streak_7', test: () => ctx.streak.current_streak >= 7 },
    { id: 'level_5', test: () => ctx.mascot.level >= 5 },
    { id: 'checkin_30', test: () => ctx.totalCheckins >= 30 },
    { id: 'first_box_opened', test: () => ctx.boxOpenedCount >= 3 },
  ];

  // Batch read das marcações shown (evita 5 awaits sequenciais).
  const keys = triggers.map(t => `paywall_shown:${t.id}`);
  const entries = await AsyncStorage.multiGet(keys);
  const seenById = new Map(entries.map(([k, v]) => [k, v]));

  for (const t of triggers) {
    const seen = seenById.get(`paywall_shown:${t.id}`);
    if (!seen && t.test()) return t.id;
  }
  return null;
}

export async function markShown(trigger: PaywallTrigger): Promise<void> {
  await AsyncStorage.setItem(`paywall_shown:${trigger}`, new Date().toISOString());
}

export function copyFor(trigger: PaywallTrigger, mascotName: string): { title: string; body: string } {
  switch (trigger) {
    case 'first_evolution':
      return {
        title: `${mascotName} cresceu pela primeira vez 🌱`,
        body: 'Plus desbloqueia chat ilimitado, todos os cenários, forma rara e relatórios completos.',
      };
    case 'streak_7':
      return {
        title: '7 dias inteiros se cuidando ✨',
        body: 'Você merece o Plus. Streak Freeze ilimitado, chat sem limite, lembrete inteligente.',
      };
    case 'level_5':
      return {
        title: `${mascotName} chegou no nível 5 ⭐`,
        body: 'Próximo marco: forma rara aos 30 dias. Plus desbloqueia o caminho completo.',
      };
    case 'checkin_30':
      return {
        title: '30 vezes que você se cuidou 🌿',
        body: 'Continuando assim em 90 dias você terá relatórios profundos. Plus desbloqueia agora.',
      };
    case 'first_box_opened':
      return {
        title: 'Curte as recompensas? 🎁',
        body: 'Plus dobra a frequência delas + caixas raras semanais.',
      };
  }
}
