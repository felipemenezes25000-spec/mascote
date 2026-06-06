/**
 * A11y guard — controles interativos de alta-frequência expõem role (+ estado
 * de seleção quando aplicável). Espelha tests/a11y/onboarding-selections-have-labels.ts.
 *
 * Motivo: `Pressable`/`PressableScale` do React Native NÃO aplicam
 * accessibilityRole por padrão — um leitor de tela anuncia o label como texto
 * comum, sem o affordance "botão", e o usuário não percebe que é tocável.
 * Auditoria 2026-06-06 (ajuste2) achou 3 controles sem role:
 *   - HabitValueModal: presets rápidos eram um radio-group sem role/state/label
 *   - QuickActionCard: grid de hábitos da home, tinha label/hint/state mas sem role
 *   - DailyRewardStrip: botão "RESGATAR" tinha label mas sem role
 *
 * Heurística por regex sobre o source (barata, captura a regressão gritante).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');

function read(rel: string) {
  return readFileSync(join(ROOT, rel), 'utf-8');
}

describe('a11y: controles interativos têm accessibilityRole', () => {
  it('HabitValueModal: presets rápidos são radio com estado selected', () => {
    const text = read('src/components/HabitValueModal.tsx');
    expect(text, 'sem role="radio" nos presets').toMatch(/accessibilityRole="radio"/);
    expect(text, 'sem accessibilityState selected nos presets').toMatch(
      /accessibilityState=\{\{\s*selected:\s*value === v/,
    );
  });

  it('QuickActionCard: card de hábito é button', () => {
    const text = read('src/components/ui/QuickActionCard.tsx');
    expect(text, 'sem accessibilityRole="button"').toMatch(/accessibilityRole="button"/);
  });

  it('DailyRewardStrip: botão resgatar é button e reflete disabled', () => {
    const text = read('src/components/DailyRewardStrip.tsx');
    expect(text, 'sem accessibilityRole="button"').toMatch(/accessibilityRole="button"/);
    expect(text, 'sem accessibilityState disabled').toMatch(
      /accessibilityState=\{\{\s*disabled:\s*claimedToday/,
    );
  });
});
