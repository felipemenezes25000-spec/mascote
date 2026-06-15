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

  // Auditoria 2026-06-10 (ajuste2): varredura estática completa de
  // Pressable/PressableScale/TouchableOpacity em app/ + src/components achou um
  // cluster de controles VISÍVEIS sem role — o maior na tela de chat (header,
  // toggles de sugestão, chips, enviar), além de safety/safe-night (botões de
  // crise!), subscription, monthly-report, privacy, mascot, mascot-editor,
  // settings/personalization (paleta = radio), HabitValueModal (stepper ±),
  // Tour e EvolutionRevealModal (backdrop rotulado).
  it('chat: header, toggles de sugestão, chips e enviar são button', () => {
    const text = read('app/(tabs)/chat.tsx');
    // 6 controles que antes só tinham label/hitSlop. Conta ocorrências de role
    // pra não regredir nenhum deles silenciosamente.
    const roles = text.match(/accessibilityRole="button"/g) ?? [];
    expect(roles.length, 'chat perdeu accessibilityRole em controles').toBeGreaterThanOrEqual(8);
    expect(text, 'enviar sem role').toMatch(
      /accessibilityRole="button"\s+accessibilityLabel="Enviar mensagem"/,
    );
  });

  it('safety/safe-night: botões de crise e ação primária são button', () => {
    const safety = read('app/safety.tsx');
    expect(safety, 'CrisisLine sem role').toMatch(
      /onPress=\{onPress\}\s+accessibilityRole="button"/,
    );
    const night = read('app/safe-night.tsx');
    expect(night, 'PrimaryAction sem role').toMatch(
      /onPress=\{onPress\}\s+accessibilityRole="button"/,
    );
  });

  it('settings/personalization: swatch de paleta é radio com estado selected', () => {
    const text = read('app/settings/personalization.tsx');
    expect(text, 'paleta sem role="radio"').toMatch(/accessibilityRole="radio"/);
    expect(text, 'paleta sem estado selected').toMatch(
      /accessibilityState=\{\{\s*selected:\s*settings\.brand_palette === p\.id/,
    );
  });

  it('HabitValueModal: stepper ± é button', () => {
    const text = read('src/components/HabitValueModal.tsx');
    expect(text, 'diminuir sem role').toMatch(
      /accessibilityRole="button"\s+accessibilityLabel="Diminuir"/,
    );
    expect(text, 'aumentar sem role').toMatch(
      /accessibilityRole="button"\s+accessibilityLabel="Aumentar"/,
    );
  });

  // Guarda global auto-mantida: nenhum Pressable/PressableScale/TouchableOpacity
  // com onPress pode ficar sem accessibilityRole, EXCETO os casos intencionais
  // abaixo (backdrops sem conteúdo, no-op de stop-propagation, imagebutton).
  //
  // Auditoria 2026-06-15 (ajuste2): a varredura só cobria `app/` + `src/components/`,
  // mas `src/features/` também tem controles interativos vivos (HomeHero,
  // HomeBanner, HomeActionRow, HomeQuickActions, JourneyCard). Estavam todos com
  // role correto, mas nada impedia uma regressão futura ali. Escopo estendido pra
  // incluir `src/features/` — agora a guarda é de fato global.
  it('varredura global: só sobram exceções intencionais sem role', () => {
    const cp = require('node:child_process') as typeof import('node:child_process');
    const files = cp
      .execSync('git ls-files "app/" "src/components/" "src/features/"', { cwd: ROOT, encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter((f: string) => f.endsWith('.tsx'));
    const open = /<(PressableScale|Pressable|TouchableOpacity)\b/g;
    const offenders: string[] = [];
    // Exceções verificadas em 2026-06-10 (file:line):
    //  - HabitValueModal:81/82 → backdrop de dismiss sem conteúdo + sheet no-op
    //    de stop-propagation (role estaria errado).
    //  - EvolutionModal:120 → backdrop decorativo de dismiss sem label.
    //  - MascotInteractive:122 → já tem role="imagebutton" (regex de tag não
    //    enxerga além do `<button>` num comentário interno; é falso-positivo).
    const allow = new Set([
      'src/components/HabitValueModal.tsx',
      'src/components/EvolutionModal.tsx',
      'src/components/MascotInteractive.tsx',
    ]);
    for (const f of files) {
      const src = read(f);
      let m: RegExpExecArray | null;
      open.lastIndex = 0;
      while ((m = open.exec(src))) {
        let i = open.lastIndex;
        let depth = 0;
        let end = -1;
        for (; i < src.length; i++) {
          const c = src[i];
          if (c === '{') depth++;
          else if (c === '}') depth--;
          else if (c === '>' && depth === 0) {
            end = i;
            break;
          }
        }
        if (end < 0) continue;
        const tag = src.slice(m.index, end + 1);
        if (/onPress\s*=/.test(tag) && !/accessibilityRole\s*=/.test(tag) && !allow.has(f)) {
          const line = src.slice(0, m.index).split('\n').length;
          offenders.push(`${f}:${line}`);
        }
      }
    }
    expect(offenders, `controles sem role: ${offenders.join(', ')}`).toEqual([]);
  });
});
