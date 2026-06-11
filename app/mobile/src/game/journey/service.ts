import { analytics } from '@/analytics';
import { journeyClaims, wallet, withLock } from '@/lib/db';
import { subscriptionService } from '@/services/subscription';
import type { Profile } from '@/types';
import {
  isPhaseClaimableForTier,
  JOURNEY_PHASES,
  journeyPhaseFromXp,
} from './index';
import type { JourneyClaimOutcome, JourneyPhase } from './types';

/**
 * Resgata recompensas de todas as fases alcançadas e ainda não pagas.
 *
 * Garantias (mesmo contrato do pipeline de check-in):
 *  - Idempotente: lock por usuário + ponteiro monotônico → chamar 2x em
 *    paralelo paga 1x (o segundo claim vê o ponteiro avançado).
 *  - Sem regressão: o ponteiro nunca volta; XP é a única fonte da fase.
 *  - Premium ético: fases dos mundos 9-10 no tier free ficam PENDENTES
 *    (retornadas em lockedPremium pra UI tesourar) — assinar depois
 *    resgata tudo retroativamente. O ponteiro NÃO avança sobre fases
 *    bloqueadas, senão o resgate retroativo se perderia.
 *
 * Chamar no bootstrap da Home (e ao voltar do paywall). NÃO chamar de
 * dentro do pipeline de check-in — manter os locks independentes
 * (checkin:uid vs journey:uid) evita deadlock e mantém o pipeline
 * auditado intocado.
 */
export async function claimJourneyRewards(
  profile: Profile,
  mascotXp: number,
): Promise<JourneyClaimOutcome> {
  return withLock(`journey:${profile.id}`, async () => {
    const row = await journeyClaims.get(profile.id);
    const reached = journeyPhaseFromXp(mascotXp);
    const empty: JourneyClaimOutcome = {
      claimed: [],
      lockedPremium: [],
      coinsGained: 0,
      gemsGained: 0,
      newTitles: [],
      newMinigames: [],
    };
    if (reached.n <= row.claimed_phase) return empty;

    const tier = await subscriptionService.getCurrentTier(profile.id);
    const claimed: JourneyPhase[] = [];
    const lockedPremium: JourneyPhase[] = [];
    // Varre da próxima fase não-paga até a alcançada. Para no PRIMEIRO
    // bloqueio premium: o ponteiro só avança sobre fases pagas, então
    // fases premium pendentes são re-tentadas no próximo claim (retroativo).
    let pointer = row.claimed_phase;
    for (let n = row.claimed_phase + 1; n <= reached.n; n++) {
      const phase = JOURNEY_PHASES[n - 1];
      if (!isPhaseClaimableForTier(phase, tier)) {
        lockedPremium.push(phase);
        break;
      }
      claimed.push(phase);
      pointer = n;
    }
    if (claimed.length === 0) return { ...empty, lockedPremium };

    const coinsGained = claimed.reduce((s, p) => s + p.reward.coins, 0);
    const gemsGained = claimed.reduce((s, p) => s + p.reward.gems, 0);
    const newTitles = claimed
      .filter(p => p.reward.kind === 'title' && p.reward.title)
      .map(p => p.reward.title as string);
    const newMinigames = claimed
      .filter(p => p.reward.kind === 'minigame' && p.reward.minigameId)
      .map(p => p.reward.minigameId as string);

    // Ordem: avança ponteiro ANTES de pagar. Se o pagamento falhar no meio,
    // o usuário perde moedas de UMA chamada (recuperável), mas nunca recebe
    // em dobro — para economia, double-pay é o pior caso (inflação).
    await journeyClaims.advance(profile.id, pointer);
    if (coinsGained > 0 || gemsGained > 0) {
      await wallet.add(profile.id, coinsGained, gemsGained);
    }

    for (const p of claimed) {
      analytics.track('journey_phase_reached', { phase: p.n, world: p.worldId });
    }
    analytics.track('journey_reward_claimed', {
      phases: claimed.length,
      coins: coinsGained,
      gems: gemsGained,
      premium_locked: lockedPremium.length,
    });

    return { claimed, lockedPremium, coinsGained, gemsGained, newTitles, newMinigames };
  });
}
