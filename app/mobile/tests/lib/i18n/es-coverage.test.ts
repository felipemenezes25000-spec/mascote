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
