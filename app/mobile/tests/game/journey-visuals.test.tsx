/**
 * Visual da Jornada — journeyVisuals (puro) + camada WorldAdornments no Mascot2D.
 *
 * Invariantes:
 *  - Todo mundo (1-10) tem adorno definido; M1 = 'none' (nascimento limpo).
 *  - intensity é monotônica no XP e clampada em [0,1]; NaN-safe.
 *  - adornmentCount cresce 1→3 dentro do mundo.
 *  - Mascot2D SEM journey renderiza idêntico ao legado (zero regressão).
 *  - Mascot2D COM journey de mundos distintos produz renders distintos
 *    (fase 47 ≠ fase 43 visualmente — o motivo de tudo isso existir).
 */

import { describe, expect, it } from 'vitest';
import * as TestRenderer from 'react-test-renderer';
import { Mascot2D } from '@/components/Mascot2D';
import { journeyVisuals, type WorldAdornment } from '@/game/journey/visuals';
import { JOURNEY_PHASES, JOURNEY_WORLDS } from '@/game/journey';

describe('journeyVisuals — função pura', () => {
  it('todo mundo tem adorno; mundo 1 é none', () => {
    const seen = new Set<WorldAdornment>();
    for (const w of JOURNEY_WORLDS) {
      const firstPhase = JOURNEY_PHASES[w.firstPhase - 1];
      const v = journeyVisuals(firstPhase.xp);
      expect(v.worldId).toBe(w.id);
      expect(v.hue).toBe(w.hue);
      seen.add(v.adornment);
    }
    expect(journeyVisuals(0).adornment).toBe('none');
    // 10 adornos distintos (1 por mundo)
    expect(seen.size).toBe(10);
  });

  it('intensity clampada em [0,1]; monotônica DENTRO do mundo; base cresce entre mundos', () => {
    // Na virada de mundo a intensidade CAI de propósito: capítulo novo começa
    // sutil e cresce (o adorno muda de tipo — contraste, não regressão).
    for (const w of JOURNEY_WORLDS) {
      let prev = -1;
      for (let n = w.firstPhase; n <= w.lastPhase; n++) {
        const v = journeyVisuals(JOURNEY_PHASES[n - 1].xp);
        expect(v.intensity).toBeGreaterThanOrEqual(0);
        expect(v.intensity).toBeLessThanOrEqual(1);
        expect(v.intensity).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = v.intensity;
      }
    }
    // A base de cada mundo é maior que a do anterior (mundos tardios = mais presença).
    const starts = JOURNEY_WORLDS.map(w => journeyVisuals(JOURNEY_PHASES[w.firstPhase - 1].xp).intensity);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i]).toBeGreaterThan(starts[i - 1]);
    }
  });

  it('fase 47 tem visual mais carregado que fase 43 (mesmo mundo)', () => {
    const v43 = journeyVisuals(JOURNEY_PHASES[42].xp);
    const v47 = journeyVisuals(JOURNEY_PHASES[46].xp);
    expect(v43.worldId).toBe(5);
    expect(v47.worldId).toBe(5);
    expect(v47.intensity).toBeGreaterThan(v43.intensity);
    expect(v47.adornmentCount).toBeGreaterThanOrEqual(v43.adornmentCount);
  });

  it('adornmentCount: 1 no início do mundo, 3 no fim', () => {
    const w5 = JOURNEY_WORLDS[4];
    expect(journeyVisuals(JOURNEY_PHASES[w5.firstPhase - 1].xp).adornmentCount).toBe(1);
    expect(journeyVisuals(JOURNEY_PHASES[w5.lastPhase - 1].xp).adornmentCount).toBe(3);
  });

  it('NaN/negativo → mundo 1, intensity válida', () => {
    for (const bad of [NaN, -100, Infinity]) {
      const v = journeyVisuals(bad);
      expect(v.worldId).toBe(1);
      expect(v.intensity).toBeGreaterThanOrEqual(0);
      expect(v.intensity).toBeLessThanOrEqual(1);
    }
  });
});

describe('Mascot2D — camada da Jornada', () => {
  it('sem journey, render idêntico ao legado (zero regressão)', () => {
    const legacy = TestRenderer.create(
      <Mascot2D personality="calmo" phase="adulto" mood="ok" size={200} />,
    );
    const explicit = TestRenderer.create(
      <Mascot2D personality="calmo" phase="adulto" mood="ok" size={200} journey={null} />,
    );
    expect(JSON.stringify(legacy.toJSON())).toBe(JSON.stringify(explicit.toJSON()));
  });

  it('mundo 1 (none) não adiciona nada ao SVG', () => {
    const sem = TestRenderer.create(
      <Mascot2D personality="calmo" phase="ovo" mood="ok" size={200} />,
    );
    const com = TestRenderer.create(
      <Mascot2D personality="calmo" phase="ovo" mood="ok" size={200} journey={journeyVisuals(0)} />,
    );
    expect(JSON.stringify(com.toJSON())).toBe(JSON.stringify(sem.toJSON()));
  });

  it('mundos distintos produzem renders distintos (47 ≠ 43 não basta — 5 ≠ 2 também)', () => {
    const base = { personality: 'calmo' as const, phase: 'adulto' as const, mood: 'ok' as const, size: 200 };
    const w2 = TestRenderer.create(
      <Mascot2D {...base} journey={journeyVisuals(JOURNEY_PHASES[12].xp)} />,
    );
    const w5 = TestRenderer.create(
      <Mascot2D {...base} journey={journeyVisuals(JOURNEY_PHASES[46].xp)} />,
    );
    const sem = TestRenderer.create(<Mascot2D {...base} />);
    const jw2 = JSON.stringify(w2.toJSON());
    const jw5 = JSON.stringify(w5.toJSON());
    const jsem = JSON.stringify(sem.toJSON());
    expect(jw2).not.toBe(jsem);
    expect(jw5).not.toBe(jsem);
    expect(jw2).not.toBe(jw5);
    // Cores de identidade dos mundos presentes no SVG
    expect(jw2).toContain(JOURNEY_WORLDS[1].hue);
    expect(jw5).toContain(JOURNEY_WORLDS[4].hue);
  });

  it('fases diferentes do MESMO mundo produzem renders distintos', () => {
    const base = { personality: 'fofo' as const, phase: 'adulto' as const, mood: 'feliz' as const, size: 200 };
    const f43 = TestRenderer.create(
      <Mascot2D {...base} journey={journeyVisuals(JOURNEY_PHASES[42].xp)} />,
    );
    const f47 = TestRenderer.create(
      <Mascot2D {...base} journey={journeyVisuals(JOURNEY_PHASES[46].xp)} />,
    );
    expect(JSON.stringify(f43.toJSON())).not.toBe(JSON.stringify(f47.toJSON()));
  });
});
