/**
 * 4 personalidades canônicas + Mascote-positioning checks.
 *
 * Garantias:
 * - 4 personalidades exatas: calmo/motivador/fofo/sabio.
 * - Cada uma tem nome de mascote, voz, cor e best-fit habits.
 * - Cumprimento (greeting) é em PT-BR.
 * - NENHUMA personality menciona termos clínicos (terapia, depressão, etc.) — branding wellness.
 */

import { describe, expect, it } from 'vitest';
import { getPersonality, personalities } from '@/content/personalities';
import type { Personality } from '@/types';

describe('personalities catalog', () => {
  it('contém exatamente 4 personalidades', () => {
    expect(personalities.length).toBe(4);
  });

  it('ids são calmo/motivador/fofo/sabio', () => {
    const ids: Personality[] = personalities.map(p => p.id);
    expect(ids.sort()).toEqual(['calmo', 'fofo', 'motivador', 'sabio']);
  });

  it('cada uma tem mascotName, label, tagline, greeting, voice', () => {
    for (const p of personalities) {
      expect(p.mascotName).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.tagline).toBeTruthy();
      expect(p.greeting).toBeTruthy();
      expect(p.voice).toBeTruthy();
      expect(p.bestFor.length).toBeGreaterThan(0);
    }
  });

  it('mascot names canônicos', () => {
    const names = new Map(personalities.map(p => [p.id, p.mascotName]));
    expect(names.get('calmo')).toBe('Bipo');
    expect(names.get('motivador')).toBe('Zip');
    expect(names.get('fofo')).toBe('Lulu');
    expect(names.get('sabio')).toBe('Aro');
  });

  it('greetings são em PT-BR (heurística: chars acentuados ou palavras PT)', () => {
    for (const p of personalities) {
      // pelo menos uma palavra portuguesa comum
      expect(p.greeting).toMatch(/você|hoje|vamos|bora|que|um|seu/i);
    }
  });

  it('NENHUMA personality menciona termos clínicos (wellness-only branding)', () => {
    const clinical = /\b(terapia|depressão|ansiedade clínica|transtorno|TDAH|diagnóstico|trauma|psicólogo|psiquiatra|medicamento|prescrição)\b/i;
    for (const p of personalities) {
      const all = `${p.description} ${p.greeting} ${p.tagline} ${p.voice}`;
      expect(all).not.toMatch(clinical);
    }
  });

  it('cores são hex válidos', () => {
    for (const p of personalities) {
      expect(p.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(p.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('getPersonality', () => {
  it('retorna personality existente', () => {
    expect(getPersonality('calmo').id).toBe('calmo');
    expect(getPersonality('motivador').id).toBe('motivador');
    expect(getPersonality('fofo').id).toBe('fofo');
    expect(getPersonality('sabio').id).toBe('sabio');
  });

  it('fallback para a primeira (calmo) em id desconhecido', () => {
    expect(getPersonality('inexistente' as Personality).id).toBe('calmo');
  });
});

describe('personality bestFor — coberturas distintas (alinhado ao site)', () => {
  it('calmo (Bipo): sono · respiração · pausa', () => {
    const calmo = getPersonality('calmo');
    const tags = calmo.bestFor.join(' ').toLowerCase();
    expect(tags).toMatch(/sono/);
    expect(tags).toMatch(/respira/);
    expect(tags).toMatch(/pausa/);
  });
  it('motivador (Zip): exercício · foco · hidratação', () => {
    const motivador = getPersonality('motivador');
    const tags = motivador.bestFor.join(' ').toLowerCase();
    expect(tags).toMatch(/exerc/);
    expect(tags).toMatch(/foco/);
    expect(tags).toMatch(/hidrata/);
  });
  it('fofo (Lulu, A Companheira): diário · gratidão · conexão', () => {
    const fofo = getPersonality('fofo');
    const tags = fofo.bestFor.join(' ').toLowerCase();
    expect(tags).toMatch(/diári/);
    expect(tags).toMatch(/grati/);
    expect(tags).toMatch(/conex/);
  });
  it('sabio (Aro): reflexão · leitura · intenção', () => {
    const sabio = getPersonality('sabio');
    const tags = sabio.bestFor.join(' ').toLowerCase();
    expect(tags).toMatch(/reflex/);
    expect(tags).toMatch(/leitura/);
    expect(tags).toMatch(/inten/);
  });
});

describe('Lulu = Companheira (não "Fofo" no rótulo visível)', () => {
  it('label visível é "Companheira" (alinha com site)', () => {
    expect(getPersonality('fofo').label).toBe('Companheira');
  });
});
