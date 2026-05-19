/**
 * Testes do módulo de descritores semânticos do DNA.
 *
 * Invariantes invioláveis (testadas aqui + reforçadas em
 * tests/security/dna-privacy-ai.test.ts):
 *  - Descritor nunca contém valor numérico
 *  - Descritor nunca contém nome de gene (EN ou PT-BR científico)
 *  - Tom é sempre positivo (sem cobrança)
 *  - Cap em MAX_DESCRIPTORS = 4
 *  - Determinístico (mesma genome → mesma saída)
 *  - Genome neutro → vazio
 */

import { describe, it, expect } from 'vitest';
import {
  GENE_NAMES_FOR_LEAK_DETECTION,
  GENE_PT_NAMES_FOR_LEAK_DETECTION,
  MAX_DESCRIPTORS,
  dnaDescriptors,
  dnaPromptSection,
} from '@/lib/dna/descriptors';
import { generateGenome, neutralGenome } from '@/lib/dna/genome';

describe('dnaDescriptors — garantias de não-vazamento', () => {
  it('NUNCA contém valor numérico em nenhum descritor', () => {
    // Testa contra 50 genomes aleatórios.
    for (let seed = 0; seed < 50; seed++) {
      const g = generateGenome(seed);
      const ds = dnaDescriptors(g);
      for (const d of ds) {
        expect(d).not.toMatch(/\d/);
      }
    }
  });

  it('NUNCA contém nome em inglês de gene', () => {
    const extremes = {
      ...neutralGenome(),
      empathy: 0.95, curiosity: 0.95, creativity: 0.95, discipline: 0.95,
      chaos: 0.95, aggression: 0.95, resilience: 0.95, emotionalDepth: 0.95,
      socialEnergy: 0.95, adaptability: 0.95, intelligence: 0.95,
    };
    const ds = dnaDescriptors(extremes);
    const combined = ds.join(' ').toLowerCase();
    for (const name of GENE_NAMES_FOR_LEAK_DETECTION) {
      expect(combined).not.toContain(name.toLowerCase());
    }
  });

  it('NUNCA contém vocabulário científico PT-BR (empatia, criatividade, etc)', () => {
    const extremes = {
      ...neutralGenome(),
      empathy: 0.95, curiosity: 0.95, creativity: 0.95, discipline: 0.95,
      chaos: 0.95, aggression: 0.95, resilience: 0.95, emotionalDepth: 0.95,
      socialEnergy: 0.95, adaptability: 0.95, intelligence: 0.95,
    };
    const ds = dnaDescriptors(extremes);
    const combined = ds.join(' ').toLowerCase();
    for (const name of GENE_PT_NAMES_FOR_LEAK_DETECTION) {
      expect(combined).not.toContain(name.toLowerCase());
    }
  });

  it('cap em MAX_DESCRIPTORS', () => {
    // DNA "tudo alto" deveria casar com MANY descritores. Deve respeitar cap.
    const extremes = {
      ...neutralGenome(),
      empathy: 0.95, curiosity: 0.95, creativity: 0.95, discipline: 0.95,
      chaos: 0.95, aggression: 0.95, resilience: 0.95, emotionalDepth: 0.95,
      socialEnergy: 0.95, adaptability: 0.95, intelligence: 0.95,
    };
    expect(dnaDescriptors(extremes).length).toBeLessThanOrEqual(MAX_DESCRIPTORS);
  });

  it('genome neutro (todos 0.5) → vazio (nenhum trait saliente)', () => {
    expect(dnaDescriptors(neutralGenome())).toEqual([]);
  });

  it('determinístico — mesma genome → mesma saída', () => {
    const g = generateGenome(42);
    const a = dnaDescriptors(g);
    const b = dnaDescriptors(g);
    expect(a).toEqual(b);
  });

  it('genome com socialEnergy alto produz "expansiva"', () => {
    const g = { ...neutralGenome(), socialEnergy: 0.85 };
    const ds = dnaDescriptors(g);
    expect(ds.some(d => d.includes('expansiva'))).toBe(true);
  });

  it('genome com socialEnergy baixo produz "reservada"', () => {
    const g = { ...neutralGenome(), socialEnergy: 0.2 };
    const ds = dnaDescriptors(g);
    expect(ds.some(d => d.includes('reservada'))).toBe(true);
  });

  it('genome com chaos alto produz "imprevisível"', () => {
    const g = { ...neutralGenome(), chaos: 0.75 };
    const ds = dnaDescriptors(g);
    expect(ds.some(d => d.includes('imprevisível'))).toBe(true);
  });

  it('tom é positivo — nunca usa palavras de cobrança', () => {
    const negativeWords = [
      'fraco', 'fraca', 'preguiço', 'lerd', 'distraí', 'ruim', 'mal',
      'pior', 'pouco', 'menos', 'falha', 'baixa', 'baixo',
      'agressiva', 'agressivo', 'violenta', 'violento',
    ];
    // Testa 50 genomes aleatórios
    for (let seed = 0; seed < 50; seed++) {
      const g = generateGenome(seed);
      const combined = dnaDescriptors(g).join(' ').toLowerCase();
      for (const neg of negativeWords) {
        expect(combined).not.toContain(neg);
      }
    }
  });

  it('todos descritores começam com "criatura"', () => {
    for (let seed = 0; seed < 30; seed++) {
      const g = generateGenome(seed);
      const ds = dnaDescriptors(g);
      for (const d of ds) {
        expect(d.toLowerCase()).toMatch(/^criatura/);
      }
    }
  });
});

describe('dnaPromptSection — wrapping seguro', () => {
  it('genome neutro → string vazia (não polui prompt)', () => {
    expect(dnaPromptSection(neutralGenome())).toBe('');
  });

  it('genome com traits salientes → seção formatada', () => {
    const g = { ...neutralGenome(), socialEnergy: 0.85, empathy: 0.8 };
    const section = dnaPromptSection(g);
    expect(section).toContain('ESTADO ATUAL DA CRIATURA');
    expect(section).toContain('inspiração de tom');
    expect(section).toContain('expansiva');
    expect(section).toContain('atenta');
  });

  it('instrui modelo a NÃO mencionar literalmente', () => {
    const g = { ...neutralGenome(), socialEnergy: 0.85 };
    const section = dnaPromptSection(g);
    expect(section).toContain('NÃO mencione literalmente');
    expect(section).toContain('NÃO descreva o corpo dela');
  });

  it('formato bullet-point com "- "', () => {
    const g = { ...neutralGenome(), socialEnergy: 0.85, intelligence: 0.85 };
    const section = dnaPromptSection(g);
    // Cada descritor vem em linha "- "
    const bullets = section.split('\n').filter(l => l.startsWith('- '));
    expect(bullets.length).toBeGreaterThanOrEqual(2);
  });

  it('seção inteira não contém número (verificação reforçada)', () => {
    for (let seed = 0; seed < 30; seed++) {
      const g = generateGenome(seed);
      const section = dnaPromptSection(g);
      expect(section).not.toMatch(/\d/);
    }
  });
});
