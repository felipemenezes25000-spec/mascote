/**
 * A11y smoke check — telas premium devem ter pelo menos uma
 * accessibilityLabel + accessibilityRole por Pressable presente.
 *
 * Cobre as 4 telas premium auditadas em 2026-05-27:
 *   - app/paywall.tsx
 *   - app/onboarding/mascot.tsx
 *   - app/(tabs)/index.tsx (home)
 *   - app/mascot-room.tsx
 *
 * Mesma técnica do teste do Ateliê (count-based, sem AST parsing).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');

const PREMIUM_SCREENS = [
  'app/paywall.tsx',
  'app/onboarding/mascot.tsx',
  'app/(tabs)/index.tsx',
  'app/mascot-room.tsx',
];

interface FileReport {
  file: string;
  pressables: number;
  labels: number;
  roles: number;
}

function analyze(file: string): FileReport {
  const text = readFileSync(file, 'utf-8');
  const pressables = (text.match(/<\s*(Pressable|TouchableOpacity|PressableScale|TouchableHighlight)\b/g) ?? []).length;
  const labels = (text.match(/accessibilityLabel\s*=/g) ?? []).length;
  const roles = (text.match(/accessibilityRole\s*=/g) ?? []).length;
  return { file: file.replace(ROOT + '/', ''), pressables, labels, roles };
}

describe('a11y: cobertura de labels em telas premium', () => {
  for (const screen of PREMIUM_SCREENS) {
    it(`tela ${screen}: cada pressable tem label + role`, () => {
      const report = analyze(join(ROOT, screen));
      expect(report.labels, `${screen}: ${report.labels} labels vs ${report.pressables} pressables`)
        .toBeGreaterThanOrEqual(report.pressables);
      expect(report.roles, `${screen}: ${report.roles} roles vs ${report.pressables} pressables`)
        .toBeGreaterThanOrEqual(report.pressables);
    });
  }
});
