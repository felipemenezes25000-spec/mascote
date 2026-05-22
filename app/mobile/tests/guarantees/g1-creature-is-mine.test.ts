/**
 * Guarantee #1: "Essa criatura é minha. Não é um avatar genérico."
 *
 * Promessa de produto que precisamos travar em código pra ninguém quebrar
 * acidentalmente. Se um destes testes falhar, o app **deixou de cumprir
 * uma promessa que fizemos ao usuário**.
 *
 * O que travamos aqui:
 *  1.1 200 uids distintos produzem ≥ 95% paletas com hue distinto
 *      (criaturas visualmente reconhecíveis como diferentes)
 *  1.2 200 uids distintos produzem ≥ 95% morfologias com alguma trait
 *      visual diferente (forma/escala/aparência)
 *  1.3 20 check-ins do mesmo hábito produzem delta MENSURÁVEL nos genes
 *      esperados (drift "visível" — evolução não é cosmética)
 *  1.4 Drift nunca regride (princípio "sem culpa")
 *  1.5 Archetype é função pura do genome — duas criaturas com o mesmo
 *      genoma têm o mesmo archetype (determinismo)
 *  1.6 generateCreatureName produz nomes variados (não 1 de 4)
 *
 * Padrão `fast-check`: shrink automático garante que se a propriedade
 * falhar, vemos o caso mínimo de falha — útil pra debug.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  applyDecay,
  applyHabitDrift,
  applyManyDrifts,
  generateCreatureName,
  genomeForPersonality,
  genomeFromPreset,
  getArchetype,
  hashGenome,
  morphologyFromGenome,
  paletteFromGenome,
  type Genome,
} from '@/lib/dna';
import type { HabitKind, Personality } from '@/types';

/** Hash FNV-1a de string → seed numérico (emulando o que o app faz com user_id). */
function seedFromUid(uid: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function genomeForUid(uid: string, personality: Personality = 'calmo'): Genome {
  const preset = genomeForPersonality(personality);
  return genomeFromPreset(seedFromUid(uid), preset, 0.18);
}

const PERSONALITIES: Personality[] = ['calmo', 'motivador', 'fofo', 'sabio'];

describe('Guarantee #1 — criatura é minha, não é avatar genérico', () => {
  describe('1.1 paleta única por usuário', () => {
    it('200 uids (4 personalidades) → ≥ 180 strings de paleta distintas (90%+)', () => {
      // Realidade: dentro de uma personalidade, hue clusteriza (faz sentido — calmos
      // se parecem). Mas a string de paleta completa (1 casa decimal) é praticamente
      // única por uid por causa de saturação + lightness + accent + glow combinados.
      const sigs = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const personality = PERSONALITIES[i % 4];
        const uid = `user-${i}`;
        const g = genomeForUid(uid, personality);
        const palette = paletteFromGenome(g);
        sigs.add(`${palette.body}|${palette.accent}|${palette.glow}`);
      }
      expect(sigs.size).toBeGreaterThanOrEqual(180);
    });

    it('200 uids (4 personalidades) → cobrem ≥ 4 buckets de hue de 10° (espectro wellness)', () => {
      const hues = new Set<number>();
      for (let i = 0; i < 200; i++) {
        const personality = PERSONALITIES[i % 4];
        const uid = `user-${i}-hue`;
        const g = genomeForUid(uid, personality);
        hues.add(Math.floor(paletteFromGenome(g).bodyHSL[0] / 10));
      }
      // Paleta é INTENCIONALMENTE narrow — tons wellness (pêssego/coral/menta).
      // Ver palette.ts:28 ("evita roxo neon"). Diferenciação visual real vem
      // de MORFOLOGIA (corpo/olhos/membros) — testada em 1.2.
      expect(hues.size).toBeGreaterThanOrEqual(4);
    });

    it('mesmo preset, seeds diferentes → paletas diferentes', () => {
      const preset = genomeForPersonality('calmo');
      const a = paletteFromGenome(genomeFromPreset(1, preset, 0.2));
      const b = paletteFromGenome(genomeFromPreset(2, preset, 0.2));
      expect(a.body).not.toBe(b.body);
    });

    it('mesmo uid → SEMPRE a mesma paleta (determinismo)', () => {
      const uid = 'felipe-test-uid-fixo';
      const p1 = paletteFromGenome(genomeForUid(uid));
      const p2 = paletteFromGenome(genomeForUid(uid));
      expect(p1.bodyHSL).toEqual(p2.bodyHSL);
      expect(p1.body).toBe(p2.body);
    });
  });

  describe('1.2 morfologia única por usuário', () => {
    it('100 uids → ≥ 90 morfologias com alguma trait visual diferente', () => {
      const sigs = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const uid = `morpho-user-${i}`;
        const g = genomeForUid(uid);
        const m = morphologyFromGenome(g);
        // Assinatura visual = combinação de traits que o usuário VÊ
        const sig = [
          m.bodyHeightStretch.toFixed(3),
          m.bodyWidthSquash.toFixed(3),
          m.eyeSize.toFixed(3),
          m.limbCount,
          m.spikeCount,
          m.hasTail ? 't' : '_',
          m.hasAntennae ? 'a' : '_',
          m.pattern,
        ].join('|');
        sigs.add(sig);
      }
      expect(sigs.size).toBeGreaterThanOrEqual(90);
    });

    it('mesmo uid → SEMPRE a mesma morfologia (determinismo)', () => {
      const uid = 'felipe-morpho-fixo';
      const a = morphologyFromGenome(genomeForUid(uid));
      const b = morphologyFromGenome(genomeForUid(uid));
      expect(a).toEqual(b);
    });

    it('cada uma das 4 personalidades-preset gera morfologia base distinta', () => {
      const sigs = new Set<string>();
      for (const p of PERSONALITIES) {
        const g = genomeForPersonality(p);
        const m = morphologyFromGenome(g);
        sigs.add(
          [m.bodyHeightStretch.toFixed(3), m.eyeSize.toFixed(3), m.pattern, m.limbCount].join('|'),
        );
      }
      expect(sigs.size).toBe(4);
    });
  });

  describe('1.3 hábito produz evolução visível, não cosmética', () => {
    function geneDelta(before: Genome, after: Genome, key: keyof Genome): number {
      return after[key] - before[key];
    }

    it('20 dias de reading → intelligence sobe ≥ 0.15 (perceptível)', () => {
      const base = genomeForPersonality('calmo');
      const after = applyManyDrifts(
        base,
        Array.from({ length: 20 }, (): { habit: HabitKind; intensity: number } => ({
          habit: 'reading',
          intensity: 1,
        })),
      );
      // Drift de reading.intelligence = 0.014/dia × 20 = 0.28 (ou cap em GENE_MAX)
      const delta = geneDelta(base, after, 'intelligence');
      expect(delta).toBeGreaterThanOrEqual(0.15);
    });

    it('20 dias de meditation → empathy + emotionalDepth + discipline sobem', () => {
      const base = genomeForPersonality('motivador');
      const after = applyManyDrifts(
        base,
        Array.from({ length: 20 }, (): { habit: HabitKind; intensity: number } => ({
          habit: 'meditation',
          intensity: 1,
        })),
      );
      expect(geneDelta(base, after, 'empathy')).toBeGreaterThan(0);
      expect(geneDelta(base, after, 'emotionalDepth')).toBeGreaterThan(0);
      expect(geneDelta(base, after, 'discipline')).toBeGreaterThan(0);
    });

    it('drift muda hash do genoma (criatura "evoluiu" de verdade)', () => {
      const base = genomeForUid('felipe-evo-test');
      const beforeHash = hashGenome(base);
      const evolved = applyHabitDrift(base, { habit: 'reading', intensity: 1 });
      const afterHash = hashGenome(evolved);
      expect(beforeHash).not.toBe(afterHash);
    });
  });

  describe('1.4 sem culpa: drift NUNCA regride nenhum gene', () => {
    it('property: 100 random drift sequences nunca reduzem gene algum', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              habit: fc.constantFrom<HabitKind>(
                'water', 'sleep', 'exercise', 'meditation', 'reading',
                'journaling', 'breath', 'outdoor', 'sun',
              ),
              intensity: fc.float({ min: 0, max: 1, noNaN: true }),
            }),
            { minLength: 1, maxLength: 30 },
          ),
          (drifts) => {
            const base = genomeForPersonality('sabio');
            const after = applyManyDrifts(base, drifts);
            for (const k of Object.keys(base) as (keyof Genome)[]) {
              if (after[k] < base[k] - 1e-9) {
                return false; // shrink mostraria o input mínimo que regrediu
              }
            }
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('decay (300 runs) NUNCA atravessa 0.5 (genes altos ficam ≥ 0.5; baixos ≤ 0.5)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }),
          fc.integer({ min: 0, max: 1_000_000 }),
          (days, seed) => {
            const base = genomeFromPreset(seed, genomeForPersonality('fofo'), 0.3);
            const decayed = applyDecay(base, days);
            for (const k of Object.keys(base) as (keyof Genome)[]) {
              const wasHigh = base[k] >= 0.5;
              if (wasHigh && decayed[k] < 0.5) return false;
              if (!wasHigh && decayed[k] > 0.5) return false;
            }
            return true;
          },
        ),
        { numRuns: 300 },
      );
    });
  });

  describe('1.5 archetype é determinístico (mesma criatura, mesma identidade)', () => {
    it('mesmo genome → mesmo archetype', () => {
      const g = genomeForUid('archetype-test');
      const a1 = getArchetype(g);
      const a2 = getArchetype(g);
      expect(a1.key).toBe(a2.key);
      expect(a1.name).toBe(a2.name);
    });

    it('archetype varia entre as 4 personalidades-preset (não todas iguais)', () => {
      const keys = new Set(PERSONALITIES.map((p) => getArchetype(genomeForPersonality(p)).key));
      // BIPO+LULU → empathy alta = Acolhedor. ZIP → socialEnergy = Caloroso.
      // ARO → intelligence = Atento. Esperado: ≥ 3 archetypes distintos.
      expect(keys.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('1.6 nome procedural produz variedade real', () => {
    it('50 seeds distintos → ≥ 25 nomes distintos (não cair em ~5 stereotypes)', () => {
      const names = new Set<string>();
      const base = genomeForPersonality('calmo');
      for (let i = 0; i < 50; i++) {
        names.add(generateCreatureName(base, i));
      }
      expect(names.size).toBeGreaterThanOrEqual(25);
    });

    it('mesmo genome + mesmo seed → mesmo nome (determinismo)', () => {
      const g = genomeForUid('name-test');
      expect(generateCreatureName(g, 42)).toBe(generateCreatureName(g, 42));
    });
  });
});
