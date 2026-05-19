/**
 * Narrativa procedural de evolução do DNA.
 *
 * Em vez de "passou de bebê para criança", a UI mostra:
 *  "Lulu desenvolveu o olhar mais atento essa semana"
 *
 * Frases SEMPRE positivas (sem culpa). Nunca usa vocabulário científico
 * ("DNA", "genoma", "mutação") com o usuário — fala em "ela cresceu",
 * "sua aura ficou", "os olhos ganharam".
 */

// Imports diretos dos módulos-fonte (não do barrel `./`) — evita require cycle
// `index.ts ↔ stories.ts`, que disparava warning em runtime e pode causar valores
// indefinidos durante eager evaluation.
import { GENE_KEYS } from './genome';
import type { Genome, GeneKey } from './genome';
import { dominantChange } from './habitToGene';

interface NarrativeContext {
  mascotName: string;
  prev: Genome;
  next: Genome;
  /** Quantos dias de hábitos cumpridos motivaram essa mudança. */
  daysOfCare?: number;
}

export interface DnaStory {
  /** Frase curta principal (até 100 chars). */
  headline: string;
  /** Detalhe complementar (até 200 chars). */
  body: string;
  /** Quote do mascote — para balão. Sempre positivo, sem cobrança. */
  quote: string;
  /** Gene que mais mudou — útil pra log/telemetry. */
  primaryGene: GeneKey | null;
  /** Delta normalizado [0..1]. */
  intensity: number;
}

const GENE_NARRATIVE: Record<GeneKey, { trait: string; quote: string; body: (name: string) => string }> = {
  empathy: {
    trait: 'olhar mais atento',
    quote: 'Eu te vejo.',
    body: (n) => `${n} ficou mais sensível ao que você está sentindo. Os olhos abriram um pouco mais.`,
  },
  curiosity: {
    trait: 'inquietação curiosa',
    quote: 'O que tem aí?',
    body: (n) => `${n} começou a olhar pra tudo. Antenas mais reativas.`,
  },
  creativity: {
    trait: 'forma mais surpreendente',
    quote: 'Olha o que eu virei.',
    body: (n) => `${n} ganhou uma forma menos previsível. Algo novo apareceu no corpo dela.`,
  },
  discipline: {
    trait: 'postura mais firme',
    quote: 'Aqui, presente.',
    body: (n) => `${n} encontrou um ritmo. Respiração mais constante, postura mais ereta.`,
  },
  chaos: {
    trait: 'energia mais solta',
    quote: 'Tô em movimento.',
    body: (n) => `${n} virou um pouco mais imprevisível. Não no mau sentido — só mais viva.`,
  },
  aggression: {
    trait: 'contorno mais definido',
    quote: 'Sei o que defendo.',
    body: (n) => `${n} ganhou contornos mais firmes. Não é briga — é presença.`,
  },
  resilience: {
    trait: 'base mais sólida',
    quote: 'Tô aqui, mesmo no silêncio.',
    body: (n) => `${n} adquiriu uma calma mais densa. Não se abala com pausas.`,
  },
  emotionalDepth: {
    trait: 'expressões mais nítidas',
    quote: 'Sinto também.',
    body: (n) => `${n} começou a expressar humores mais variados. Você nota nas cores sutis.`,
  },
  socialEnergy: {
    trait: 'aura mais quente',
    quote: 'Bom te ver.',
    body: (n) => `${n} ficou mais radiante. A aura ao redor dela ampliou.`,
  },
  adaptability: {
    trait: 'movimento mais fluido',
    quote: 'Pode mudar — eu acompanho.',
    body: (n) => `${n} aceitou mais o fluxo das coisas. Movimentos mais suaves entre estados.`,
  },
  intelligence: {
    trait: 'olhar mais profundo',
    quote: 'Tô observando.',
    body: (n) => `${n} começou a parecer que pensa antes de agir. Brilho dos olhos mais intenso.`,
  },
};

/** Gera uma micro-narrativa a partir do delta entre dois genomas. */
export function tellDnaStory(ctx: NarrativeContext): DnaStory | null {
  const change = dominantChange(ctx.prev, ctx.next);
  if (!change) return null;
  // Só narra mudanças "positivas" pra preservar o princípio sem culpa.
  if (change.delta <= 0) return null;
  const narr = GENE_NARRATIVE[change.gene];
  const intensity = Math.min(1, Math.abs(change.delta) * 4);
  const daysClause = ctx.daysOfCare
    ? ` Foram ${ctx.daysOfCare} dias de cuidado.`
    : '';
  return {
    headline: `${ctx.mascotName} ganhou ${narr.trait}`,
    body: narr.body(ctx.mascotName) + daysClause,
    quote: narr.quote,
    primaryGene: change.gene,
    intensity,
  };
}

/**
 * Fase emergente do DNA — substitui o enum fixo de phases legado,
 * mas mantém compatibilidade com `MascotPhase` mapeando.
 *
 * A fase é função da idade composta (média dos 4 genes que crescem
 * "naturalmente" — discipline, resilience, intelligence, emotionalDepth)
 * somada à phase legada (XP-driven).
 */
export function emergentMaturity(g: Genome): number {
  const sum =
    g.discipline +
    g.resilience +
    g.intelligence +
    g.emotionalDepth +
    g.empathy * 0.5 +
    g.adaptability * 0.5;
  // máximo teórico: 4*0.98 + 2*0.49 = 4.9; mínimo: 4*0.02 + 2*0.01 = 0.1
  return (sum - 0.1) / (4.9 - 0.1);
}
