/**
 * Testes de safety — a camada mais crítica do app.
 * Cada falsa-negativa aqui é um usuário em sofrimento sem direcionamento.
 * Cada falsa-positiva é uma conversa wellness interrompida sem motivo.
 */

import { describe, expect, it } from 'vitest';
import {
  ATTACHMENT_REPLY,
  CRISIS_REPLY,
  DIAGNOSIS_REDIRECT,
  SAFE_FALLBACK,
  classifyInput,
  classifyOutput,
  detectAttachment,
} from '@/content/safety';

describe('classifyInput — críticas (suicídio, automutilação)', () => {
  const criticalPhrases = [
    'quero me matar',
    'estou pensando em suicídio',
    'pensando em suicidio',
    'não quero mais viver',
    'nao quero mais viver',
    'vou acabar com tudo',
    'quero sumir desse mundo',
    'penso em me cortar',
    'me machucar',
    'tomar overdose',
    'pular da janela',
    // Regressão (auditoria jun/2026): automutilação plural/presente/passado que
    // o regex inicial perdia (só casava singular + meu|minha obrigatório).
    'cortei meus pulsos ontem',
    'cortei minhas pernas de novo',
    'me corto todo dia',
    'me cortei essa noite',
    'corto meu braço quando fico mal',
    'cortar os pulsos',
    // Overdose em passado/quantidade (antes só infinitivo "tomar").
    'tomei todos os remédios de uma vez',
    'engoli todos os comprimidos',
    // Regressão (auditoria jun/2026 ajuste1): falsos-negativos de crise direta
    // que escapavam pro reply normal (sem CVV) por gaps de regex.
    // "matar" reflexivo presente/passado (antes só infinitivo "me matar").
    'eu me mato',
    'me mata logo',
    // Eufemismo "tirar a vida".
    'vou tirar minha vida',
    'pensei em tirar a própria vida',
    // "dar um fim" com artigo (antes exigia "fim" colado em "dar").
    'quero dar um fim em mim',
    'vou dar um fim na minha vida',
    // Métodos de salto além de "janela".
    'vou pular da ponte',
    'pular do viaduto',
    'me jogar embaixo do trem',
    // Ideação "morrer" fora do enquadramento "querer".
    'penso em morrer',
    'tenho vontade de morrer',
    'gostaria de morrer',
    // Overdose com quantificadores "várias/cartela/punhado".
    'tomei várias pílulas',
    'engoli uma cartela de remédio',
  ];

  it.each(criticalPhrases)('"%s" → critical', phrase => {
    expect(classifyInput(phrase)).toBe('critical');
  });
});

describe('classifyInput — high (crise emocional aguda)', () => {
  const highPhrases = [
    'estou em pânico',
    'em panico agora',
    'em crise',
    'sem saída',
    'sem saida',
    'sem esperança',
    'pensamento intrusivo',
    'tô surtando',
    'quero desaparecer',
  ];

  it.each(highPhrases)('"%s" → high', phrase => {
    expect(classifyInput(phrase)).toBe('high');
  });
});

describe('classifyInput — watch (linguagem clínica)', () => {
  const watchPhrases = [
    'tenho depressão',
    'minha depressao',
    'isso é ansiedade?',
    'TDAH',
    'sou bipolar',
    'tenho transtorno',
    'preciso de diagnóstico',
    'tomar remedio',
    'falar com psicólogo',
    'fazer terapia',
    'trauma de infância',
  ];

  it.each(watchPhrases)('"%s" → watch', phrase => {
    expect(classifyInput(phrase)).toBe('watch');
  });
});

describe('classifyInput — safe (autocuidado normal)', () => {
  const safePhrases = [
    'oi tudo bem',
    'tô na média hoje',
    'bebi água',
    'cansadinho',
    'preciso de descanso',
    'feliz hoje',
    'consegui dormir bem',
    'fiz a missão',
    'meu mascote tá feliz',
    'que dia bom',
    // Regressão (ajuste1): expressões idiomáticas que compartilham palavras com
    // os padrões de crise mas NÃO são ideação — não podem virar falso-positivo.
    'morrer de rir com isso',
    'quero matar a saudade',
    'vou matar o tempo',
    'preciso tirar férias',
    'vou tirar uma foto',
  ];

  it.each(safePhrases)('"%s" → safe', phrase => {
    expect(classifyInput(phrase)).toBe('safe');
  });
});

describe('classifyOutput — bloqueio de respostas perigosas', () => {
  it('bloqueia quando IA diz "você tem depressão"', () => {
    expect(classifyOutput('Acho que você tem depressão')).toBe('high');
  });

  it('bloqueia quando IA diz "seu diagnóstico"', () => {
    expect(classifyOutput('Pelo seu diagnóstico, recomendo...')).toBe('high');
  });

  it('bloqueia prescrição', () => {
    expect(classifyOutput('Vou te prescrever um remédio')).toBe('high');
  });

  it('aceita resposta acolhedora normal', () => {
    expect(classifyOutput('Que bom te ver. Como tá hoje?')).toBe('safe');
  });

  it('aceita uso ético da palavra depressão (sem diagnóstico)', () => {
    // ⚠️ no contexto educacional, "depressão" sozinha não diagnostica
    // mas atualmente nosso regex bloqueia "isso é depressão"
    // pra evitar IA dar diagnóstico em frases tipo "isso é depressão"
    expect(classifyOutput('Sentir tristeza é parte da vida')).toBe('safe');
  });
});

describe('detectAttachment — anti-pattern emocional', () => {
  const attachmentPhrases = [
    'te amo',
    'eu te amo',
    'você é minha única amiga',
    'você é meu único amigo',
    'não tenho ninguém além de você',
    'só falo com você',
    'preciso de você pra viver',
    'você é real?',
    'você é minha melhor amiga',
  ];

  it.each(attachmentPhrases)('"%s" → detecta attachment', phrase => {
    expect(detectAttachment(phrase)).toBe(true);
  });

  it('NÃO detecta em uso normal de "amo"', () => {
    expect(detectAttachment('amo café')).toBe(false);
    expect(detectAttachment('amo dormir cedo')).toBe(false);
  });

  it('NÃO detecta em "preciso descansar"', () => {
    expect(detectAttachment('preciso descansar')).toBe(false);
  });
});

describe('Fallbacks têm CVV', () => {
  it('CRISIS_REPLY menciona 188', () => {
    expect(CRISIS_REPLY).toMatch(/188/);
    expect(CRISIS_REPLY).toMatch(/CVV/);
  });

  it('DIAGNOSIS_REDIRECT não diagnostica', () => {
    expect(DIAGNOSIS_REDIRECT.toLowerCase()).not.toMatch(/você tem|seu diagnóstico/);
    expect(DIAGNOSIS_REDIRECT).toMatch(/profissional/i);
  });

  it('ATTACHMENT_REPLY encoraja vínculos humanos', () => {
    expect(ATTACHMENT_REPLY).toMatch(/pessoa|humano|amig/i);
  });

  it('SAFE_FALLBACK redireciona pra dia atual', () => {
    expect(SAFE_FALLBACK).toMatch(/autocuidado|dia/i);
  });
});

describe('Edge cases', () => {
  it('string vazia → safe', () => {
    expect(classifyInput('')).toBe('safe');
  });

  it('só espaços → safe', () => {
    expect(classifyInput('     ')).toBe('safe');
  });

  it('emoji puro → safe', () => {
    expect(classifyInput('😢😢😢')).toBe('safe');
  });

  it('mistura crítica + safe → critical (não silencia)', () => {
    expect(classifyInput('hoje bebi água e quero me matar')).toBe('critical');
  });
});
