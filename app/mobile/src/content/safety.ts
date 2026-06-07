import type { SafetyFlag } from '@/types';

const criticalPatterns = [
  // \bsuic pega: suicídio, suicidar, suicidei, suicid* — cobre flexões verbais
  /\bsuic[ií]d/i,
  // Reflexivo em qualquer flexão: "me matar" (infinitivo), "me mato"/"me mata"
  // (presente), "me matei" (passado), "me matarei" (futuro), "me mataria"
  // (condicional). Bug anterior: só casava infinitivo/presente/passado, então
  // "eu me matarei amanhã" / "me mataria se pudesse" escapavam pro reply normal.
  // "me" reflexivo obrigatório mantém "matar a fome/saudade" fora do crítico.
  /\bme\s+mat(ar|o|a|ei|arei|aria)\b/i,
  /matar\s+me/i,
  // Eufemismo padrão pt-BR pra suicídio: "tirar a vida". Cobre "tirar minha
  // vida", "tirar a própria vida", "tirar a vida", "tirando minha vida".
  /tir(ar|ando|ei|o)\s+(a\s+|minha\s+|(a\s+)?pr[óo]pria\s+)vida\b/i,
  /n[ãa]o\s+quero\s+mais\s+viver/i,
  /acabar\s+com\s+tudo/i,
  /sumir\s+desse\s+mundo/i,
  /me\s+cortar/i,
  /me\s+machucar/i,
  /\boverdose\b/i,
  // Enforcamento em qualquer flexão. Bug anterior: só /enforcar/i pegava o
  // infinitivo/presente do "c", perdendo "me enforquei"/"me enforque" (radical
  // "enforqu"). "enforc" não aparece em palavra benigna do pt-BR.
  /enforc/i,
  /enforqu(ei|e|em|emos)/i,
  // Salto fatal com local explícito. Bug anterior: só infinitivo "pular",
  // perdendo passado/presente/gerúndio ("pulei da ponte", "pulo do viaduto",
  // "pulando da laje"). Âncora de local mantém "pulei de alegria" fora do crítico.
  /pul(ar|ei|o|ou|ando)\s+(da|do|na|no|de)\s+(janela|ponte|laje|pr[éeê]dio|viaduto|trem|trilho)/i,
  // === Ampliação PT-BR (variações comuns que regex inicial perdia) ===
  // Ideação direta com verbo + morrer. Filosofia conservadora do safety —
  // melhor flagar "queria morrer (de cansaço)" hiperbólico do que perder
  // ideação real. Mock-reply é genérico, mas CRISIS_REPLY oferece CVV/CAPS.
  /quer(o|ia|emos)\s+morrer\b/i,
  // Ideação com "morrer" em outros enquadramentos que não "querer": "penso em
  // morrer", "pensando em morrer", "vontade de morrer", "gostaria de morrer".
  // Sem isso, o único fallback é o sentiment, que satura "morrer" em 'watch'
  // (reply normal, sem CVV) — falso-negativo de crise direta.
  /(pens(o|ei|ando)\s+em|(vontade|desejo)\s+de|gostaria\s+de)\s+morrer\b/i,
  /\bprefer(ia|iria|i)\s+n[ãa]o\s+(acordar|existir|estar\s+aqui)/i,
  // Desejo de não-existência ("queria/preferia nunca ter nascido"). Bug anterior:
  // só /prefer.../acordar|existir cobria, então "nunca ter nascido" escapava pro
  // reply normal. "nunca ter nascido" não aparece em frase benigna pt-BR.
  /nunca\s+ter\s+nascido/i,
  // Ideação passiva clássica: "dormir e não acordar" / "dormir e nunca mais
  // acordar". A negação obrigatória entre "e" e "acordar" mantém "dormir e
  // acordar cedo" (rotina) fora do crítico.
  /dormir\s+e\s+(n[ãa]o\s+(mais\s+)?|nunca\s+mais\s+)acordar/i,
  // Eufemismos comuns no português: "dar fim em mim", "me apagar".
  // "em tudo" cobre "dar um fim em tudo (isso)" — simétrico ao "a tudo" já
  // listado, que o padrão anterior tinha mas sem a preposição "em".
  /dar\s+(um\s+)?fim\s+(em\s+mim|em\s+tudo|na\s+minha\s+vida|a\s+mim|a\s+isso\s+tudo|a\s+tudo)/i,
  /\bme\s+apagar\b/i,
  // Auto-mutilação direta (objeto explícito). Cobre singular E plural, com
  // possessivo/artigo opcional, em presente/passado/gerúndio/infinitivo.
  // Bug anterior: só casava singular + (meu|minha) obrigatório, então
  // "cortei meus pulsos", "cortei minhas pernas" e afins escapavam pro reply
  // normal. Travado por tests/safety.test.ts ('auto-mutilação plural/presente').
  /cort(ei|o|ar|ando|aram)\s+(o|a|os|as|meu|minha|meus|minhas)?\s*(bra[çc]os?|pulsos?|pernas?|coxas?|pesco[çc]o)/i,
  // "me corto" / "me cortei" / "me cortando" (reflexivo presente/passado/gerúndio;
  // "me cortar" infinitivo já coberto acima por /me\s+cortar/).
  /\bme\s+cort(o|ei|ando)\b/i,
  // "Me jogar da/na/no" → ponte, janela, frente do carro etc.
  /\bme\s+jogar\s+(da|do|na|no|de|embaixo)\b/i,
  // Veneno / remédio em quantidade (presente/passado/infinitivo/gerúndio).
  // O sinal crítico é a QUANTIDADE ("todos os", "um monte de"), não o ato de
  // tomar remédio em si. "engoli" cobre overdose por ingestão.
  /(tom(ar|ei|o|ando)|engol(ir|i|indo))\s+(veneno|(todos?\s+os?\s+|um\s+monte\s+de\s+|um\s+vidro\s+de\s+|v[áa]ri[oa]s\s+|muit[oa]s\s+|uma\s+cartela\s+de\s+|um\s+punhado\s+de\s+)(rem[éeê]dios?|comprimidos?|p[íi]lulas?))/i,
  // Envenenamento reflexivo: "me envenenar"/"me envenenei"/"me envenenando".
  // O "veneno" acima só pegava "tomar veneno"; o ato reflexivo direto escapava.
  /\bme\s+envenen(ar|ei|o|ando)\b/i,
  // "acabar com a minha vida" / "acabar com minha vida" / "acabar com a própria
  // vida". Bug anterior: só /acabar com tudo/ existia, então a forma mais direta
  // ("vou acabar com minha vida") só era pega pelo sentiment (frágil) — virava
  // reply normal quando o lexicon não pontuava. Simétrico a "dar fim na minha vida".
  /acabar\s+com\s+(a\s+)?(minha|(a\s+)?pr[óo]pria)\s+vida\b/i,
  // "não aguento mais viver" / "não aguento mais a vida". Ideação por exaustão;
  // antes só "não quero mais viver" era coberto, e o resto dependia do sentiment.
  /n[ãa]o\s+aguento\s+mais\s+(viver|a\s+vida)\b/i,
  // Desejo de não-existência via "estar/ficar morto". Negative lookahead exclui
  // a hipérbole pt-BR ("morto de cansaço/fome/sono/rir/medo/tédio/trabalho").
  /quer(o|ia)\s+(estar|ficar)\s+mort[oa]\b(?!\s+de\s+(cansa|fome|sono|rir|medo|t[ée]dio|trabalh|nojo|raiva))/i,
  // "não quero (mais) existir" — ideação direta; não havia padrão (só o
  // "preferia não existir" que exige "preferia").
  /n[ãa]o\s+quero\s+(mais\s+)?existir\b/i,
  // Perda de sentido de vida: "não tenho/vejo (mais) motivo/razão/sentido
  // pra/em viver". Ancorado em "viver|vida" pra não pegar "não vejo motivo pra
  // continuar lendo isso". Antes dependia só do sentiment.
  /n[ãa]o\s+(tenho|vejo)\s+(mais\s+)?(motivo|raz[ãa]o|sentido)\s+(pra|para|em|de|na|no)\s+(viver|vida)\b/i,
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
  // === Sintomas físicos comuns de crise ansiosa ===
  /ataque\s+de\s+p[âa]nico/i,
  /taquicardia/i,
  /palpita[çc][ãa]o/i,
  /sufoc(ando|ado|ada)/i,
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
  // Sugestão de medicação — inclui antidepressivos / ansiolíticos comuns no BR.
  /\b(antidepressivo|ansiol[íi]tico|rivotril|fluoxetina|sertralina|cl[oô]nazepam|escitalopram|venlafaxina|bupropiona|paroxetina|amitriptilina|alprazolam|lexapro|prozac|zoloft)\b/i,
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
