/**
 * Fonte única para numeração do onboarding.
 *
 * Antes desse arquivo, telas mostravam "Passo 1 de 4", "Passo 2 de 3",
 * "Passo 3 de 3" sem coordenação — usuário perdia o sentido de progresso.
 *
 * Modelo: a ordem aqui reflete o caminho LINEAR (sem ramificações). Telas
 * de bifurcação (personality OU quiz) compartilham a mesma posição.
 */

export const ONBOARDING_STEPS = [
  'age',
  'goal',
  'mood',
  'mascot',
  'personality', // mesma posição que quiz
  'name',
  'push',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_TOTAL = ONBOARDING_STEPS.length;

/**
 * Retorna a posição 1-based de uma tela, ou null se não está no fluxo
 * principal (welcome, signup, notice, meet, quiz).
 */
export function stepIndex(name: OnboardingStep | 'quiz'): number {
  if (name === 'quiz') return stepIndex('personality');
  const i = ONBOARDING_STEPS.indexOf(name);
  return i === -1 ? 0 : i + 1;
}

/** "Passo X de Y" formatado pro kicker. */
export function stepLabel(name: OnboardingStep | 'quiz'): string {
  const i = stepIndex(name);
  return `Passo ${i} de ${ONBOARDING_TOTAL}`;
}
