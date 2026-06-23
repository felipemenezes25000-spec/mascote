import type { JourneyProgress } from '@/game/journey/types';

/**
 * Copy emocional da Jornada — o tom do "quase lá" SEM culpa tóxica.
 *
 * Princípios (brief de produto + posicionamento wellness):
 *  - Antecipação e carinho, nunca medo ou vergonha.
 *  - O retorno depois de uma pausa é ACOLHIDO, não cobrado.
 *  - Nada de linguagem médica/terapêutica (constraint do posicionamento).
 */

/** Linhas de "quase lá" pra Home — escolhidas por proximidade da próxima fase. */
export function almostThereLine(prog: JourneyProgress): string {
  if (!prog.nextPhase) {
    return 'Forma máxima alcançada. Vocês dois escreveram essa história.';
  }
  const remaining = prog.xpNeededForNext - prog.xpIntoPhase;
  if (prog.progress >= 0.85) {
    return `Faltam só ${remaining} XP — a Fase ${prog.nextPhase.n} está a um cuidado de distância.`;
  }
  if (prog.progress >= 0.5) {
    return `Mais da metade do caminho pra Fase ${prog.nextPhase.n}. ${prog.nextPhase.reward.label} te esperando.`;
  }
  return `Cada pequeno cuidado aproxima a Fase ${prog.nextPhase.n} · ${prog.nextPhase.title}.`;
}

/** Celebração ao desbloquear fase(s) — usada no modal de resgate. */
export function phaseClaimCelebration(count: number, coins: number, gems: number): string {
  const phasePart = count === 1 ? 'uma fase nova' : `${count} fases novas`;
  const gemsPart = gems > 0 ? ` e ${gems} ${gems === 1 ? 'gema' : 'gemas'}` : '';
  return `Seu cuidado desbloqueou ${phasePart}! +${coins} moedas${gemsPart} pro cofre de vocês.`;
}

/** Entrada em mundo novo. */
export function worldEnteredLine(worldName: string, worldEmoji: string): string {
  return `${worldEmoji} Vocês chegaram ao mundo ${worldName}. Um capítulo novo começa agora.`;
}

/** Evolução de FORMA (corpo muda) — o momento mais celebrado da jornada. */
export function formEvolvedLine(mascotName: string, formName: string, trait: string): string {
  return `${mascotName} evoluiu pra forma ${formName}! ${trait}`;
}

/** Teaser premium ético (mundos 9-10 pra free) — desejo, não punição. */
export const PREMIUM_WORLD_TEASER =
  'As recompensas do Mundo Lendário estão guardadas pra você. Elas não expiram — assinando o Plus, tudo que você já conquistou é resgatado de uma vez.';

/**
 * Templates de notificação ÉTICOS da jornada.
 * Sem "seu mascote está sofrendo", sem contagem regressiva de pânico.
 */
export const JOURNEY_NOTIFICATIONS = {
  phaseClose: (xpRemaining: number, phaseTitle: string) => ({
    title: 'Seu Mascote está quase evoluindo ✨',
    body: `Faltam ${xpRemaining} XP pra fase "${phaseTitle}". Um pequeno cuidado hoje já chega lá.`,
  }),
  chestWaiting: () => ({
    title: 'Tem um baú esperando por você 🎁',
    body: 'Sua próxima fase guarda um baú especial. Sem pressa — ele não vai a lugar nenhum.',
  }),
  worldCompleted: (worldName: string) => ({
    title: `Mundo ${worldName} completo! 🏆`,
    body: 'Vocês fecharam um capítulo inteiro juntos. Vem ver o título novo.',
  }),
  returnWelcome: () => ({
    title: 'Que bom te ver de novo 💛',
    body: 'Seu Mascote guardou seu lugar. A jornada continua exatamente de onde parou.',
  }),
} as const;
