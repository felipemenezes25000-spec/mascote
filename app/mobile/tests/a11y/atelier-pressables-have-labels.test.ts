/**
 * A11y smoke check — telas do Ateliê devem ter pelo menos uma
 * accessibilityLabel + accessibilityRole por Pressable presente.
 *
 * Implementacao via contagem (Pressables vs labels) em vez de parsing
 * AST. Falsos positivos baixos pra files mas captura regressao gritante:
 * adicionou Pressable sem label = label_count < pressable_count.
 *
 * Por que nao react-native-testing-library queries:
 *   Rodaria a tela completa (deps de store, mascot, providers) — custo
 *   alto pra catch um tipo de bug que parser captura barato.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');

const ATELIER_COMPONENTS_DIR = 'src/components/atelier';
const ATELIER_SCREEN_FILES = [
  'app/atelier.tsx',
  'app/atelier-settings.tsx',
  'app/atelier-looks-history.tsx',
];

function listTsx(dir: string): string[] {
  return readdirSync(dir)
    .filter(n => /\.tsx$/.test(n))
    .map(n => join(dir, n));
}

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

describe('a11y: cobertura de labels em pressables do Atelier', () => {
  it('componentes do atelier — labels >= pressables', () => {
    const files = listTsx(join(ROOT, ATELIER_COMPONENTS_DIR));
    const reports = files.map(analyze).filter(r => r.pressables > 0);
    const failures = reports.filter(r => r.labels < r.pressables);
    if (failures.length > 0) {
      const detail = failures.map(f =>
        `  ${f.file}: ${f.pressables} pressables, ${f.labels} labels, ${f.roles} roles`,
      ).join('\n');
      throw new Error(`labels < pressables em:\n${detail}`);
    }
    expect(failures).toHaveLength(0);
  });

  it('componentes do atelier — roles >= pressables (escopo)', () => {
    const files = listTsx(join(ROOT, ATELIER_COMPONENTS_DIR));
    const reports = files.map(analyze).filter(r => r.pressables > 0);
    const failures = reports.filter(r => r.roles < r.pressables);
    if (failures.length > 0) {
      const detail = failures.map(f =>
        `  ${f.file}: ${f.pressables} pressables, ${f.roles} roles, ${f.labels} labels`,
      ).join('\n');
      throw new Error(`roles < pressables em:\n${detail}`);
    }
    expect(failures).toHaveLength(0);
  });

  for (const screen of ATELIER_SCREEN_FILES) {
    it(`tela ${screen}: cada pressable tem label + role`, () => {
      const report = analyze(join(ROOT, screen));
      expect(report.labels, `${screen}: ${report.labels} labels vs ${report.pressables} pressables`)
        .toBeGreaterThanOrEqual(report.pressables);
      expect(report.roles, `${screen}: ${report.roles} roles vs ${report.pressables} pressables`)
        .toBeGreaterThanOrEqual(report.pressables);
    });
  }
});
