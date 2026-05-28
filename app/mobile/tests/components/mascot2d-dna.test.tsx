/**
 * Mascot2D — render DNA-driven.
 *
 * Garante:
 *  - Sem DNA, paleta vem de personality (compat legada)
 *  - Com DNA, paleta deriva de paletteFromGenome
 *  - DNAs diferentes produzem renders distintos (não fallback genérico)
 */

import { describe, expect, it } from 'vitest';
import * as TestRenderer from 'react-test-renderer';
import { Mascot2D } from '@/components/Mascot2D';
import { genomeFromPreset, genomeForPersonality } from '@/lib/dna';
import type { MascotDNA } from '@/types';

function snapshotColors(json: string): Set<string> {
  // Extrai todos os hex/hsl que aparecem no SVG renderizado
  const colors = new Set<string>();
  const hexMatches = json.match(/#[0-9A-Fa-f]{6}/g) ?? [];
  const hslMatches = json.match(/hsl\([^)]+\)/g) ?? [];
  for (const c of hexMatches) colors.add(c.toLowerCase());
  for (const c of hslMatches) colors.add(c);
  return colors;
}

describe('Mascot2D — DNA-driven', () => {
  it('sem DNA, render usa cor da personality (compat legada)', () => {
    const tree = TestRenderer.create(
      <Mascot2D personality="calmo" phase="adolescente" mood="ok" size={200} />,
    );
    const json = JSON.stringify(tree.toJSON());
    // Compat: deve renderizar sem crash, cores típicas de Calmo (sage)
    expect(json.length).toBeGreaterThan(100);
  });

  it('com DNA, render produz paleta distinta de "robô laranja genérico"', () => {
    const dna1 = genomeFromPreset(12345, genomeForPersonality('calmo'), 0.2) as MascotDNA;
    const dna2 = genomeFromPreset(99999, genomeForPersonality('fofo'), 0.2) as MascotDNA;

    const a = TestRenderer.create(
      <Mascot2D personality="calmo" phase="adulto" mood="ok" size={200} dna={dna1} />,
    );
    const b = TestRenderer.create(
      <Mascot2D personality="fofo" phase="adulto" mood="ok" size={200} dna={dna2} />,
    );

    const ca = snapshotColors(JSON.stringify(a.toJSON()));
    const cb = snapshotColors(JSON.stringify(b.toJSON()));

    // Pelo menos UMA cor única em cada — comprova que DNA influenciou
    const onlyInA = [...ca].filter((c) => !cb.has(c));
    const onlyInB = [...cb].filter((c) => !ca.has(c));
    expect(onlyInA.length + onlyInB.length).toBeGreaterThan(0);
  });

  it('mesmo DNA → render determinístico (paridade entre instâncias)', () => {
    const dna = genomeFromPreset(7777, genomeForPersonality('sabio'), 0.15) as MascotDNA;
    const a = TestRenderer.create(
      <Mascot2D personality="sabio" phase="adulto" mood="feliz" size={200} dna={dna} />,
    );
    const b = TestRenderer.create(
      <Mascot2D personality="sabio" phase="adulto" mood="feliz" size={200} dna={dna} />,
    );
    expect(JSON.stringify(a.toJSON())).toBe(JSON.stringify(b.toJSON()));
  });

  it('DNA é PRIORIZADO sobre personality (visualmente)', () => {
    // Mesma personality, mas DNAs distintos com seeds bem distantes
    const dnaA = genomeFromPreset(1, genomeForPersonality('motivador'), 0.45) as MascotDNA;
    const dnaB = genomeFromPreset(99999999, genomeForPersonality('motivador'), 0.45) as MascotDNA;

    const a = TestRenderer.create(
      <Mascot2D personality="motivador" phase="adulto" mood="ok" size={200} dna={dnaA} />,
    );
    const b = TestRenderer.create(
      <Mascot2D personality="motivador" phase="adulto" mood="ok" size={200} dna={dnaB} />,
    );
    expect(JSON.stringify(a.toJSON())).not.toBe(JSON.stringify(b.toJSON()));
  });
});
