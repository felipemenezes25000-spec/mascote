/**
 * Fonte única para numeração do onboarding.
 *
 * v2 (redução 11→6 telas): main flow agora é
 *   welcome → age → goal+mood → mascot+meet → name → notice+push
 * Telas que foram fundidas mantêm posição: mood compartilha com goal,
 * meet compartilha com mascot, push compartilha com notice. Quiz e
 * personality são alt-paths que compartilham a posição de mascot.
 *
 * Antes desse arquivo, telas mostravam "Passo 1 de 4", "Passo 2 de 3",
 * "Passo 3 de 3" sem coordenação — usuário perdia o sentido de progresso.
 */

export const ONBOARDING_STEPS = [
  'age',
  'goal',
  'style',
  'quick',
  'mascot',
  'name',
  'notice',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Aliases — telas fundidas / alt-paths que compartilham posição. */
const STEP_ALIASES: Record<string, OnboardingStep> = {
  mood: 'goal',
  meet: 'mascot',
  quiz: 'mascot',
  personality: 'mascot',
  push: 'notice',
  hatch: 'mascot',
  dna: 'mascot',
};

export const ONBOARDING_TOTAL = ONBOARDING_STEPS.length;

/**
 * Retorna a posição 1-based de uma tela, ou 0 se desconhecida.
 * Telas merged/alt compartilham posição com sua canonical.
 */
export function stepIndex(name: OnboardingStep | 'quiz' | 'mood' | 'meet' | 'push' | 'personality'): number {
  const canonical = (STEP_ALIASES[name] ?? name) as OnboardingStep;
  const i = ONBOARDING_STEPS.indexOf(canonical);
  return i === -1 ? 0 : i + 1;
}

/** "Passo X de Y" formatado pro kicker. */
export function stepLabel(name: OnboardingStep | 'quiz' | 'mood' | 'meet' | 'push' | 'personality'): string {
  const i = stepIndex(name);
  return `Passo ${i} de ${ONBOARDING_TOTAL}`;
}
