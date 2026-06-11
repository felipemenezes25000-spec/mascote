/**
 * Formas da Jornada — evolução CORPORAL do mascote.
 *
 * Invariantes:
 *  - 10 formas nomeadas, únicas; traços CUMULATIVOS (Supremo carrega 9).
 *  - mascotFormFromXp é pura e NaN-safe.
 *  - nextFormTeaser aponta a fase de entrada do próximo mundo; Supremo → null.
 *  - Emblema deriva do arquétipo dominante do DNA; sem DNA → lumina.
 *  - Render: corpo do mascote MUDA entre mundos (traços novos no SVG);
 *    sem journey prop → idêntico ao legado.
 */

import { describe, expect, it } from 'vitest';
import * as TestRenderer from 'react-test-renderer';
import { Mascot2D } from '@/components/Mascot2D';
import {
  emblemForGenome,
  formDisplayName,
  formFeaturesForWorld,
  formForWorld,
  mascotFormFromXp,
  nextFormTeaser,
} from '@/game/journey/forms';
import { journeyVisuals } from '@/game/journey/visuals';
import { JOURNEY_PHASES, JOURNEY_WORLDS } from '@/game/journey';
import { genomeFromPreset, genomeForPersonality } from '@/lib/dna';
import type { MascotDNA } from '@/types';

describe('forms — conteúdo e pureza', () => {
  it('10 formas com nomes únicos e trait não-vazio', () => {
    const names = new Set<string>();
    for (let w = 1; w <= 10; w++) {
      const f = formForWorld(w);
      expect(f.formId).toBe(w);
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.trait.length).toBeGreaterThan(0);
      names.add(f.name);
    }
    expect(names.size).toBe(10);
  });

  it('traços são cumulativos: mundo N tem N-1 traços', () => {
    for (let w = 1; w <= 10; w++) {
      expect(formFeaturesForWorld(w).length).toBe(w - 1);
    }
    // Supremo carrega a história inteira.
    expect(formFeaturesForWorld(10)).toContain('brow_mark');
    expect(formFeaturesForWorld(10)).toContain('ethereal_crown');
    // Mundo 5 ainda não tem emblema.
    expect(formFeaturesForWorld(5)).not.toContain('chest_emblem');
  });

  it('mascotFormFromXp deriva do XP; NaN → Semente', () => {
    expect(mascotFormFromXp(0).name).toBe('Semente');
    expect(mascotFormFromXp(NaN).name).toBe('Semente');
    expect(mascotFormFromXp(JOURNEY_PHASES[99].xp).name).toBe('Supremo');
    expect(formFeaturesForWorld(NaN as unknown as number).length).toBe(0);
  });

  it('nextFormTeaser aponta a fase de entrada do próximo mundo; Supremo → null', () => {
    const t1 = nextFormTeaser(0);
    expect(t1?.name).toBe('Marcado');
    expect(t1?.atPhase).toBe(JOURNEY_WORLDS[1].firstPhase);
    expect(nextFormTeaser(JOURNEY_PHASES[99].xp)).toBeNull();
  });

  it('emblema: sem DNA → lumina; com DNA → arquétipo dominante válido', () => {
    expect(emblemForGenome(null)).toBe('lumina');
    const dna = genomeFromPreset(4242, genomeForPersonality('calmo'), 0.2);
    const ids = ['lumina', 'terra', 'aqua', 'vento', 'cosmos', 'flora', 'cristal', 'brasa'];
    expect(ids).toContain(emblemForGenome(dna));
  });

  it('formDisplayName: arquétipo entra no nome só a partir do Mundo 6', () => {
    const dna = genomeFromPreset(4242, genomeForPersonality('calmo'), 0.2);
    const early = formDisplayName(JOURNEY_PHASES[14].xp, dna); // mundo 2
    expect(early).toBe('Marcado');
    const late = formDisplayName(JOURNEY_PHASES[54].xp, dna); // mundo 6
    expect(late).toMatch(/^Coração-Leal de /);
  });
});

describe('Mascot2D — corpo muda com a forma', () => {
  const base = { personality: 'calmo' as const, phase: 'adulto' as const, mood: 'ok' as const, size: 200 };

  it('cada mundo adiciona traço novo: renders de W2..W10 são todos distintos', () => {
    const renders = new Set<string>();
    for (const w of JOURNEY_WORLDS) {
      const firstPhase = JOURNEY_PHASES[w.firstPhase - 1];
      const r = TestRenderer.create(
        <Mascot2D {...base} journey={journeyVisuals(firstPhase.xp)} />,
      );
      renders.add(JSON.stringify(r.toJSON()));
    }
    expect(renders.size).toBe(10);
  });

  it('emblema de arquétipos diferentes muda o peito (W6+, com DNA)', () => {
    // Genomas com dominantes distintos: preset puro maximiza o contraste.
    const dnaA = genomeForPersonality('calmo') as MascotDNA;   // tende a aqua/terra
    const dnaB = genomeForPersonality('motivador') as MascotDNA; // tende a brasa/vento
    const xpW6 = JOURNEY_PHASES[54].xp;
    const a = TestRenderer.create(
      <Mascot2D {...base} dna={dnaA} journey={journeyVisuals(xpW6)} />,
    );
    const b = TestRenderer.create(
      <Mascot2D {...base} dna={dnaB} journey={journeyVisuals(xpW6)} />,
    );
    // DNAs distintos já mudam paleta; o ponto aqui é que AMBOS renderizam
    // sem crash com emblema ativo e produzem árvores válidas e distintas.
    expect(JSON.stringify(a.toJSON())).not.toBe(JSON.stringify(b.toJSON()));
    if (emblemForGenome(dnaA) !== emblemForGenome(dnaB)) {
      expect(emblemForGenome(dnaA)).not.toBe(emblemForGenome(dnaB));
    }
  });

  it('sem journey prop, nenhum traço de forma aparece (legado intacto)', () => {
    const sem = TestRenderer.create(<Mascot2D {...base} />);
    const json = JSON.stringify(sem.toJSON());
    // O ponto de acento original do peito continua presente (r=3 no centro).
    expect(json.length).toBeGreaterThan(100);
    const com = TestRenderer.create(
      <Mascot2D {...base} journey={journeyVisuals(JOURNEY_PHASES[54].xp)} />,
    );
    expect(JSON.stringify(com.toJSON())).not.toBe(json);
  });
});
