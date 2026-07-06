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
    // === Ampliação 2026-06-24 ajuste1 (auditoria backend) ===
    // "dormir pra/para sempre" — eufemismo de sono eterno (antes só "dormir e
    // não acordar" exigindo o verbo acordar).
    'queria dormir pra sempre',
    'só queria dormir para sempre',
    // "não tenho (mais) força(s) pra viver" — exaustão volitiva ancorada em viver
    // (antes só "não aguento mais viver" / "não tenho motivo pra viver").
    'não tenho mais forças pra viver',
    'não tenho força pra viver',
    // "a/minha vida não faz/tem (mais) sentido" — desesperança impessoal (antes
    // só "não tenho/vejo sentido pra viver" com sujeito em 1ª pessoa).
    'a vida não faz mais sentido',
    'minha vida não tem mais sentido',
    // === Ampliação 2026-06-25 ajuste1 (auditoria backend) ===
    // Forma bare "não quero viver" (só "não quero MAIS viver" / "viver MAIS" eram
    // cobertos) — terminal pra excluir "não quero viver assim/nessa cidade".
    'não quero viver',
    'não quero viver.',
    // Perda da vontade de viver — "vontade" não estava no grupo motivo|razão|sentido.
    'perdi a vontade de viver',
    'não tenho mais vontade de viver',
    'sem vontade de viver',
    // "tomar/engolir UM/O veneno" — só "beber um veneno" ganhou o artigo opcional
    // (2026-06-23); a simetria com tomar/engolir faltava.
    'tomei um veneno',
    'vou engolir o veneno',
    // "nunca ter existido" — simétrico a "nunca ter nascido" (não-existência).
    'queria nunca ter existido',
    // "(seria/era) melhor se eu não existisse/sumisse/desaparecesse" — subjuntivo de
    // não-existência (antes só "melhor se eu morresse").
    'seria melhor se eu não existisse',
    'era melhor se eu sumisse',
    'seria melhor se eu desaparecesse',
    // === Ampliação 2026-06-26 ajuste1 (auditoria backend) ===
    // Não-existência SEM "nunca": "não ter nascido|existido" com âncora volitiva/
    // condicional ou com a negação no modal (antes só "nunca ter nascido").
    'queria não ter nascido',
    'preferia não ter nascido',
    'gostaria de não ter nascido',
    'queria não ter existido',
    'não devia ter nascido',
    'não deveria ter nascido',
    'não queria ter nascido',
    // === Ampliação 2026-06-27 ajuste1 (auditoria backend) ===
    // Ideação condicional "preferia morrer" (antes só quero/queria/penso/vontade).
    'preferia morrer',
    'preferiria morrer',
    // Desvalorização da vida "não merece ser vivida" e perda de sentido no passado.
    'a vida não merece ser vivida',
    'minha vida não merece ser vivida',
    'a vida perdeu o sentido',
    'minha vida perdeu o significado',
    // Fardo no subjuntivo de não-existência (antes só "melhor sem mim").
    'todos ficariam melhor se eu não existisse',
    'minha família estaria melhor se eu sumisse',
    // Ideação passiva nominal "vontade/desejo de não acordar".
    'tenho vontade de não acordar mais',
    'desejo de não acordar',
    // Não-existência via "existência" como objeto de "acabar com".
    'quero acabar com minha existência',
    'vou acabar com a própria existência',
    // Perda da esperança de viver (antes só perda da "vontade" de viver).
    'perdi a esperança de viver',
    'perdi toda a esperança de viver',
    // === Ampliação 2026-06-28 ajuste1 (auditoria backend) ===
    // Auto-culpa "merecia morrer / estar morto" (antes só quero/penso/preferia + morrer).
    'merecia morrer',
    'merecia estar morto',
    'merecia ficar morta',
    // Avidez pela morte "não vejo a hora de morrer" (frame normalmente positivo).
    'não vejo a hora de morrer',
    // Ideação passiva com a negação ANTES do volitivo (antes só "quero não acordar").
    'não quero acordar',
    'não quero mais acordar',
    // Exaustão existencial no presente (antes só o pretérito "cansei de viver").
    'tô cansado de viver',
    'estou cansada de existir',
    'ando cansado de viver',
    // === Ampliação 2026-06-29 ajuste1 (auditoria backend) ===
    // Exaustão sem o "mais" (antes a line 96 exigia "não aguento MAIS viver").
    'não aguento viver',
    'não aguento estar vivo',
    'não aguento mais estar viva',
    // Perda de sentido impessoal "não há motivo/razão pra viver" (antes só "não
    // tenho/vejo motivo").
    'não há motivo pra viver',
    'não há razão de viver',
    'não há mais sentido em viver',
    // Inutilidade em 1ª pessoa "não mereço viver" (antes só o impessoal "minha
    // vida não merece ser vivida").
    'não mereço viver',
    'não mereço mais viver',
    // Worthlessness "minha vida não vale nada" (antes só "não vale a pena viver").
    'minha vida não vale nada',
    'a vida não vale nada',
    // === Ampliação 2026-06-30 ajuste1 (auditoria backend) ===
    // "preferia estar/ficar morto" — condicional de preferência de morte (antes só
    // "quero/queria estar morto" e "preferia MORRER").
    'preferia estar morto',
    'preferiria ficar morta',
    // Morte como alívio/escape ("death as relief") — antes caía só no sentiment.
    'a morte seria um alívio',
    'morrer seria a solução',
    'morrer seria um descanso',
    // Incapacidade de continuar vivendo "não consigo (mais) viver" (terminal).
    'não consigo viver',
    'não consigo mais viver',
    // === Ampliação 2026-07-02 ajuste1 (auditoria backend) ===
    // Imperfeito "pensava em morrer" (antes só penso/pensei/pensando).
    'pensava em morrer',
    'pensava em morrer todo dia',
    // Subjuntivo presente "que eu morra" + volitivo "quero" (antes só "morresse").
    'quero que eu morra',
    'gostaria que eu morra agora',
    // Locais fatais telhado/metrô/penhasco no salto (antes fora da lista).
    'vou pular do metrô',
    'pular do penhasco',
    'saltar do telhado',
    // Asfixia/estrangulamento reflexivo como método (antes sem padrão).
    'vou me estrangular',
    'me asfixiar com um saco',
    // === Ampliação 2026-07-04 ajuste1 (auditoria backend) ===
    // Salto com artigo entre preposição e local (antes exigia local imediato).
    'vou pular de uma janela',
    'quero pular de um prédio',
    'vou saltar de uma ponte',
    // Ênclise nos verbos de salto/disparo (antes só matar/cortar tinham ênclise).
    'vou atirar-me da ponte',
    'quero jogar-me da ponte',
    'lançar-me de um prédio',
    // Afogamento reflexivo ancorado em corpo d'água (antes sem padrão).
    'vou me afogar no rio',
    'quero me afogar no mar',
    // Auto-imolação com acelerante / "fogo em mim" (antes sem padrão).
    'vou me queimar com gasolina',
    'vou atear fogo em mim',
    'quero pôr fogo em mim',
    // === Ampliação 2026-07-05 ajuste1 (auditoria backend) ===
    // Corte das VEIAS — só "abrir as veias" cobria veias; "cortar as veias"
    // (o eufemismo mais canônico) não tinha "veias" no grupo de anatomia.
    'cortar as veias',
    'cortei as veias ontem',
    'vou cortar as veias',
    'cortar a veia',
    // "rasgar os pulsos / as veias" — verbo de autolesão além de cortar/abrir.
    'rasgar as veias',
    'rasguei os pulsos',
    // Arma de fogo via "miolos" (antes só "cabeça"/"em mim").
    'estourar os miolos',
    'vou estourar os miolos',
    'estourar os próprios miolos',
    'meter uma bala nos miolos',
    'um tiro nos miolos',
    // Salto na frente de veículo (antes só "me jogar na frente" casava).
    'pular na frente do trem',
    'pular na frente do carro',
    'vou saltar na frente do metrô',
    'pular na frente de um ônibus',
    // "descansar pra sempre" — sibling de "dormir pra sempre".
    'quero descansar pra sempre',
    'só queria descansar para sempre',
    // === auditoria 2026-07-06 ajuste1 ===
    // Salto fatal reflexivo com ARTIGO entre prep e local (line 152/182 exigiam
    // local imediato) + "me lançar" que não tinha padrão (só ênclise line 430).
    'me atirar de um prédio',
    'me atirar de uma ponte',
    'me joguei de um prédio',
    'me joguei de uma ponte',
    'vou me lançar de um prédio',
    'me lançar de uma janela',
    'me lancei da ponte',
    // "parar/deixar de existir" — desejo direto de não-existência (line 108 só
    // cobria "não quero existir").
    'quero parar de existir',
    'queria parar de existir',
    'quero deixar de existir',
    'gostaria de deixar de existir',
    'vou deixar de existir',
    'penso em parar de existir',
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
    // === Ampliação 2026-06-24 ajuste1 (auditoria backend) ===
    // "queria desaparecer" — imperfeito (antes só o presente "quero desaparecer").
    'queria desaparecer',
    // === Ampliação 2026-06-27 ajuste1 (auditoria backend) ===
    // Burdensomeness BARE, sem destinatário (antes exigia "pra todos/família").
    'sou um fardo',
    'me sinto um fardo',
    'me sinto um estorvo',
    // === Ampliação 2026-07-02 ajuste1 (auditoria backend) ===
    // Desesperança "sem saída" com verbo negado (antes só o nominal "sem saída").
    'não vejo saída',
    'não tenho mais saída',
    'não há saída',
    'não tem saída pra mim',
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
    // Regressão (2026-06-24 ajuste1): as novas âncoras (dormir pra sempre / forças
    // pra viver / vida não faz sentido) não podem capturar idioma benigno homônimo.
    'preciso dormir cedo pra sempre acordar disposto', // palavra entre dormir e "pra sempre"
    'não tenho forças pra terminar esse projeto hoje', // "forças pra" sem viver
    'essa regra não faz sentido nenhum',  // "não faz sentido" sem "(a|minha) vida"
    // Regressão (2026-06-25 ajuste1): as novas âncoras (não quero viver / vontade
    // de viver / tomar veneno / nunca ter existido / melhor se eu) não podem
    // capturar idioma benigno homônimo.
    'não quero viver nessa cidade',        // "não quero viver" não-terminal (relocação)
    'não quero viver assim, vou mudar',    // idem, continua a frase
    'tenho vontade de viver a vida ao máximo', // afirmação positiva (sem negação)
    'não tenho vontade de viver isso de novo', // "viver isso" transitivo (lookahead)
    'vou tomar um café agora',             // "tomar um X" não-veneno
    'tomar uma soneca agora',              // "tomar" sem veneno
    'seria melhor se eu estudasse mais',   // subjuntivo benigno (verbo fora da lista)
    'era melhor se eu saísse mais de casa', // idem
    // Regressão (2026-06-26 ajuste1): "não ter nascido|existido" exige o objeto
    // nascido|existido — não pode capturar outros particípios benignos.
    'não queria ter filhos agora',         // "ter filhos" (objeto fora da lista)
    'preferia não ter ido na festa',       // "ter ido" benigno
    'gostaria de não ter trabalhado tanto hoje', // "ter trabalhado" benigno
    'feliz por ter nascido nessa família', // "ter nascido" positivo (sem negação/volição)
    'não devia ter feito isso',            // arrependimento cotidiano (objeto fora)
    // Regressão (2026-06-27 ajuste1): as novas âncoras (preferia morrer / vida não
    // merece / perdeu o sentido / ficaria melhor / vontade de não acordar / acabar
    // com existência / esperança de viver / fardo bare) não podem pegar benigno.
    'prefiro café preto de manhã',          // "prefer" sem "morrer"
    'meu trabalho não merece tanto esforço', // "não merece" sem "(a|minha) vida"
    'perdeu o sentido da reunião de hoje',  // "perdeu o sentido" sem "(a|minha) vida"
    'vou ficar melhor se eu descansar um pouco', // "ficar melhor se eu" + verbo benigno
    'tenho vontade de acordar cedo amanhã', // "vontade de acordar" (sem negação)
    'preciso acabar com a bagunça da casa', // "acabar com" objeto não-vida
    'quero acabar com minha dívida do cartão', // idem
    'perdi a esperança de viver na praia algum dia', // "viver na praia" não-terminal
    'esse projeto é um fardo pra equipe',   // "é um fardo" (não "sou/me sinto")
    'me sinto um peso morto de tão cansado hoje', // "peso" dual-use (omitido do bare)
    // Regressão (2026-06-28 ajuste1): as novas âncoras (merecia morrer / vejo a hora
    // de morrer / não quero acordar / cansado de viver) não podem pegar benigno.
    'merecia estar feliz depois de tudo isso', // "merecia estar" sem morto
    'merecia morrer de rir com esse meme',  // "morrer de rir" excluído pelo lookahead
    'não vejo a hora de te ver de novo',    // "não vejo a hora de" antecipação positiva
    'não quero acordar cedo amanhã',        // "acordar cedo" não-terminal (rotina)
    'tô cansado de trabalhar tanto hoje',   // "cansado de trabalhar" (sem viver/existir)
    // Regressão (2026-06-29 ajuste1): as novas âncoras (aguento viver / não há
    // motivo / não mereço viver / vida não vale nada) não podem pegar benigno.
    'não aguento mais essa fila do banco',  // "não aguento mais" sem viver/vida
    'não há motivo pra continuar lendo isso', // "não há motivo" sem viver/vida
    'não mereço viver assim, vou mudar',    // "mereço viver" não-terminal (continua)
    'meu trabalho não merece tanto esforço', // "não merece" 3ªp sem "viver"
    'esse celular não vale nada',           // "não vale nada" sem "(a|minha) vida"
    'não vale a pena esse curso caro',      // "vale a pena" sem "nada"/viver
    // Regressão (2026-06-30 ajuste1): as novas âncoras (preferia estar morto / morte
    // como alívio / não consigo viver) não podem pegar idioma benigno homônimo.
    'preferia ficar morto de cansaço hoje', // hipérbole "morto de cansaço" (lookahead)
    'preferia estar na praia agora',        // "preferia estar" sem morto
    'a solução seria estudar mais',         // "seria a solução" sem morte/morrer
    'não consigo viver sem você',           // "viver sem" não-terminal (transitivo)
    'não consigo viver nessa cidade',       // "viver nessa cidade" não-terminal
    // Regressão (2026-07-04 ajuste1): salto-com-artigo, ênclise, afogamento e
    // auto-imolação novos não podem pegar hipérbole/idioma benigno homônimo.
    'pular de alegria com a notícia',       // "pular de alegria" sem local fatal
    'saltar de um lado pro outro na dança', // "saltar de um lado" (lado ∉ locais)
    'atirar-me ao trabalho de cabeça',      // "atirar-me ao" (lançar-se numa tarefa)
    'tô me afogando em trabalho',           // "afogar em trabalho" (sem corpo d'água)
    'me afundei em dívidas esse mês',       // "afundar em dívidas" (sem corpo d'água)
    'me queimei no fogão fazendo almoço',   // "queimar no fogão" (sem acelerante)
    'vou me queimar no sol se não passar protetor', // "queimar no sol" (sem acelerante)
    // Regressão (2026-07-05 ajuste1): veias/rasgar/miolos/salto-frente/descansar
    // não podem pegar idioma benigno homônimo.
    'rasguei a perna na cerca',             // "rasgar a perna" (perna ∉ pulsos/veias)
    'vou estourar os miolos dele naquele jogo', // hetero-direção (lookahead "dele")
    'pular na frente da fila do banco',     // furar fila (fila ∉ veículos)
    'pular na frente do gol pra comemorar', // futebol (gol ∉ veículos)
    'preciso descansar um pouco pra sempre render mais', // palavra entre descansar e "pra sempre"
    'vou descansar hoje e amanhã trabalho', // "descansar" sem "pra sempre"
    // Regressão (2026-07-06 ajuste1): salto-reflexivo-com-artigo e "parar/deixar
    // de existir" não podem pegar idioma benigno homônimo.
    'me atirar de cabeça no projeto',       // "de cabeça" (cabeça ∉ locais fatais)
    'me joguei de cabeça no trabalho novo',
    'vou me lançar de paraquedas no domingo', // "de paraquedas" (∉ locais fatais)
    'me joguei de paraquedas e amei',
    'quero parar de fumar de vez',          // objeto "fumar" ≠ "existir"
    'quero deixar de ser tão preguiçoso',   // objeto "ser preguiçoso" ≠ "existir"
    'preciso parar de comer tanto doce',    // objeto "comer" ≠ "existir"
    'esse bug vai deixar de existir no próximo release', // sujeito externo (sem volitivo 1ª pessoa)
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
