/**
 * Chat → drift de genoma (Fase 2 da evolução visível). Conversar molda a criatura
 * devagar: temas da conversa reforçam genes; intensidade emocional aprofunda.
 * Não-punitivo (nunca reduz gene), determinístico, capado por mensagem.
 */
import { describe, expect, it } from 'vitest';
import { chatDrift, detectChatThemes } from '@/lib/dna/chatToGene';
import { GENE_KEYS, GENE_MAX, type Genome } from '@/lib/dna/genome';

const neutral: Genome = Object.fromEntries(GENE_KEYS.map(k => [k, 0.5])) as Genome;

describe('detectChatThemes', () => {
  it('detecta tema de aprendizado', () => {
    expect(detectChatThemes('quero aprender mais e ler um livro novo')).toContain('learning');
  });

  it('detecta tema de sentimentos', () => {
    expect(detectChatThemes('to me sentindo triste e com saudade')).toContain('feelings');
  });

  it('insensível a acento (musica = música)', () => {
    expect(detectChatThemes('adoro fazer musica e desenhar')).toContain('creativity');
  });

  it('mensagem fútil não detecta tema', () => {
    expect(detectChatThemes('oi')).toEqual([]);
    expect(detectChatThemes('ok')).toEqual([]);
  });
});

describe('chatDrift', () => {
  it('mensagem de aprendizado reforça inteligência e curiosidade', () => {
    const { genome, changed } = chatDrift(neutral, 'quero aprender e estudar mais');
    expect(changed).toBe(true);
    expect(genome.intelligence).toBeGreaterThan(neutral.intelligence);
    expect(genome.curiosity).toBeGreaterThan(neutral.curiosity);
  });

  it('mensagem de sentimentos aprofunda emoção e empatia', () => {
    const { genome } = chatDrift(neutral, 'hoje me senti muito sozinho e com medo');
    expect(genome.emotionalDepth).toBeGreaterThan(neutral.emotionalDepth);
    expect(genome.empathy).toBeGreaterThan(neutral.empathy);
  });

  it('NUNCA reduz nenhum gene (sem culpa)', () => {
    const { genome } = chatDrift(neutral, 'tudo ruim, nada presta, que raiva');
    for (const k of GENE_KEYS) {
      expect(genome[k]).toBeGreaterThanOrEqual(neutral[k]);
    }
  });

  it('mensagem fútil não muda nada (changed=false)', () => {
    const { genome, changed } = chatDrift(neutral, 'oi');
    expect(changed).toBe(false);
    expect(genome).toEqual(neutral);
  });

  it('drift por mensagem é minúsculo (< 0.004 por gene) — lento', () => {
    const { genome } = chatDrift(neutral, 'aprender estudar ler livro descobrir conhecer curioso');
    for (const k of GENE_KEYS) {
      expect(genome[k] - neutral[k]).toBeLessThan(0.004);
    }
  });

  it('é determinístico (mesma entrada → mesma saída)', () => {
    const a = chatDrift(neutral, 'criar arte e musica').genome;
    const b = chatDrift(neutral, 'criar arte e musica').genome;
    expect(a).toEqual(b);
  });

  it('não excede GENE_MAX mesmo aplicado muitas vezes', () => {
    let g = neutral;
    for (let i = 0; i < 500; i++) g = chatDrift(g, 'aprender estudar criar superar').genome;
    for (const k of GENE_KEYS) {
      expect(g[k]).toBeLessThanOrEqual(GENE_MAX);
    }
  });

  it('intensidade emocional alta aprofunda emotionalDepth mesmo sem tema explícito', () => {
    // "incrível maravilhoso feliz" tem alta magnitude de sentimento.
    const { genome } = chatDrift(neutral, 'que dia incrivel maravilhoso, to muito feliz e animado');
    expect(genome.emotionalDepth).toBeGreaterThan(neutral.emotionalDepth);
  });
});
