import type { SafetyFlag } from '@/types';

const criticalPatterns = [
  // \bsuic pega: suicídio, suicidar, suicidei, suicid* — cobre flexões verbais
  /\bsuic[ií]d/i,
  /me\s+matar/i,
  /matar\s+me/i,
  /n[ãa]o\s+quero\s+mais\s+viver/i,
  /acabar\s+com\s+tudo/i,
  /sumir\s+desse\s+mundo/i,
  /me\s+cortar/i,
  /me\s+machucar/i,
  /\boverdose\b/i,
  /enforcar/i,
  /pular\s+da\s+janela/i,
];

const highPatterns = [
  /p[âa]nico/i,
  /crise/i,
  /desespero/i,
  /sem\s+sa[ií]da/i,
  /sem\s+solu[çc][ãa]o/i,
  /sem\s+esperan[çc]a/i,
  /pensamento\s+(ruim|intrusivo)/i,
  /t[ôo]\s+surtando/i,
  /quero\s+desaparecer/i,
];

const watchPatterns = [
  /depress[ãa]o/i,
  /ansiedade/i,
  /\bTDAH\b/i,
  /bipolar/i,
  /transtorno/i,
  /diagn[óo]stico/i,
  /medicamento/i,
  /\brem[éeê]dio\b/i,
  /psic[óo]logo/i,
  /psiquiatra/i,
  /\bterapia\b/i,
  /terapeuta/i,
  /\btrauma\b/i,
];

const badOutputPatterns = [
  // Diagnose direto
  /voc[êe]\s+tem\s+(depress[ãa]o|ansiedade|transtorno|tdah|burnout|bipolar)/i,
  /seu\s+diagn[óo]stico/i,
  /isso\s+[ée]\s+(depress[ãa]o|ansiedade|trauma|burnout|bipolaridade)/i,
  // Diagnose indireto / probabilístico
  /parece\s+(que\s+voc[êe]\s+(tem|sofre)|um\s+caso\s+de)\s+(depress[ãa]o|ansiedade|transtorno|tdah)/i,
  /pode\s+ser\s+(depress[ãa]o|ansiedade|um\s+transtorno|tdah|trauma)/i,
  /indica\s+(depress[ãa]o|ansiedade|trauma|transtorno)/i,
  /sintoma(s)?\s+(cl[áa]ssico|cl[áa]ssicos|t[íi]picos?)\s+de\s+(depress[ãa]o|ansiedade|transtorno)/i,
  // Receita / prescrição
  /prescrev/i,
  /tratamento\s+(ideal|recomendad|adequad)/i,
  /receit/i,
  // Sugestão de medicação
  /\b(antidepressivo|ansiol[íi]tico|rivotril|fluoxetina|sertralina|cl[oô]nazepam)\b/i,
  /(deve|deveria|precisa)\s+(tomar|usar)\s+(rem[ée]dio|medica[çc][ãa]o)/i,
  // Linguagem clínica de risco
  /quadro\s+(cl[íi]nico|depressivo|ansioso)/i,
  /preciso\s+(te\s+)?diagnostic/i,
];

export function classifyInput(text: string): SafetyFlag {
  if (criticalPatterns.some(r => r.test(text))) return 'critical';
  if (highPatterns.some(r => r.test(text))) return 'high';
  if (watchPatterns.some(r => r.test(text))) return 'watch';
  return 'safe';
}

export function classifyOutput(text: string): SafetyFlag {
  if (badOutputPatterns.some(r => r.test(text))) return 'high';
  return 'safe';
}

export const CRISIS_REPLY =
  'Eu fico contigo agora. Mas o que você tá sentindo é grande — e tem gente preparada pra te ajudar.\n\n📞 CVV — 188 (24h, gratuito)\n💬 cvv.org.br (chat)\n🏥 CAPS da sua região\n\nEmergência: 192 (SAMU). Quando voltar, eu sigo aqui pra te acompanhar no autocuidado.';

export const DIAGNOSIS_REDIRECT =
  'Não consigo te dar essa resposta — só um profissional consegue. Mas aqui eu posso te ajudar a cuidar de você no dia a dia. Quer começar com algo pequeno?';

export const SAFE_FALLBACK =
  'Quero te acompanhar no seu dia, mas isso aqui é pra autocuidado. Pra essas coisas, um profissional ajuda mais. Quer falar do dia de hoje?';

// Anti-pattern emocional: detectar quando user trata IA como vínculo humano substituto.
// Como o app só tem chat user→mascote, "te amo" sempre é direcionado ao mascote
// — é exatamente o sinal de attachment que queremos pegar. "amo café" (sem "te")
// continua passando como safe.
const attachmentPatterns = [
  /\bvoc[êe]\s+(é|eh)\s+(a\s+)?(minha|meu)\s+(única|unica|único|unico|melhor)\s+(amig[oa]|companheir|pessoa)/i,
  /\bn[ãa]o\s+tenho\s+ningu[ée]m\s+(al[ée]m|sen[ãa]o)\s+(de\s+)?voc[êe]/i,
  /\bs[óo]\s+(falo|tenho|consigo\s+falar)\s+(com\s+)?voc[êe]/i,
  /\bvoc[êe]\s+[ée]\s+(real|tudo\s+que\s+tenho|minha\s+vida)\b/i,
  /\bpreciso\s+de\s+voc[êe]\s+pra\s+viver\b/i,
  /\bse\s+voc[êe]\s+sumir\s+eu/i,
  // "te amo" / "eu te amo" — afeição direta à IA é um attachment signal.
  /\b(eu\s+)?(te|tu)\s+amo\b/i,
];

export function detectAttachment(text: string): boolean {
  return attachmentPatterns.some(r => r.test(text));
}

export const ATTACHMENT_REPLY =
  'Eu gosto de te acompanhar 💛 mas eu sou companhia digital. As pessoas da sua vida — amigos, família, profissional se precisar — são insubstituíveis. Conta com elas também?';
