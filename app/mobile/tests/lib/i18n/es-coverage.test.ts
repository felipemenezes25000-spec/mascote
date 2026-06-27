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
