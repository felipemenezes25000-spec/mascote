/**
 * Rascunho em memória do onboarding — evita perder display_name/age_band
 * quando a cadeia de params do expo-router fica longa (mascot → name).
 */

export type OnboardingDraft = {
  display_name?: string;
  age_band?: string;
};

let draft: OnboardingDraft = {};

export function setOnboardingDraft(patch: OnboardingDraft): void {
  draft = { ...draft, ...patch };
}

export function getOnboardingDraft(): OnboardingDraft {
  return draft;
}

export function clearOnboardingDraft(): void {
  draft = {};
}
