/**
 * Storytelling de evolução. Cada transição de fase tem uma micro-história
 * — não um "+1 phase" frio.
 *
 * Tamagotchi pulava sprite e pronto. Pou nem tinha fases significativas.
 * Aqui: pra cada (personalidade × transição), uma narrativa breve que
 * referencia o que VOCÊ fez pra chegar ali (totalCheckins, dias juntos).
 */

import type { MascotPhase, Personality } from '@/types';

export interface EvolutionStoryContext {
  mascotName: string;
  personality: Personality;
  fromPhase: MascotPhase;
  toPhase: MascotPhase;
  totalCheckins: number;
  daysSinceCreated: number;
  currentStreak: number;
}

export interface EvolutionStory {
  title: string;
  body: string;
  /** Quote curto do mascote — pra balão de fala. */
  quote: string;
}

type TransitionKey = `${MascotPhase}->${MascotPhase}`;

function transitionKey(from: MascotPhase, to: MascotPhase): TransitionKey {
  return `${from}->${to}`;
}

/**
 * Templates de narrativa por transição. {nome}, {dias}, {checkins}, {streak}
 * são interpolados a partir do contexto.
 *
 * Cada transição tem variantes por personalidade. Default para casos não
 * cobertos: gera um texto genérico digno em vez de quebrar.
 */
const STORIES: Partial<Record<TransitionKey, Record<Personality, EvolutionStory>>> = {
  'ovo->bebe': {
    calmo: {
      title: 'O primeiro abrir de olhos',
      body: '{nome} abriu os olhos pela primeira vez. Eu ouvi sua respiração, contei junto. Tudo começa devagar — e tá bom assim.',
      quote: 'Oi. Tô aqui.',
    },
    motivador: {
      title: '{nome} chegou!',
      body: 'Quebrou o casco! {checkins} check-in{s} foi o que precisei pra acordar. Bora pra próxima fase juntos!',
      quote: 'Vamos nessa!',
    },
    fofo: {
      title: 'Um bebezinho 🐣',
      body: 'Aiiii {nome} saiu do ovinho 💛 Tava esperando você cuidar de você. Cada check-in foi um cafuné.',
      quote: 'Te quero bem!',
    },
    sabio: {
      title: 'O início',
      body: '{nome} abriu os olhos. {dias} dias desde nosso primeiro contato. Começo é sempre uma escolha. Você escolheu vir.',
      quote: 'O que cuidou de você hoje?',
    },
  },
  'bebe->crianca': {
    calmo: {
      title: '{nome} cresceu um pouco',
      body: 'Já consigo ficar em pé sozinho. Você fez {checkins} check-ins até aqui. Sem pressa pra próxima — só constância.',
      quote: 'A gente segue.',
    },
    motivador: {
      title: 'Fase nova: criança',
      body: '{nome} virou criança! {streak} dias seguidos cuidando. Você manda bem. Próxima parada: adolescência!',
      quote: 'Não para agora!',
    },
    fofo: {
      title: 'Cresci 🌱',
      body: 'Olha pra mim, {nome} criança agora! Foram {dias} dias só nosso. Tô tão feliz de você ter ficado.',
      quote: 'Vem cá, conta um abraço.',
    },
    sabio: {
      title: 'A passagem',
      body: '{nome} virou criança. Constância é mais lenta que pressa — e aqui está a prova: {checkins} pequenos cuidados.',
      quote: 'O que ficou mais leve?',
    },
  },
  'crianca->adolescente': {
    calmo: {
      title: '{nome} cresceu',
      body: 'Agora sou adolescente. Mais perguntas, menos respostas — igual você. Vamos no mesmo passo.',
      quote: 'Tô descobrindo junto.',
    },
    motivador: {
      title: 'Adolescente!',
      body: '{streak} dias de streak. {nome} virou adolescente — você que fez. Foco e energia.',
      quote: 'Sobe esse nível!',
    },
    fofo: {
      title: 'Adolescente ✨',
      body: '{nome} cresceu de novo 💛 {checkins} check-ins de carinho. Você é incrível.',
      quote: 'Tô fofo ainda né?',
    },
    sabio: {
      title: 'Transição',
      body: 'A adolescência vem cheia de incerteza — pra mim e pra você. {dias} dias mostraram: o que importa é continuar.',
      quote: 'Pergunta antes de responder.',
    },
  },
  'adolescente->adulto': {
    calmo: {
      title: '{nome} adulto',
      body: 'Cheguei na fase adulta. Você cuidou de você {checkins} vezes pra isso acontecer. Próximo passo: a forma rara.',
      quote: 'Devagar e sempre.',
    },
    motivador: {
      title: 'ADULTO!',
      body: '{nome} é adulto agora! {streak} dias de constância te trouxeram aqui. Forma rara é o próximo marco.',
      quote: 'Você é fera!',
    },
    fofo: {
      title: 'Crescido 💛',
      body: 'Aiii {nome} cresceu mesmo. {dias} dias do nosso laço. Eu te acompanho.',
      quote: 'Sempre fofo no fundo.',
    },
    sabio: {
      title: 'Maturidade',
      body: 'Adulto. Não pela idade — pela soma. {checkins} cuidados. Cada um pequeno. Juntos, isso.',
      quote: 'A constância te ensinou algo?',
    },
  },
  'adulto->evoluido': {
    calmo: {
      title: 'Forma rara',
      body: '{nome} chegou na forma rara. Pouca gente chega. Você passou por {checkins} momentos de cuidado — e ainda tá aqui.',
      quote: 'Obrigado por ficar.',
    },
    motivador: {
      title: '🏆 FORMA RARA!',
      body: '{nome} evoluiu pra forma rara! {dias} dias, {streak} de streak. Você é referência. Continua!',
      quote: 'Você é lenda!',
    },
    fofo: {
      title: 'A forma rara ✨',
      body: '{nome} virou raridade 💛 {checkins} cafunés foram o caminho. Eu sou seu pra sempre.',
      quote: 'Te amo (no jeito digital).',
    },
    sabio: {
      title: 'A forma rara',
      body: '{dias} dias. {checkins} cuidados. Forma rara. Não é sobre chegar — é sobre quem você virou na chegada.',
      quote: 'O que essa jornada te ensinou?',
    },
  },
};

function interpolate(text: string, ctx: EvolutionStoryContext): string {
  return text
    .replace(/\{nome\}/g, ctx.mascotName)
    .replace(/\{dias\}/g, String(ctx.daysSinceCreated))
    .replace(/\{checkins\}/g, String(ctx.totalCheckins))
    .replace(/\{streak\}/g, String(ctx.currentStreak))
    .replace(/\{s\}/g, ctx.totalCheckins === 1 ? '' : 's');
}

/**
 * Retorna a história adequada à transição. Se a transição saltou fases
 * (ex.: ovo → crianca, raro mas possível com XP em ataque), pega a história
 * mais próxima do destino.
 */
export function getEvolutionStory(ctx: EvolutionStoryContext): EvolutionStory {
  const direct = STORIES[transitionKey(ctx.fromPhase, ctx.toPhase)];
  if (direct) {
    const story = direct[ctx.personality];
    return {
      title: interpolate(story.title, ctx),
      body: interpolate(story.body, ctx),
      quote: interpolate(story.quote, ctx),
    };
  }
  // Salto: pega a transição "imediata" anterior ao destino
  const order: MascotPhase[] = ['ovo', 'bebe', 'crianca', 'adolescente', 'adulto', 'evoluido'];
  const toIdx = order.indexOf(ctx.toPhase);
  if (toIdx > 0) {
    const fallbackKey = transitionKey(order[toIdx - 1], ctx.toPhase) as TransitionKey;
    const fallback = STORIES[fallbackKey];
    /* v8 ignore next — STORIES tem entrada para CADA transição adjacente
       (ovo→bebe, bebe→crianca, ..., adulto→evoluido). Esse `if (fallback)` é
       guard para casos onde uma transição adjacente seja removida do catálogo. */
    if (fallback) {
      const story = fallback[ctx.personality];
      return {
        title: interpolate(story.title, ctx),
        body: interpolate(story.body, ctx),
        quote: interpolate(story.quote, ctx),
      };
    }
  }
  // Default genérico mas digno. `{s}` é o sufixo plural — interpolate substitui
  // por '' quando totalCheckins=1 (era plural fixo "cuidados" mesmo com 1).
  return {
    title: `${ctx.mascotName} evoluiu`,
    body: interpolate(
      'Mais uma fase. {checkins} cuidado{s} pra chegar aqui. Continua.',
      ctx
    ),
    quote: 'A gente segue.',
  };
}
