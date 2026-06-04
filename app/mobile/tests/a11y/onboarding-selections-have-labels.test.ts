/**
 * A11y guard — telas de seleção do onboarding devem ter role + label em
 * todo Pressable. Espelha tests/a11y/atelier-pressables-have-labels.test.ts.
 *
 * Motivo: o fluxo de onboarding usa chips/opções de escolha única (radio).
 * Auditorias passadas (d19e617) corrigiram goal/quiz, mas quick/style/
 * identity ficaram sem accessibilityRole="radio" + accessibilityState. Sem
 * isso, leitores de tela não anunciam qual opção está selecionada nem que é
 * uma escolha única — usuário cego não completa o onboarding com confiança.
 *
 * Heurística por contagem (Pressables vs labels vs roles) em vez de AST:
 * barato e captura a regressão gritante (adicionou Pressable de seleção sem
 * a11y). Cada arquivo de tela renderiza cada chip via um único `<Pressable>`
 * literal no source, então a contagem estática mapeia bem.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');

// Telas do onboarding que contêm pelo menos um Pressable interativo.
const ONBOARDING_SCREENS = [
  'app/onboarding/welcome.tsx',
  'app/onboarding/age.tsx',
  'app/onboarding/goal.tsx',
  'app/onboarding/style.tsx',
  'app/onboarding/quiz.tsx',
  'app/onboarding/quick.tsx',
  'app/onboarding/identity.tsx',
  'app/onboarding/mascot.tsx',
  'app/onboarding/notice.tsx',
];

function analyze(rel: string) {
  const text = readFileSync(join(ROOT, rel), 'utf-8');
  const pressables = (text.match(/<\s*(Pressable|TouchableOpacity|PressableScale|TouchableHighlight)\b/g) ?? []).length;
  const labels = (text.match(/accessibilityLabel\s*=/g) ?? []).length;
  const roles = (text.match(/accessibilityRole\s*=/g) ?? []).length;
  return { pressables, labels, roles };
}

describe('a11y: seleções do onboarding têm role + label', () => {
  for (const screen of ONBOARDING_SCREENS) {
    it(`${screen}: roles e labels >= pressables`, () => {
      const { pressables, labels, roles } = analyze(screen);
      expect(labels, `${screen}: ${labels} labels vs ${pressables} pressables`).toBeGreaterThanOrEqual(pressables);
      expect(roles, `${screen}: ${roles} roles vs ${pressables} pressables`).toBeGreaterThanOrEqual(pressables);
    });
  }

  it('chips de escolha única expõem estado selected (radio)', () => {
    // quick/style/identity usam role="radio" + accessibilityState selected.
    for (const screen of ['app/onboarding/quick.tsx', 'app/onboarding/style.tsx', 'app/onboarding/identity.tsx']) {
      const text = readFileSync(join(ROOT, screen), 'utf-8');
      expect(text, `${screen} sem role="radio"`).toMatch(/accessibilityRole="radio"/);
      expect(text, `${screen} sem accessibilityState selected`).toMatch(/accessibilityState=\{\{\s*selected/);
    }
  });
});
