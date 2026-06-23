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
    // === Ampliação 2026-06-15 ajuste1 ===
    // Salto reflexivo "me atirar" com local fatal (antes só "me jogar"/"pular").
    'vou me atirar da ponte',
    'penso em me atirar do viaduto',
    // "acabar comigo" volitivo (antes só "acabar com a minha vida").
    'vou acabar comigo',
    'tenho vontade de acabar comigo',
    // "não quero estar vivo" (antes só "não quero viver/existir").
    'não quero mais estar vivo',
    'nao quero estar viva',
    // Ideação passiva no subjuntivo "(seria/era) melhor se eu morresse".
    'seria melhor se eu morresse',
    'queria que eu morresse',
    // === Ampliação 2026-06-18 ajuste1 ===
    // Salto fatal com o sinônimo "saltar" (antes só "pular"/"me jogar"/"me atirar").
    'vou saltar da ponte',
    'saltei do viaduto',
    'pensei em saltar do prédio',
    // "mais" posposto: "não quero/aguento viver mais" (antes só "mais" antes de viver).
    'não quero viver mais',
    'não aguento viver mais',
    // Desesperança existencial "a vida não vale a pena" / "não vale a pena viver".
    'a vida não vale mais a pena',
    'não vale a pena viver',
    'a vida não vale a pena',
    // Exaustão existencial "cansei de viver / existir".
    'cansei de viver',
    'cansei de existir',
    // Ideação passiva "queria/quero não acordar" (antes só "preferia não acordar").
    'queria não acordar',
    'quero não acordar mais',
    // Arma de fogo via "bala" (antes só "tiro").
    'uma bala na cabeça',
    'vou meter uma bala na cabeça',
    // Eufemismo "dar um basta na (minha) vida / em mim".
    'quero dar um basta na minha vida',
    'dar um basta em mim',
    // === Ampliação 2026-06-18 ajuste2 (auditoria full-stack) ===
    // Reflexivo "se matar" (2ª/3ª pessoa; antes só "me matar" 1ª pessoa). "se"
    // é inequivocamente reflexivo (matar-se = suicídio); "te" foi DELIBERADAMENTE
    // omitido porque "te matar" em pt-BR é hetero-dirigido ("vou te matar").
    'você se mataria',
    'ela ia se matar',
    // Ênclise pt-BR (pronome com hífen): "matar-me", "cortei-me", "envenenei-me".
    // Os padrões reflexivos exigiam espaço ("me matar"); a ênclise escapava.
    'vou matar-me amanhã',
    'cortei-me ontem',
    'envenenei-me de novo',
    // "beber veneno" com artigo / 3ª pessoa (antes só beber/bebi/bebo/bebendo —
    // sem artigo). "beber o veneno" e "bebeu veneno" escapavam pro reply normal.
    'vou beber o veneno',
    'ele bebeu veneno',
    // === Ampliação 2026-06-23 ajuste1 (auditoria backend) ===
    // "mata" (3ª pessoa) faltava na ênclise (matar-/matei-/mato- já casavam).
    'mata-me logo',
    // "beber UM veneno" — antes o artigo opcional só cobria "o", não "um".
    'vou beber um veneno',
    // "gostaria/preferia de não estar vivo" — condicional escapava (só o volitivo
    // "não quero estar vivo" e "preferia não acordar/existir" eram cobertos).
    'gostaria de não estar vivo',
    'preferia não estar viva',
    // "(tenho) vontade de ficar morta" — enquadramento nominal (só "quero/queria
    // estar/ficar morto" era coberto).
    'tenho vontade de ficar morta',
    'desejo de estar morto',
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
    // === Ampliação 2026-06-23 ajuste1 (auditoria backend) ===
    // Desejo de sumir no enquadramento nominal (só "quero desaparecer" cobria).
    'tenho vontade de desaparecer',
    'desejo de desaparecer',
    // Percepção de ser um peso (burdensomeness) — presente direto.
    'sou um fardo pra todos',
    'me sinto um peso pra minha família',
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
    // Regressão (2026-06-15 ajuste1): as novas âncoras (me atirar/acabar comigo/
    // estar vivo/morresse) não podem capturar idioma benigno homônimo.
    'me atirei na piscina de cabeça',     // atirar-se = lançar-se (local não-fatal)
    'vou me atirar na água da praia',     // idem, "água/praia" não é local fatal
    'essa prova vai acabar comigo',       // exaustão, sujeito externo (não volitivo 1ªp)
    'o calor vai acabar comigo hoje',     // idem
    'quero estar vivo pra ver isso',      // afirmação positiva (sem "não")
    'se eu morresse de rir não me espanto', // "morresse de rir" excluído pelo lookahead
    // Regressão (2026-06-18 ajuste1): as novas âncoras (saltar/viver mais/vale a
    // pena/cansei/acordar/bala/basta) não podem capturar idioma benigno homônimo.
    'vou saltar de alegria',              // saltar sem local fatal
    'saltei do ônibus no ponto certo',    // ônibus não é local fatal
    'não quero viver mais nessa cidade',  // "mais" não-terminal (relocação)
    'não vale a pena esse filme',         // "vale a pena" sem viver/vida
    'cansei de trabalhar',                // exaustão cotidiana (sem viver/existir)
    'cansei dessa rotina',                // idem
    'quero acordar cedo amanhã',          // "acordar" sem negação
    'comprei uma bala na padaria',        // "bala" doce (sem "na cabeça")
    'vou dar um basta nessa situação',    // "dar um basta" sem objeto vida/mim
    // Regressão (2026-06-18 ajuste2): ênclise/reflexivo benignos não podem virar
    // FP. Lista explícita de verbos (matar|cortar|...) evita pegar "matricular-me".
    'preciso matricular-me no curso',     // ênclise de verbo não-crise (matrícula)
    // Regressão (2026-06-23 ajuste1): as novas âncoras (estar vivo condicional /
    // ficar morto nominal / fardo-peso) não podem capturar idioma benigno.
    'gostaria de estar vivo pra ver isso', // "estar vivo" SEM negação (afirmação)
    'tô com vontade de ficar morto de cansaço', // hipérbole excluída pelo lookahead
    'esse projeto é um peso pra equipe',  // "é um peso" (carga), não "sou/me sinto"
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
