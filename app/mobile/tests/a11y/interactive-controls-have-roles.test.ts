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

  // Auditoria 2026-06-07 (ajuste2): a tela de Configurações nunca tinha sido
  // auditada de a11y — ~11 linkRows de navegação, o picker de personalidade e o
  // segmento de tema eram Pressables crus sem role. Profile e Signup idem.
  it('settings: todos os linkRow de navegação são button', () => {
    const text = read('app/settings.tsx');
    // Não pode sobrar nenhum `style={styles.linkRow}>` sem role logo antes.
    expect(text, 'linkRow sem accessibilityRole="button"').not.toMatch(
      /style=\{styles\.linkRow\}>/,
    );
  });

  it('settings: picker de personalidade e segmento de tema são radio com estado', () => {
    const text = read('app/settings.tsx');
    expect(text, 'sem role="radio"').toMatch(/accessibilityRole="radio"/);
    expect(text, 'personalidade sem accessibilityState selected').toMatch(
      /accessibilityState=\{\{\s*selected:\s*mascot\.personality === p\.id/,
    );
    expect(text, 'tema sem accessibilityState selected').toMatch(
      /accessibilityState=\{\{\s*selected:\s*settings\.theme_mode === opt/,
    );
  });

  it('profile: QuickBtn e CTAs são button', () => {
    const text = read('app/profile.tsx');
    expect(text, 'QuickBtn sem role').toMatch(
      /style=\{styles\.quickBtn\} accessibilityRole="button"/,
    );
    expect(text, 'CTA relatório sem role').toMatch(
      /onPress=\{\(\) => router\.push\('\/weekly-report'\)\} accessibilityRole="button"/,
    );
  });

  it('signup: botão voltar e links legais têm role', () => {
    const text = read('app/signup.tsx');
    expect(text, 'voltar sem role').toMatch(
      /accessibilityRole="button"\s+accessibilityLabel="Voltar"/,
    );
    expect(text, 'links legais sem role="link"').toMatch(/accessibilityRole="link"/);
  });

  // Auditoria 2026-06-08 (ajuste2): telas nunca auditadas de a11y —
  // notifications, closet, breathe, cancel e help tinham Pressable/PressableScale
  // crus com onPress mas sem accessibilityRole. O ✕ de cancel era icon-only sem
  // role NEM label (leitor não anunciava nada acionável). Recursos de emergência
  // do help (CVV/SAMU) abrem tel:/url e devem ser anunciados como link.
  it('notifications: marcar-tudo e cards de aviso são button', () => {
    const text = read('app/notifications.tsx');
    expect(text, 'marcar tudo sem role').toMatch(
      /accessibilityLabel="Marcar todos os avisos como lidos"/,
    );
    expect(text, 'card de aviso sem role').toMatch(
      /onPress=\{\(\) => tap\(n\)\}[\s\S]*?accessibilityRole="button"/,
    );
  });

  it('closet: abas Acessórios/Cenários são tab com estado selected', () => {
    const text = read('app/closet.tsx');
    expect(text, 'aba sem role="tab"').toMatch(/accessibilityRole="tab"/);
    expect(text, 'aba acessórios sem estado selected').toMatch(
      /accessibilityState=\{\{\s*selected:\s*tab === 'accessories'/,
    );
    expect(text, 'aba cenários sem estado selected').toMatch(
      /accessibilityState=\{\{\s*selected:\s*tab === 'scenes'/,
    );
  });

  it('breathe: botão Parar é button com label', () => {
    const text = read('app/breathe.tsx');
    expect(text, 'Parar sem label de role').toMatch(
      /accessibilityLabel="Parar sessão de respiração"/,
    );
  });

  it('cancel: ✕ fechar e link destrutivo têm role (✕ era icon-only sem label)', () => {
    const text = read('app/cancel.tsx');
    expect(text, '✕ fechar sem label').toMatch(
      /accessibilityRole="button"\s+accessibilityLabel="Voltar"/,
    );
    expect(text, 'cancelar mesmo assim sem role').toMatch(
      /accessibilityLabel="Quero cancelar mesmo assim"/,
    );
  });

  it('help: ResourceRow interativo é link (recursos de emergência tel:/url)', () => {
    const text = read('app/help.tsx');
    expect(text, 'ResourceRow sem role="link" condicional').toMatch(
      /accessibilityRole=\{onPress \? 'link' : undefined\}/,
    );
  });

  it('UniqueMascotPaywallCard: label do CTA não fixa #fff (ilegível quando disabled sobre border)', () => {
    const text = read('src/components/ui/UniqueMascotPaywallCard.tsx');
    expect(text, 'ctaLabel ainda fixa #fff no StyleSheet').not.toMatch(
      /ctaLabel:\s*\{[^}]*color:\s*['"]#fff['"]/,
    );
    expect(text, 'cor do label não reage ao disabled').toMatch(
      /disabled\s*\?\s*theme\.colors\.textSecondary/,
    );
  });
});
