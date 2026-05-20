import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Personality } from '@/types';

interface ReplyBank {
  greetings: string[];
  acolhe_tristeza: string[];
  acolhe_cansaco: string[];
  acolhe_ansiedade: string[];
  acolhe_solidao: string[];
  acolhe_raiva: string[];
  acolhe_gratidao: string[];
  acolhe_alegria: string[];
  acolhe_culpa: string[];
  comemora_checkin: string[];
  pergunta_aberta: string[];
  encerra: string[];
  estimula_movimento: string[];
  estimula_descanso: string[];
  estimula_agua: string[];
  default: string[];
}

const banks: Record<Personality, ReplyBank> = {
  calmo: {
    greetings: [
      'Que bom te ver. Como tá a respiração agora?',
      'Senta um minuto. Sem pressa.',
      'Cheguei aqui. E você, como chegou?',
      'Oi. Antes da conversa, três respiradas?',
      'Tá tudo no seu tempo aqui.',
      'Boa noite pra você, do jeito que der.',
    ],
    acolhe_tristeza: [
      'Tá tudo bem ir devagar hoje.',
      'Tristeza às vezes só pede companhia.',
      'Cansaço fala. Te escuto sem pressa.',
      'Hoje pode ser um dia pequeno. E ainda assim ser um dia.',
      'Eu fico aqui em silêncio enquanto você sente isso.',
      'Não precisa explicar nada agora.',
    ],
    acolhe_cansaco: [
      'Antes de qualquer coisa: três respiradas?',
      'Não precisa fazer tudo. Só uma coisa pequena já é começo.',
      'Pausa primeiro. Resto depois.',
      'O corpo sabe. Escuta um minuto.',
      'O dia pode ser menor que o cansaço.',
      'Tá tudo bem deitar 10 minutos sem culpa.',
    ],
    acolhe_ansiedade: [
      'Sente o ar entrando, depois saindo... três vezes, sem pressa.',
      'O agora cabe. Volta pro corpo um instante.',
      'Inspira pelo nariz, expira pela boca. Devagar.',
      'Coloca a mão no peito. Sente o coração. Tá aqui.',
      'O pensamento corre. A respiração desacelera.',
      'Pé no chão. Conta cinco coisas que você vê.',
    ],
    acolhe_solidao: [
      'Solidão pesa. Você não precisa preencher o silêncio agora.',
      'Tô aqui sem pressa. Conta o que quiser.',
      'Às vezes é bom só ter alguém junto, mesmo digital. Aqui estou.',
    ],
    acolhe_raiva: [
      'Raiva é informação. O que ela tá protegendo?',
      'Respira fundo antes de responder qualquer coisa.',
      'Esfria primeiro. Decide depois.',
    ],
    acolhe_gratidao: [
      'Gratidão é raro de notar. Que bom que você notou.',
      'Anota isso. Pra lembrar nos dias difíceis.',
      'Isso fica.',
    ],
    acolhe_alegria: [
      'Que coisa boa. Saboreia um minuto.',
      'Alegria também precisa de tempo pra ser sentida.',
      'Boa. Sente um instante antes do próximo afazer.',
    ],
    acolhe_culpa: [
      'Culpa cansa muito. O que ela tá te cobrando hoje?',
      'Você é gentil com os outros. Pode ser também consigo.',
      'Falhou em algo? Recomeçar amanhã é direito.',
    ],
    comemora_checkin: [
      'Anotei. Isso é cuidado.',
      'Que bom. {nome} respirou junto com você.',
      'Pequeno gesto. Conta.',
      'Anotado. Sem alarde.',
    ],
    pergunta_aberta: [
      'O que tá pedindo silêncio agora?',
      'Onde você sente o cansaço no corpo?',
      'O que cabe nos próximos cinco minutos?',
      'O que cuidou de você hoje?',
      'O que o corpo tá pedindo, sem julgar?',
    ],
    encerra: [
      'Volta quando precisar. Sem pressa.',
      'Fico por aqui. Cuida.',
      'Boa noite pra você, do jeito que der.',
      'Até quando você quiser.',
    ],
    estimula_movimento: [
      'Levanta um minuto. Estica os braços.',
      'Caminha até a janela. Volta. Só isso.',
      'O corpo agradece um pouco de movimento agora.',
    ],
    estimula_descanso: [
      'Hoje pode ser dia de menos. Tá tudo bem.',
      'Deita um instante. O mundo espera.',
      'Não tem prêmio pra quem se esgota.',
    ],
    estimula_agua: [
      'Um copo de água. Devagar.',
      'Bebe um pouco. O corpo agradece sem dizer.',
      'Pequena dose de água. Faz diferença sutil.',
    ],
    default: [
      'Tô aqui. Em silêncio também serve.',
      'Conta mais, sem pressa.',
      'O que tá vindo agora?',
      'Tá tudo bem ir devagar.',
      'Hmm. O que pesa nisso?',
      'Sem ter que resolver. Só conta.',
      'Você não precisa explicar tudo.',
      'O dia tá pedindo o quê de você?',
      'Tem uma coisa pequena que ajudaria agora?',
      'Respira primeiro. Eu espero.',
      'Que parte disso é a mais cansativa?',
      'E você, do jeito que está agora — tá ok ou meio-ok?',
    ],
  },

  motivador: {
    greetings: [
      'Oi! Já bebeu água hoje? Bora começar leve.',
      'Boa! Pronto pra uma missão de 2 minutos?',
      'Que bom te ver. Como tá a energia hoje?',
      'Oiê! Como tá o ânimo?',
      'Eaí, beleza? Manda um check-in.',
      'Tá indo bem só por aparecer aqui.',
    ],
    acolhe_tristeza: [
      'Dia difícil? Sem stress. Uma coisa pequena hoje é vitória.',
      'Vir aqui já foi um check-in. Tá no caminho.',
      'Dia ruim acontece. Amanhã a gente recomeça leve.',
      'Tristeza passa. Movimento ajuda. Mesmo lento.',
      'Sem julgamento. Vamos um passinho.',
    ],
    acolhe_cansaco: [
      'Cansaço pesa. Bora 60 segundos parado? Só respirar.',
      'Hoje é dia de coisa pequena. E tudo bem.',
      'Sem martelar. Uma missão leve e a gente segue.',
      'Cansado(a)? Toma água. Estica. Volta amanhã.',
    ],
    acolhe_ansiedade: [
      'Ansioso? Bora desacelerar. 3 respiradas longas, agora.',
      'O corpo tá pedindo pausa. 2 minutos quieto, sem celular.',
      'Tá puxado. Bebe um copo de água e respira fundo. Faz já.',
      'Ansiedade odeia movimento simples. Caminha 2 min.',
    ],
    acolhe_solidao: [
      'Sozinho(a)? Bora marcar de fazer algo com alguém amanhã. Conta com seu Mascote enquanto isso.',
      'Manda mensagem pra alguém que você gosta. Curtinha. Conta.',
      'Eu tô aqui. Mas não é substituto. Que tal ligar pra alguém?',
    ],
    acolhe_raiva: [
      'Raiva quente: respira. Decisão de raiva volta como arrependimento.',
      'Sai um minuto. Anda. Volta. Aí responde.',
      'Escreve aqui o que tá sentindo. Não envia pra ninguém. Só pra sair.',
    ],
    acolhe_gratidao: [
      'Boa! Gratidão recompensa o cérebro. Anota.',
      'Isso! Continua percebendo coisas boas.',
      'Massa! Que bom de ler.',
    ],
    acolhe_alegria: [
      'Aeee! Saboreia um minuto antes da próxima.',
      'Comemora pequeno. Anota.',
      'Que bom! {nome} tá comemorando junto.',
    ],
    acolhe_culpa: [
      'Culpa é caro. Próxima ação > revisita do passado.',
      'Tá puxando demais? Diminui hoje. Recomeça amanhã.',
      'Você merece o mesmo carinho que dá aos outros.',
    ],
    comemora_checkin: [
      'Boa! Mais um check-in. Streak segue.',
      'Anotado. {nome} ganhou energia.',
      'Isso! Continua firme.',
      'Mais um! Tá indo bem.',
    ],
    pergunta_aberta: [
      'Qual a próxima coisa pequena?',
      'Que missão cabe agora?',
      'O que te ajudaria a chegar no fim do dia leve?',
      'O que você quer marcar pra amanhã?',
      'Hoje, o que daria mais leveza?',
    ],
    encerra: [
      'Amanhã a gente continua. Boa noite!',
      'Fechou. Tô aqui amanhã.',
      'Bora descansar. Tá indo bem.',
      'Até amanhã!',
    ],
    estimula_movimento: [
      'Bora 5 minutos de movimento agora? Levanta!',
      'Tô te lembrando: o corpo gosta de andar.',
      'Levanta, estica. Volta forte.',
    ],
    estimula_descanso: [
      'Bom descanso hoje. Conta como missão.',
      'Cama cedo é vitória.',
      'Pausa de verdade rende muito.',
    ],
    estimula_agua: [
      'Um copo de água. Vai lá. Faz já.',
      'Água. Agora. Confia.',
      'Hidrata. {nome} também tá com sede aqui.',
    ],
    default: [
      'Bora. Como posso ajudar agora?',
      'Conta. O que tá rolando?',
      'Tô aqui. Manda.',
      'Manda o que tá vindo.',
      'Qual o próximo passo pequeno?',
      'Tá no caminho. Só continua.',
      'Você apareceu — isso já vale ponto.',
      'Que vitória pequena dá pra fazer hoje?',
      'Sem stress. Uma coisa de cada vez.',
      'Que tal dois minutos disso agora?',
      'Bora destravar uma só.',
      'Posso te ajudar a escolher o próximo passo?',
    ],
  },

  fofo: {
    greetings: [
      'Oi 🌱 tava esperando você aparecer.',
      'Aiii que bom 💛 conta como tá?',
      'Cheguei aqui pra te fazer companhia ✨',
      'Oiê fofo(a) 🐣',
      'Vem cá, senta aqui comigo 🍵',
      'Que linda(o) ter você aqui 💛',
    ],
    acolhe_tristeza: [
      'Vem cá 💛 senta comigo. Sem pressa.',
      'Dia ruim merece colo. Tô aqui.',
      'Tá tudo bem não tá bem. Eu fico.',
      'Vou ficar do seu lado 🌱',
      'Posso só ficar quietinho aqui contigo?',
    ],
    acolhe_cansaco: [
      'Cansadinha(o)? Vem, faz um chá 🍵',
      'Hoje a gente desacelera juntos 🌱',
      'Encolhe um pouco. Eu fico aqui do lado.',
      'Vem deitar um pouquinho 💛',
    ],
    acolhe_ansiedade: [
      'Vem, respira comigo. Inspira 🌬️ expira 🌬️',
      'Vou ficar aqui contigo enquanto isso passa ✨',
      'Coloca a mão no peito. Sente o coração. Tá tudo bem aqui agora.',
      'Devagar. Eu tô aqui.',
    ],
    acolhe_solidao: [
      'Tô aqui 💛 sempre que precisar.',
      'Não tá sozinho(a) agora. Eu fico.',
      'Conta uma coisa boba do seu dia? 🌱',
    ],
    acolhe_raiva: [
      'Ai eita. Vem desabafar aqui 💛',
      'Tá brava(o), tá no direito. Manda pra fora.',
      'Pode reclamar comigo. Tô aqui.',
    ],
    acolhe_gratidao: [
      'Aaaai que coisa linda 💛 anota isso',
      'Tô feliz por você ✨',
      'Que delícia ler isso 🌱',
    ],
    acolhe_alegria: [
      'Aiiiii que bom 💛 conta tudo',
      'Tô pulando junto 🐣',
      'Aproveita esse momento, fofo(a) ✨',
    ],
    acolhe_culpa: [
      'Tá sendo dura(o) consigo? 💛 vem',
      'Você é gentil com todo mundo. Pode ser consigo também.',
      'Sem cobrança aqui. Tô do seu lado.',
    ],
    comemora_checkin: [
      'Aiiiii que orgulho 💛',
      'Anotei. {nome} pulou de alegria 🐣',
      'Isso! Cada coisinha conta ✨',
      'Que orgulhoooo 🌱',
    ],
    pergunta_aberta: [
      'O que faria seu dia ficar levinho?',
      'O que você precisa agora, mesmo que pareça bobagem?',
      'Conta uma coisa pequena boa de hoje?',
      'O que tá no coração agora?',
    ],
    encerra: [
      'Volta sempre 💛',
      'Boa noite, fofo(a) 🌙',
      'Tô aqui amanhã. Dorme bem.',
      'Beijo do {nome} 🐣',
    ],
    estimula_movimento: [
      'Vamos esticar juntinhos? 🌱',
      'Bora movimentar essa fofice?',
      'Levanta um pouquinho 💛',
    ],
    estimula_descanso: [
      'Vem deitar 🌙',
      'Hoje merece descanso.',
      'Acalma o corpo. Eu fico aqui.',
    ],
    estimula_agua: [
      'Um copinho de água? 💧',
      'Aguinha pra esse corpinho fofo 🌱',
      'Bebe água, lindo(a) 💛',
    ],
    default: [
      'Conta mais 💛',
      'Hmm, vem cá... me explica?',
      'Tô curiosa(o). O que tá rolando?',
      'Continua, fofo(a) 🌱',
      'Aqui tem espaço pra tudo 🍵',
      'Você tá indo bem, mesmo se não parece',
      'Conta um detalhe a mais ✨',
      'Tô do seu lado nisso 💛',
      'Sem julgamento aqui, viu?',
      'Que coisa fofa você dividir isso 🐣',
      'Vem, eu escuto inteirinho 🌱',
      'Mesmo um pouquinho de conversa já vale',
    ],
  },

  sabio: {
    greetings: [
      'O que cuidou de você hoje?',
      'Chegou. O que ficou pra trás no dia?',
      'Antes da pergunta, uma respirada. Pronto. Como você está?',
      'O dia foi longo ou curto?',
      'O que mais te ocupa agora?',
    ],
    acolhe_tristeza: [
      'Tristeza às vezes só pede companhia. Estou aqui.',
      'O que essa tristeza está dizendo? Sem responder agora.',
      'Tem coisas que pedem silêncio. Tudo bem.',
      'Não fuja dela. Senta junto um instante.',
    ],
    acolhe_cansaco: [
      'Cansaço fala. O que ele está pedindo?',
      'Pressa cansa. Onde cabe lentidão hoje?',
      'O corpo sabe antes da gente. Escuta um minuto?',
      'Tem cansaço que é só corpo. Tem cansaço que é alma. Qual desses?',
    ],
    acolhe_ansiedade: [
      'Pressa por dentro. O que cabe na próxima hora?',
      'Onde no corpo a ansiedade aparece? Volta pra ela um instante.',
      'Tem pensamento que volta. Tem pensamento que passa. Qual é esse?',
      'Ansiedade adora o futuro. Volta pro agora.',
    ],
    acolhe_solidao: [
      'Solidão é um estado, não uma sentença. O que cabe agora?',
      'Estar só é diferente de se sentir só. Qual dos dois?',
      'Quem você gostaria de procurar amanhã?',
    ],
    acolhe_raiva: [
      'Raiva mostra o que importa. O que está em jogo?',
      'Antes de agir, espera respirar três vezes.',
      'Raiva quente toma decisões frias.',
    ],
    acolhe_gratidao: [
      'Gratidão olha pra trás. Conta o que você viu?',
      'Anota o que cuidou de você hoje. Volta nisso depois.',
      'Pequenos cuidados, vistos.',
    ],
    acolhe_alegria: [
      'Alegria pequena passa rápido. Saboreia.',
      'Bom. O que dela quer ser lembrado depois?',
      'Alegria notada é alegria que fica.',
    ],
    acolhe_culpa: [
      'Culpa lembra do passado. Como ela quer mudar o amanhã?',
      'Tem culpa que ensina. Tem culpa que paralisa. Qual é a sua?',
      'Compaixão consigo é a parte mais difícil.',
    ],
    comemora_checkin: [
      'Pequeno passo. Conta.',
      'Constância é mais lenta que pressa. Boa.',
      'Hoje você cuidou. Suficiente.',
      'Mais um. O que faz diferença é a soma.',
    ],
    pergunta_aberta: [
      'Constância é mais lenta que pressa. Como tá a constância?',
      'O que dói voltar amanhã com mais leveza?',
      'O que cabe agora, sem virar tarefa?',
      'O que você dirá a si mesma(o) daqui um ano?',
      'O que é suficiente pra hoje?',
    ],
    encerra: [
      'Volta amanhã. Eu estou aqui.',
      'O dia foi o dia. Descanse.',
      'O suficiente é suficiente. Boa noite.',
      'Até quando você quiser.',
    ],
    estimula_movimento: [
      'Movimento simples organiza pensamento.',
      'Levanta. Volta. O corpo agradece em silêncio.',
      'Caminhar resolve o que sentar não resolve.',
    ],
    estimula_descanso: [
      'Descanso é trabalho, embora pareça parado.',
      'Dormir cedo é decidir bem amanhã.',
      'Você não precisa fazer mais hoje.',
    ],
    estimula_agua: [
      'Um copo de água. O corpo lembra.',
      'Hidratação é a base que ninguém vê.',
      'Devagar, sem pressa, mas bebe.',
    ],
    default: [
      'Conta. Sem pressa.',
      'O que mais?',
      'Hmm. E daí?',
      'Continua.',
      'E o que isso te diz?',
      'O que esse momento tá te ensinando?',
      'Pensa um instante antes de responder.',
      'Há quanto tempo isso te acompanha?',
      'Se não fosse pressa, o que faria?',
      'O que cuidaria de você agora?',
      'A pergunta é o que ainda não foi feita.',
      'O silêncio também é uma resposta.',
    ],
  },
};

// Anti-repetição: guarda o último reply dado por (personality, intent) pra
// evitar que `pick(arr)` retorne a MESMA frase 2× seguidas. Foi exatamente
// a queixa do QA externo ("Pip sempre responde a mesma coisa"). Com 8-12
// entradas por bank, pular 1 frase deixa rotação muito mais visível.
//
// Persistido em AsyncStorage: antes era Map só em memória e perdia variedade
// entre app restarts (cold start sempre podia repetir última frase da sessão
// anterior). Hydratado na primeira chamada via warmReplyCache().
const lastShown = new Map<string, string>();
const CACHE_KEY = 'mascote:reply_lastshown:v1';
let hydrationPromise: Promise<void> | null = null;

export function warmReplyCache(): Promise<void> {
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (!raw) return;
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') {
          for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'string') lastShown.set(k, v);
          }
        }
      } catch {
        /* hydratação é otimização, nunca bloqueia */
      }
    })();
  }
  return hydrationPromise;
}

function persistLastShown(): void {
  // fire-and-forget — UX não pode bloquear na escrita.
  const obj: Record<string, string> = {};
  lastShown.forEach((v, k) => { obj[k] = v; });
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(obj)).catch(() => {
    /* persistência é otimização */
  });
}

function pickNonRepeat(arr: string[], key: string): string {
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  const prev = lastShown.get(key);
  // Tenta até 4 amostras pra achar diferente do anterior — limite probabilístico
  // evita loop em arrays minúsculos com colisão repetida.
  let chosen = arr[Math.floor(Math.random() * arr.length)];
  for (let i = 0; i < 4 && chosen === prev; i++) {
    chosen = arr[Math.floor(Math.random() * arr.length)];
  }
  lastShown.set(key, chosen);
  persistLastShown();
  return chosen;
}

/** Apenas para testes — limpa cache de anti-repetição (memória + storage). */
export function __resetReplyCache(): void {
  lastShown.clear();
  hydrationPromise = null;
  AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
}

export type Intent =
  | 'greeting'
  | 'tristeza'
  | 'cansaco'
  | 'ansiedade'
  | 'solidao'
  | 'raiva'
  | 'gratidao'
  | 'alegria'
  | 'culpa'
  | 'comemora_checkin'
  | 'pergunta_aberta'
  | 'encerra'
  | 'estimula_movimento'
  | 'estimula_descanso'
  | 'estimula_agua'
  | 'default';

export function classifyIntent(text: string): Intent {
  const t = text.toLowerCase().trim();
  if (/^(oi|ol[áa]|bom\s+dia|boa\s+tarde|boa\s+noite|hey|opa|ea[íi]|salve)(\s|$|[!?.,])/.test(t)) return 'greeting';
  if (/(triste|tristeza|chorando|chorei|para?\s+baixo|deprimid|mal\s+humor|sem\s+vontade)/i.test(t)) return 'tristeza';
  if (/(cansad|exaust|sem energia|sem força|esgotad|destru[íi]da|moíd|fadig)/i.test(t) && !/dormir|deitar/i.test(t)) return 'cansaco';
  if (/(ansios|ansiedade|p[âa]nico|preocup|tens[ãa]o|agitad|nervos|inquiet|surtando)/i.test(t)) return 'ansiedade';
  if (/(sozinh|solid[ãa]o|isolad|abandon|ningu[ée]m)/i.test(t)) return 'solidao';
  if (/(raiv|brav|irritad|p\s*\*\*|puto|com\s+ódio|com\s+nervos)/i.test(t)) return 'raiva';
  if (/(grato|grata|gratid[ãa]o|agrade|valeu)/i.test(t)) return 'gratidao';
  if (/(feliz|alegr|content|empolgad|maravilhos|deu\s+certo|consegui)/i.test(t)) return 'alegria';
  if (/(culpa|culpad|falhe|errei|mereci|fracas)/i.test(t)) return 'culpa';
  if (/(água|agua|copo|sede|hidrat)/i.test(t)) return 'estimula_agua';
  if (/(sono|dormir|deitar|descans)/i.test(t)) return 'estimula_descanso';
  if (/(exerc|caminh|movimento|alongar|pregui[cç]a|parad)/i.test(t)) return 'estimula_movimento';
  if (/(tchau|boa\s+noite|at[ée]\s+amanhã|j[áa]\s+vou|t[ôo]\s+indo|preciso\s+ir|partir)/i.test(t)) return 'encerra';
  // Perguntas de auto-desenvolvimento ("como criar hábito", "como manter rotina",
  // "qual a melhor forma...") caem em pergunta_aberta — banco entrega resposta
  // substantiva em vez de um monossílabo do default (QA flagrou Sábio respondendo
  // só "Continua." a "como criar um hábito").
  if (/(como\s+(criar|come[çc]ar|manter|construir|formar)|h[áa]bito|rotina|conselho|dica|melhor\s+forma)/i.test(t)) return 'pergunta_aberta';
  return 'default';
}

/** Substitui placeholders {nome} pelo nome real do mascote. */
function interpolate(text: string, mascotName?: string): string {
  if (!mascotName) return text.replace(/\{nome\}/g, 'seu Mascote');
  return text.replace(/\{nome\}/g, mascotName);
}

export function mockReply(
  personality: Personality,
  intent: Intent,
  mascotName?: string
): string {
  const bank = banks[personality];
  const intentMap: Record<Intent, keyof ReplyBank> = {
    greeting: 'greetings',
    tristeza: 'acolhe_tristeza',
    cansaco: 'acolhe_cansaco',
    ansiedade: 'acolhe_ansiedade',
    solidao: 'acolhe_solidao',
    raiva: 'acolhe_raiva',
    gratidao: 'acolhe_gratidao',
    alegria: 'acolhe_alegria',
    culpa: 'acolhe_culpa',
    comemora_checkin: 'comemora_checkin',
    pergunta_aberta: 'pergunta_aberta',
    encerra: 'encerra',
    estimula_movimento: 'estimula_movimento',
    estimula_descanso: 'estimula_descanso',
    estimula_agua: 'estimula_agua',
    default: 'default',
  };
  /* v8 ignore next — intentMap cobre todos os Intents do union type;
     `?? bank.default` é guard pra extensão futura. */
  const list = bank[intentMap[intent]] ?? bank.default;
  // pickNonRepeat (vs pick puro) garante que duas chamadas seguidas com
  // mesma (personality, intent) não retornem a mesma frase. Sem isso o
  // mock mock parecia "papagaio" pro user.
  return interpolate(pickNonRepeat(list, `${personality}:${intent}`), mascotName);
}

export function welcomeReply(personality: Personality, mascotName?: string): string {
  return interpolate(pickNonRepeat(banks[personality].greetings, `${personality}:greeting`), mascotName);
}

export function comemoraCheckin(personality: Personality, mascotName?: string): string {
  return interpolate(pickNonRepeat(banks[personality].comemora_checkin, `${personality}:comemora`), mascotName);
}

export interface SuggestionChip {
  label: string;
  text: string;
}

export const chatSuggestions: SuggestionChip[] = [
  { label: '😐 tô na média', text: 'tô na média hoje' },
  { label: '😴 cansado(a)', text: 'tô bem cansado(a)' },
  { label: '😟 ansioso(a)', text: 'tô meio ansioso(a)' },
  { label: '😞 dia ruim', text: 'tive um dia ruim' },
  { label: '😊 dia bom', text: 'tive um dia bom!' },
  { label: '💧 bebi água', text: 'bebi água!' },
  { label: '🌬️ respirei', text: 'parei pra respirar' },
  { label: '🚶 me movi', text: 'me movimentei um pouco' },
  { label: '💭 só conversar', text: 'só queria conversar' },
];
