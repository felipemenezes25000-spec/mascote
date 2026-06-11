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
    // Regressão (auditoria jun/2026 ajuste1 — 2ª passada): futuro/condicional de
    // "me matar" (antes só infinitivo/presente/passado).
    'eu me matarei amanhã',
    'me mataria se pudesse',
    // Salto fatal em passado/presente/gerúndio (antes só infinitivo "pular").
    'pulei da ponte ontem',
    'pulo do viaduto',
    'pulando da laje',
    // Enforcamento no radical "enforqu" (antes só /enforcar/ pegava o "c").
    'me enforquei',
    'tava me enforcando',
    // Regressão (auditoria 2026-06-05 ajuste1): ideação passiva / desejo de
    // não-existência que escapava pro reply normal por gaps de regex.
    // "nunca ter nascido" (antes só /prefer.../acordar|existir cobria).
    'queria nunca ter nascido',
    'preferia nunca ter nascido',
    // "dormir e não/nunca mais acordar" — ideação passiva clássica.
    'queria dormir e nunca mais acordar',
    'quero dormir e não acordar',
    // "dar um fim em tudo" (antes só "a tudo"/"a isso tudo", faltava prep. "em").
    'vou dar um fim em tudo isso',
    // Regressão (auditoria 2026-06-07 ajuste1): crises diretas que o regex perdia
    // e que só o sentiment (frágil) ou nada pegava — viravam reply normal sem CVV.
    // Envenenamento reflexivo (antes só "tomar veneno").
    'vou me envenenar',
    'me envenenei ontem',
    // "acabar com a/minha vida" (antes só "acabar com tudo").
    'vou acabar com a minha vida',
    'queria acabar com minha vida',
    'pensei em acabar com a própria vida',
    // "não aguento mais viver" (antes só "não quero mais viver").
    'não aguento mais viver',
    'nao aguento mais a vida',
    // Desejo de não-existência via "estar/ficar morto" (antes não coberto).
    'queria estar morto',
    'quero estar morta',
    // "não quero mais existir" (antes exigia "preferia não existir").
    'não quero mais existir',
    'nao quero existir',
    // Perda de sentido de vida ancorada em viver|vida.
    'não vejo sentido em viver',
    'não tenho mais motivo pra viver',
    'não vejo razão na vida',
    // Regressão (auditoria 2026-06-08 ajuste1): crises diretas que escapavam pro
    // reply normal (sem CVV) por gaps de regex.
    // Ideação por fardo ("ficariam/estaria/seria melhor sem mim").
    'todos ficariam melhor sem mim',
    'minha família estaria melhor sem mim',
    'o mundo seria melhor sem mim',
    // Eufemismo "pôr/por fim" à/na vida / em mim (antes só "dar fim").
    'vou pôr fim à minha vida',
    'por um fim na minha vida',
    // "desistir de viver" / "desistir da minha vida".
    'quero desistir de viver',
    'vou desistir da minha vida',
    // Método com arma de fogo ancorado na anatomia/reflexivo.
    'só penso em dar um tiro na cabeça',
    'um tiro em mim',
    // Regressão (auditoria 2026-06-11 ajuste1): crises diretas que escapavam pro
    // reply normal (sem CVV) por gaps de regex.
    // "tirar a MINHA vida" — a forma mais comum, que o grupo exclusivo perdia.
    'pensei em tirar a minha vida',
    'vou tirar a minha própria vida',
    // Particípio "morrido" (antes só o infinitivo "morrer" casava).
    'queria ter morrido',
    'tinha que ter morrido naquele dia',
    // Salto fatal flexionado (antes só o infinitivo "me jogar").
    'me jogo da ponte',
    'me joguei do prédio ontem',
    // Arma de fogo reflexiva solta (antes exigia "tiro na cabeça/em mim").
    'vou me dar um tiro',
    'queria atirar em mim mesmo',
    // Envenenamento: "beber veneno" e "chumbinho" (antes só tomar/engolir veneno).
    'vou beber veneno',
    'comprei chumbinho pra mim',
    // Eufemismos "dar cabo" e "dar um fim À minha vida" (crase).
    'quero dar cabo da minha vida',
    'vou dar um fim à minha vida',
    // Auto-lesão sem "cortar".
    'vou abrir os pulsos',
    'me mutilei de novo',
    'penso em automutilação',
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
    // Regressão (ajuste1 2ª passada): as flexões ampliadas (matar/pular/enforcar)
    // não podem capturar hipérbole comum sem âncora reflexiva/de local.
    'tô me matando de rir',
    'pulei de alegria quando soube',
    'pulando de felicidade',
    'vou matar a fome agora',
    'preciso reforçar a ideia',
    // Regressão (2026-06-05 ajuste1): a negação é obrigatória no padrão
    // "dormir e ... acordar" — rotina de sono normal não pode virar crise.
    'preciso dormir e acordar cedo amanhã',
    // Regressão (2026-06-07 ajuste1): o lookahead de "estar morto" exclui a
    // hipérbole pt-BR; e a âncora viver|vida evita pegar "motivo pra continuar X".
    'quero estar morto de cansaço hoje',
    'tava morta de fome ontem',
    'não vejo motivo pra continuar lendo isso',
    // Regressão (2026-06-08 ajuste1): as novas âncoras (fardo/pôr-fim/desistir/
    // tiro) não podem capturar idiomas que compartilham palavras com a crise.
    'esse time joga melhor sem mim',     // "melhor sem mim" sem verbo de existência
    'por fim consegui terminar a tarefa', // "por fim" conector (= finalmente)
    'desisti da vida noturna',            // largar um hábito, não a vida
    'dar um tiro no escuro nessa prova',  // chutar/arriscar, não arma
    // Regressão (2026-06-11 ajuste1): as novas âncoras não podem capturar idioma
    // que compartilha palavras com a crise.
    'me joguei no trabalho de cabeça',    // mergulhar num esforço (local não-fatal)
    'preciso dar cabo do trabalho hoje',  // concluir tarefa, não a vida
    'queria ter morrido de rir com isso', // hipérbole excluída pelo lookahead
    'tirar férias é o que eu mais quero', // "tirar" sem "vida"
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
