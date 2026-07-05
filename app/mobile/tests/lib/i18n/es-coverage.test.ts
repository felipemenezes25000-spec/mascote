/**
 * Cobertura ES + prova de runtime da troca de idioma (Fase 3 i18n).
 *
 * helper-t.test.ts cobre paridade pt<->en; este complementa:
 *   - Paridade pt <-> ES (keys + tipos de leaf) — o tsc já força via
 *     StringsBundle, mas um check de runtime pega regressões de função-vs-string.
 *   - Prova que setLocale('en'|'es') retorna a TRADUÇÃO das telas extraídas na
 *     Fase 3 — não o fallback pt. É o "runtime" que dá pra verificar sem device.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { STRINGS_ES, STRINGS_PT, setLocale, t } from '@/lib/i18n';

describe('i18n: paridade de shape PT vs ES', () => {
  it('toda key PT existe em ES (recursivo)', () => {
    const diff = collectMissingKeys(STRINGS_PT, STRINGS_ES, '');
    expect(diff, `ES está faltando: ${diff.join(', ')}`).toEqual([]);
  });

  it('toda key ES existe em PT (recursivo)', () => {
    const diff = collectMissingKeys(STRINGS_ES, STRINGS_PT, '');
    expect(diff, `PT está faltando: ${diff.join(', ')}`).toEqual([]);
  });

  it('tipos de leaf batem (string vs função)', () => {
    const mismatches = collectTypeMismatches(STRINGS_PT, STRINGS_ES, '');
    expect(mismatches, `mismatch em: ${mismatches.join(', ')}`).toEqual([]);
  });
});

describe('i18n: troca de idioma entrega tradução (não cai no fallback pt)', () => {
  beforeEach(() => setLocale('pt'));

  // Só chaves que GENUINAMENTE diferem nos 3 idiomas — assim "x == pt" é sinal
  // real de fallback/bug. (Ex.: common.continue/ok são iguais de propósito e
  // ficam de fora.)
  const SAMPLES = [
    'onboarding.welcome.cta_start',
    'signup.title',
    'onboarding.age.title',
    'onboarding.goal.title',
    'onboarding.style.title',
    'checkin.q_sleep',
    'checkin_result.saving',
    // Regressão jun/23: strings que tinham vazado hardcoded em PT nas telas
    // chat/home/settings (não passavam por t()), agora extraídas.
    'home.actions.label_play',
    'chat.date_today',
    'chat.error_reply',
    'home.screen.welcome_level_title',
    'settings.disclaimer',
    // Regressão jun/24: toasts de check-in da Home (streak/nível/microevolução/
    // unlock) que ainda vazavam PT cru em useHomeActions, agora via t().
    'home.screen.checkin_level_sub',
    'home.screen.unlock_scene_sub',
    // Regressão jun/25: chrome PT cru da Home (DailyRewardStrip / MysteryBoxCard /
    // EventChallengeCard / Tour) que nunca passou por t(), agora extraído.
    'home.screen.daily_reward_kicker',
    'home.screen.daily_reward_card_title',
    'home.screen.daily_reward_grand',
    'home.screen.mystery_label_done',
    'home.screen.mystery_toast_rare',
    'home.screen.event_chest_open',
    'home.screen.event_chest_claimed',
    'home.screen.event_a11y_claimed',
    'tour.next',
    'tour.start',
    'tour.step1_title',
    'tour.step4_body',
    // Fase i18n jun/26: telas cancel + feedback eram 100% PT cru (zero t()),
    // alcançadas por linhas de settings JÁ traduzidas (link_cancel/link_feedback).
    'cancel.pause_card_title',
    'cancel.confirm_title',
    'cancel.free_done_title',
    'feedback.title',
    'feedback.thanks_title',
    // Fase i18n jun/27: saudação do header + status fallback do mascote (helpers.ts)
    // renderizavam em PT cru em TODA abertura da Home (fluxo já traduzido).
    'home.screen.greeting_morning',
    'home.screen.greeting_evening_compact',
    'home.screen.status_active_energy',
    'home.screen.status_default',
    // Fase i18n jun/29: labels da tab bar (Conversar/Evolução/Relatório)
    // eram PT cru no (tabs)/_layout.tsx — chrome de navegação visto em TODA
    // tela do app principal, vazava pra EN/ES. tabs.chat fica de fora dos
    // samples (ES 'Conversar' == PT de propósito).
    'tabs.evolution',
    'tabs.report',
    // Fase i18n jul/02: PersonalTicker (rotaciona no header da Home p/ todo user
    // com progresso) e o chrome do EvolutionModal montavam frases PT cruas —
    // buildPersonalStats e os fallbacks do modal não passavam por t().
    'home.evolution_modal.kicker',
    'home.evolution_modal.hint',
    // Fase i18n jul/05: a11y-chrome que só o leitor de tela ouvia em PT cru —
    // botões voltar/fechar do ScreenHeader + backdrops de ModalShell/
    // EvolutionRevealModal (vistos em quase toda tela) e os sufixos a11y do
    // QuickActionCard na Home (superfície visível já traduzida via t()).
    'common.close',
    'common.close_modal_a11y',
    'home.quick.done_today_a11y',
    'home.quick.adjust_hint_a11y',
  ];

  it('EN e ES diferem do PT (e não devolvem o path literal)', () => {
    for (const key of SAMPLES) {
      setLocale('pt');
      const pt = t(key);
      setLocale('en');
      const en = t(key);
      setLocale('es');
      const es = t(key);
      expect(pt, `${key}: pt vazio`).toBeTruthy();
      expect(en, `${key}: EN igual ao PT (fallback?)`).not.toBe(pt);
      expect(es, `${key}: ES igual ao PT (fallback?)`).not.toBe(pt);
      expect(en, `${key}: EN devolveu o path (key não resolvida)`).not.toBe(key);
      expect(es, `${key}: ES devolveu o path (key não resolvida)`).not.toBe(key);
    }
  });

  it('funções de interpolação resolvem por idioma', () => {
    setLocale('es');
    expect(t('checkin_result.smiled', 'Lumo')).toBe('Lumo sonrió.');
    expect(t('mission_done.title_levelup', 'Lumo', 3)).toBe('Lumo subió al nv 3!');
    setLocale('en');
    expect(t('checkin_result.smiled', 'Lumo')).toBe('Lumo smiled.');
    expect(t('mission_done.reward_xp', 10, 5)).toBe('+10 XP · +5 🪙');
    expect(t('home.screen.checkin_streak_title', 7)).toBe('7-day streak!');
    setLocale('es');
    expect(t('home.screen.checkin_streak_title', 7)).toBe('¡Racha de 7 días!');
    // jun/25: interpolação dos novos leaks da Home (daily reward + tour + event).
    setLocale('en');
    expect(t('home.screen.daily_reward_toast_title', 7, 150, 3)).toBe('Day 7 · +150 🪙 +3 💎');
    expect(t('home.screen.daily_reward_toast_title', 1, 10, 0)).toBe('Day 1 · +10 🪙');
    expect(t('tour.step_kicker', 2, 4)).toBe('STEP 2 OF 4');
    setLocale('es');
    expect(t('home.screen.daily_reward_toast_title', 7, 150, 3)).toBe('Día 7 · +150 🪙 +3 💎');
    expect(t('tour.step_kicker', 2, 4)).toBe('PASO 2 DE 4');
    // jun/26: interpolação por idioma das telas cancel (nome do mascote + loja).
    setLocale('en');
    expect(t('cancel.main_sub', 'Lumo')).toBe("Lumo will miss you. But it's your call. No guilt-tripping.");
    expect(t('cancel.confirm_body', 'App Store')).toContain('App Store');
    setLocale('es');
    expect(t('cancel.main_sub', 'Lumo')).toBe('Lumo te va a extrañar. Pero tú decides. Sin manipulación.');
  });

  it('first_evo_sub interpola o nome do mascote por idioma', () => {
    setLocale('pt');
    expect(t('home.screen.first_evo_sub', 'Lumo')).toContain('Lumo');
    setLocale('en');
    const en = t('home.screen.first_evo_sub', 'Lumo');
    expect(en).toContain('Lumo');
    expect(en).toContain('brighter');
    setLocale('es');
    expect(t('home.screen.first_evo_sub', 'Lumo')).toContain('Lumo');
  });

  it('jul/02: PersonalTicker e EvolutionModal interpolam por idioma (não fallback PT)', () => {
    // Ticker — pluralização singular/plural por idioma.
    setLocale('en');
    expect(t('home.ticker.streak', 1)).toBe('current streak: 1 day');
    expect(t('home.ticker.streak', 5)).toBe('current streak: 5 days');
    expect(t('home.ticker.checkins', 1)).toBe('1 check-in logged');
    expect(t('home.ticker.checkins', 3)).toBe('3 check-ins logged');
    expect(t('home.ticker.level', 5, 'Robo')).toBe('level 5 · Robo');
    expect(t('home.ticker.level', 2, '')).toBe('level 2');
    setLocale('es');
    expect(t('home.ticker.streak', 1)).toBe('racha actual: 1 día');
    expect(t('home.ticker.streak', 5)).toBe('racha actual: 5 días');
    expect(t('home.ticker.record', 10)).toBe('tu récord personal: 10 días');
    // EvolutionModal — título de mudança de fase.
    setLocale('en');
    expect(t('home.evolution_modal.title', 'Robo', 'baby')).toBe('Robo evolved into baby');
    setLocale('es');
    expect(t('home.evolution_modal.title', 'Robo', 'bebé')).toBe('Robo evolucionó a bebé');
  });
});

// helpers (espelham helper-t.test.ts — não são exportados de lá)
function collectMissingKeys(source: unknown, target: unknown, prefix: string): string[] {
  if (!isObj(source)) return [];
  const missing: string[] = [];
  for (const [key, val] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!isObj(target) || !(key in target)) {
      missing.push(path);
      continue;
    }
    if (isObj(val)) {
      missing.push(...collectMissingKeys(val, (target as Record<string, unknown>)[key], path));
    }
  }
  return missing;
}

function collectTypeMismatches(a: unknown, b: unknown, prefix: string): string[] {
  if (!isObj(a) || !isObj(b)) return [];
  const out: string[] = [];
  for (const [key, val] of Object.entries(a)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const bVal = (b as Record<string, unknown>)[key];
    if (typeof val !== typeof bVal) {
      out.push(`${path} (${typeof val} vs ${typeof bVal})`);
      continue;
    }
    if (isObj(val)) {
      out.push(...collectTypeMismatches(val, bVal, path));
    }
  }
  return out;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
