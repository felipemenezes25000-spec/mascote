/**
 * Camada de evolução visível da criatura. DECISÃO pura (estágio, revelação
 * progressiva, ponte de mutações) — testável; o MECANISMO (SVG/reanimated) vive
 * no CreatureRenderer e é verificado visualmente. Fase 1 (spec 2026-06-18).
 */
import { describe, expect, it } from 'vitest';
import { creatureEvolution } from '@/components/mascot/creatureEvolution';

describe('creatureEvolution — estágio por fase', () => {
  it('ovo → estágio 0, evoluido → estágio 5', () => {
    expect(creatureEvolution({ phase: 'ovo' }).stage).toBe(0);
    expect(creatureEvolution({ phase: 'evoluido' }).stage).toBe(5);
  });

  it('fase ausente → forma PLENA (contexto preview/bestiário, não larval)', () => {
    // Sem fase = preview: revela tudo (não regride cosmos/onboarding pra ovo).
    const e = creatureEvolution({});
    expect(e.stage).toBe(5);
    expect(e.revealTail).toBe(true);
    expect(e.revealWings).toBe(true);
    expect(e.revealCrown).toBe(true);
    expect(e.revealPattern).toBe(true);
    // ...mas SEM aura de evolução (preview não brilha por fase).
    expect(e.glow).toBe(0);
    expect(e.pulse).toBe(false);
    expect(e.sparkleCount).toBe(0);
    expect(creatureEvolution({ phase: null }).stage).toBe(5);
  });
});

describe('creatureEvolution — revelação progressiva (genoma é destino, evolução revela)', () => {
  it('ovo esconde cauda/padrão/asas/coroa', () => {
    const e = creatureEvolution({ phase: 'ovo' });
    expect(e.revealTail).toBe(false);
    expect(e.revealPattern).toBe(false);
    expect(e.revealWings).toBe(false);
    expect(e.revealCrown).toBe(false);
  });

  it('evoluido revela tudo', () => {
    const e = creatureEvolution({ phase: 'evoluido' });
    expect(e.revealTail).toBe(true);
    expect(e.revealPattern).toBe(true);
    expect(e.revealWings).toBe(true);
    expect(e.revealCrown).toBe(true);
  });

  it('coroa só aparece de adulto pra cima; asas de adolescente', () => {
    expect(creatureEvolution({ phase: 'crianca' }).revealCrown).toBe(false);
    expect(creatureEvolution({ phase: 'adulto' }).revealCrown).toBe(true);
    expect(creatureEvolution({ phase: 'crianca' }).revealWings).toBe(false);
    expect(creatureEvolution({ phase: 'adolescente' }).revealWings).toBe(true);
  });

  it('glow cresce com o estágio (ovo < evoluido)', () => {
    expect(creatureEvolution({ phase: 'ovo' }).glow)
      .toBeLessThan(creatureEvolution({ phase: 'evoluido' }).glow);
  });

  it('glow sempre em [0,1]', () => {
    for (const phase of ['ovo', 'bebe', 'crianca', 'adolescente', 'adulto', 'evoluido'] as const) {
      const g = creatureEvolution({ phase }).glow;
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
    }
  });
});

describe('creatureEvolution — crescimento e diferenciação precoce por estágio', () => {
  it('sizeScale cresce com o estágio (ovo < adulto < evoluido)', () => {
    expect(creatureEvolution({ phase: 'ovo' }).sizeScale)
      .toBeLessThan(creatureEvolution({ phase: 'adulto' }).sizeScale);
    expect(creatureEvolution({ phase: 'adulto' }).sizeScale)
      .toBeLessThan(creatureEvolution({ phase: 'evoluido' }).sizeScale);
  });

  it('sem fase (preview) → sizeScale neutro (1) pra não inflar bestiário', () => {
    expect(creatureEvolution({}).sizeScale).toBe(1);
  });

  it('bochechas escondidas no ovo, reveladas a partir de bebe (diferencia cedo)', () => {
    expect(creatureEvolution({ phase: 'ovo' }).revealCheeks).toBe(false);
    expect(creatureEvolution({ phase: 'bebe' }).revealCheeks).toBe(true);
  });

  it('preview revela bochechas (forma plena)', () => {
    expect(creatureEvolution({}).revealCheeks).toBe(true);
  });
});

describe('creatureEvolution — ponte de mutações (torna o sistema existente visível)', () => {
  it('mutação de glow (wisdom_glow) aumenta o glow vs sem mutação', () => {
    const base = creatureEvolution({ phase: 'bebe' }).glow;
    const withGlow = creatureEvolution({ phase: 'bebe', mutationIds: ['mut.wisdom_glow'] }).glow;
    expect(withGlow).toBeGreaterThan(base);
  });

  it('mutação bioluminescente liga o pulso mesmo em estágio baixo', () => {
    expect(creatureEvolution({ phase: 'bebe' }).pulse).toBe(false);
    expect(creatureEvolution({ phase: 'bebe', mutationIds: ['mut.bioluminescent_form'] }).pulse).toBe(true);
  });

  it('mutação de olhos profundos aumenta eyeScale (>1)', () => {
    expect(creatureEvolution({ phase: 'bebe' }).eyeScale).toBe(1);
    expect(creatureEvolution({ phase: 'bebe', mutationIds: ['mut.deep_eyes'] }).eyeScale).toBeGreaterThan(1);
  });

  it('mutação de padrão emergente (fractal) define patternOverride e revela padrão cedo (marco)', () => {
    const e = creatureEvolution({ phase: 'ovo', mutationIds: ['mut.emergent_patterns'] });
    expect(e.patternOverride).toBeTruthy();
    expect(e.revealPattern).toBe(true); // mutação é marco: aparece mesmo em ovo
  });

  it('sem mutações: patternOverride null e eyeScale neutro', () => {
    const e = creatureEvolution({ phase: 'adulto' });
    expect(e.patternOverride).toBeNull();
    expect(e.eyeScale).toBe(1);
  });

  it('IDs desconhecidos são ignorados (defensivo)', () => {
    const e = creatureEvolution({ phase: 'adulto', mutationIds: ['mut.does_not_exist'] });
    expect(e.eyeScale).toBe(1);
    expect(e.patternOverride).toBeNull();
  });
});
