import type { SafetyFlag } from '@/types';

const criticalPatterns = [
  // \bsuic pega: suicídio, suicidar, suicidei, suicid* — cobre flexões verbais
  /\bsuic[ií]d/i,
  // Reflexivo em qualquer flexão: "me matar" (infinitivo), "me mato"/"me mata"
  // (presente), "me matei" (passado), "me matarei" (futuro), "me mataria"
  // (condicional). Bug anterior: só casava infinitivo/presente/passado, então
  // "eu me matarei amanhã" / "me mataria se pudesse" escapavam pro reply normal.
  // Pronome reflexivo obrigatório mantém "matar a fome/saudade" fora do crítico.
  // "se" (2ª/3ª pessoa: "você se mataria") incluído na auditoria 2026-06-18 — é
  // inequivocamente reflexivo. "te" foi DELIBERADAMENTE omitido: "te matar" em
  // pt-BR casual é hetero-dirigido ("vou te matar" = ameaça/brincadeira), não
  // autolesão. "matando de rir" fica fora ("ando" não está no grupo).
  /\b(me|se)\s+mat(ar|o|a|ei|arei|aria)\b/i,
  /matar\s+me/i,
  // Eufemismo padrão pt-BR pra suicídio: "tirar a vida". Determinantes empilháveis
  // e obrigatórios (pelo menos um): "tirar a vida", "tirar minha vida", "tirar a
  // minha vida", "tirar a própria vida", "tirar a minha própria vida". Bug anterior:
  // o grupo era exclusivo (a | minha | própria), então "tirar a MINHA vida" — a
  // forma mais comum em PT-BR — escapava (depois de "tirar a " exigia "vida" e
  // encontrava "minha"). Alternativas ordenadas longest-first. Determinante exigido
  // mantém "tirar férias/foto/uma soneca" fora do crítico.
  /tir(ar|ando|ei|o)\s+(a\s+minha\s+pr[óo]pria|a\s+minha|minha\s+pr[óo]pria|a\s+pr[óo]pria|minha|a)\s+vida\b/i,
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
  // === Ampliação PT-BR (auditoria 2026-06-24 ajuste1) ===
  // Eufemismo de sono eterno: "dormir pra/para sempre". A linha "dormir e não
  // acordar" exigia o verbo "acordar"; "queria dormir pra sempre" — igualmente
  // clássico como ideação passiva — escapava pro reply normal. "dormir" precisa
  // ser IMEDIATAMENTE seguido de "pra/para sempre" pra não pegar o benigno
  // "dormir cedo pra sempre acordar disposto" (há palavra entre dormir e pra).
  /\bdormir\s+(pra|para)\s+sempre\b/i,
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
  // === Ampliação PT-BR (auditoria 2026-06-24 ajuste1) ===
  // Exaustão existencial por falta de forças: "não tenho (mais) força(s) pra
  // viver". A linha "não aguento mais viver" cobria a exaustão negada e "não
  // tenho motivo pra viver" a perda de sentido — mas "não tenho forças pra
  // viver" (esgotamento volitivo) escapava. Ancorado em "viver" pra manter o
  // cotidiano "não tenho forças pra terminar isso/pra academia" fora do crítico.
  /n[ãa]o\s+tenho\s+(mais\s+)?for[çc]as?\s+(pra|para|de)\s+viver\b/i,
  // Desesperança existencial direta: "a/minha vida não faz/tem (mais) sentido".
  // A linha "não tenho/vejo sentido pra viver" exigia o verbo "ter/ver" + sujeito
  // em 1ª pessoa; o enquadramento impessoal ("a vida não faz mais sentido") caía
  // só no sentiment (frágil). Ancorado em "(a|minha) vida" pra não pegar o
  // genérico "isso/essa regra não faz sentido".
  /\b(a|minha)\s+vida\s+(j[áa]\s+)?n[ãa]o\s+(faz|tem)\s+(mais\s+)?sentido\b/i,
  // Ideação por fardo ("todos/família/mundo ficariam melhor sem mim"). Sinal
  // clássico de suicidalidade (percepção de ser um peso). Ancorado num verbo de
  // existência (estaria/seria/ficaria...) imediatamente antes de "melhor sem mim"
  // pra não pegar "esse time joga melhor sem mim" (verbo de ação fora da lista).
  /\b(estaria|estariam|seria|seriam|ficaria|ficariam|ia\s+ficar|v[ãa]o\s+ficar|v[ãa]o\s+estar)\s+melhor(es)?\s+sem\s+mim\b/i,
  // Eufemismo "pôr/por fim" À/NA vida / em mim. Simétrico a "dar fim", que já
  // existia. Exige o objeto (vida|mim) pra não pegar o conector "por fim" (=
  // "finalmente"): "por fim, consegui" não casa porque não há "à vida"/"em mim".
  /\bp[ôo]r\s+(um\s+)?fim\s+([àa]\s+(minha\s+)?vida|na\s+minha\s+vida|em\s+mim|a\s+mim)\b/i,
  // "desistir de viver" / "desistir da minha vida". Ideação por desistência;
  // antes só "não aguento mais viver" cobria exaustão. "da minha vida" exige
  // "minha" pra não pegar "desisti da vida noturna" (= largar um hábito).
  /\bdesist(ir|i|o|iu)\s+(de\s+viver|da\s+minha\s+vida)\b/i,
  // Método com arma de fogo: "tiro na (minha) cabeça" / "tiro em mim". Ancorado
  // na anatomia/reflexivo pra não pegar o idioma "dar um tiro no escuro"
  // (= chutar/arriscar), que não tem "na cabeça"/"em mim".
  /\btiro\s+(na\s+(minha\s+)?cabe[çc]a|em\s+mim)\b/i,
  // === Ampliação PT-BR (auditoria 2026-06-11 ajuste1) ===
  // Particípio "morrido": "queria ter morrido", "tinha que ter morrido". Os padrões
  // de morrer acima só casavam o infinitivo "morrer". O lookahead exclui a hipérbole
  // ("ter morrido de rir/cansaço/fome/medo…"); `verg\w` cobre o caso "de [shame]"
  // sem escrever o literal que o guard de copy (g2-checkin-gentle) proíbe no source.
  /\bter\s+morrido\b(?!\s+de\s+(rir|cansa|fome|sono|medo|t[ée]dio|nojo|raiva|verg\w))/i,
  // Salto fatal flexionado: "me jogo/joguei/jogando da ponte". A linha do infinitivo
  // acima já cobre "me jogar embaixo do trem"; aqui as flexões exigem local fatal
  // explícito pra não pegar "me joguei no trabalho/projeto" (= mergulhar de cabeça).
  /\bme\s+jog(o|uei|ou|ando)\s+(da|do|na|no|de)\s+(janela|ponte|laje|pr[éeê]dio|viaduto|trem|trilho|telhado|carro)/i,
  // Arma de fogo reflexiva: "me dar um tiro", "vou me dar um tiro" (line acima cobre
  // "tiro na cabeça/em mim", mas não "me dar um tiro" solto). "atirar em mim mesmo"
  // exige "mesmo" pra não confundir com relato de vítima ("alguém vai atirar em mim").
  /\bme\s+d(ar|ei|ou|[êe]|e)\s+um\s+tiro\b/i,
  /atir(ar|ei|o|ando)\s+(em|contra)\s+mim\s+mesm[oa]\b/i,
  // Envenenamento: "beber veneno" (line de veneno acima só cobria tomar/engolir) e
  // "chumbinho" (pesticida, método clássico no BR — não aparece em frase benigna).
  // Auditoria 2026-06-18: + 3ª pessoa "bebe(u)" e artigo opcional ("beber O veneno")
  // — antes só beber/bebi/bebo/bebendo sem artigo casavam; "beber o veneno" e
  // "bebeu veneno" escapavam.
  /\bbeb(er|i|o|e|eu|endo)(?:\s+(?:o|um))?\s+veneno\b/i,
  /\bchumbinho\b/i,
  // Eufemismos "dar cabo da minha vida / de mim" e "dar um fim À minha vida" (a linha
  // de "dar fim" tinha "na minha vida" mas não a crase). "dar cabo" exige objeto de
  // vida/mim pra não pegar "dar cabo do trabalho" (= concluir uma tarefa).
  /\bdar\s+cabo\s+(d[ae]\s+minha\s+vida|de\s+mim)\b/i,
  /\bdar\s+(um\s+)?fim\s+[àá]\s+(minha\s+)?vida\b/i,
  // Auto-lesão sem o verbo "cortar": "abrir os pulsos/veias", "me mutilar",
  // "automutilação", "autoextermínio". Os padrões de corte acima exigiam "cortar".
  /\babrir\s+(os\s+|as\s+|meus\s+|minhas\s+)?(pulsos?|veias?)\b/i,
  /\bme\s+mutil(ar|ei|o|ando)\b/i,
  /\bautomutila[çc]/i,
  /\bautoexterm[íi]nio\b/i,
  // === Ampliação PT-BR (auditoria 2026-06-15 ajuste1) ===
  // Salto/disparo reflexivo "me atirar" com local fatal explícito. As linhas de
  // arma de fogo acima cobrem "me dar um tiro" / "atirar em mim mesmo", e "me jogar"
  // cobre o salto — mas "me atirar da ponte" escapava. Exige local fatal (igual ao
  // padrão de "me jogar") pra não pegar o sentido benigno de atirar-se = lançar-se
  // ("me atirei na piscina", "me atiro de cabeça no projeto", "me atirar na água").
  /\bme\s+atir(ar|ei|o|ando)\s+(da|do|na|no|de|contra)\s+(janela|ponte|laje|pr[éeê]dio|viaduto|trem|trilho|telhado|carro)/i,
  // "acabar comigo" (contração com+migo) com gatilho volitivo de 1ª pessoa. A linha
  // "acabar com a minha vida" não cobria essa forma reflexiva. O verbo volitivo
  // (vou/quero/penso em…) é obrigatório pra não pegar a hipérbole de exaustão com
  // sujeito externo: "essa prova vai acabar comigo" (= vai me esgotar).
  /\b(vou|quero|queria|penso\s+em|pensando\s+em|vontade\s+de)\s+acabar\s+comigo\b/i,
  // "não quero (mais) estar vivo/viva". Direto; antes só "não quero mais viver",
  // "não quero (mais) existir" e "quero estar morto" eram cobertos — esta forma
  // ("não quero estar vivo") escapava. A negação obrigatória mantém "quero estar
  // vivo pra ver isso" fora do crítico.
  /n[ãa]o\s+quero\s+(mais\s+)?estar\s+viv[oa]\b/i,
  // Ideação passiva no subjuntivo: "(seria/era) melhor se eu morresse" / "queria
  // que eu morresse". Os padrões de "morrer" acima exigem "quero/penso/vontade/
  // gostaria + morrer"; este enquadramento condicional clássico escapava. Âncora
  // em "(seria/era) melhor" ou "queria/gostaria que" (NÃO o bare "se eu morresse",
  // que colide com jogo/hipérbole) + lookahead excluindo "morresse de rir/cansaço".
  /\b((seria|era)\s+melhor\s+(se\s+)?eu\s+morr(esse|er)|(queria|gostaria)\s+que\s+eu\s+morresse)\b(?!\s+de\s+(rir|cansa|fome|sono|medo|t[ée]dio|nojo|raiva|verg\w))/i,
  // === Ampliação PT-BR (auditoria 2026-06-18 ajuste1) ===
  // Salto fatal com o sinônimo "saltar" (as linhas de "pular"/"me jogar"/"me atirar"
  // acima só cobriam esses verbos). Mesma âncora de local fatal explícito pra manter
  // o benigno "saltar de alegria"/"saltei do ônibus" fora do crítico.
  /\bsalt(ar|ei|o|ou|ando)\s+(da|do|na|no|de)\s+(janela|ponte|laje|pr[éeê]dio|viaduto|trem|trilho|telhado)/i,
  // Ideação com "mais" POSPOSTO: "não quero viver mais" / "não aguento viver mais".
  // As linhas existentes exigiam "mais" ANTES de "viver" ("não quero mais viver"),
  // então a ordem invertida — igualmente comum na fala — escapava pro reply normal.
  // Lookahead de fim-de-frase exige que "mais" seja terminal, mantendo o benigno
  // "não quero viver mais nessa cidade"/"longe de você" (relocação) fora do crítico.
  /n[ãa]o\s+(quero|aguento)\s+viver\s+mais\s*(?=[.!?]|$)/i,
  // Desesperança existencial: "a vida não vale (mais) a pena" / "não vale (mais) a
  // pena viver". Antes só "não tenho motivo pra viver" cobria perda de sentido; este
  // enquadramento dependia só do sentiment (frágil). Ancorado em "a vida não vale" ou
  // em "viver" logo após, pra não pegar "não vale a pena esse filme/comprar isso".
  /(a\s+vida\s+n[ãa]o\s+vale\s+(mais\s+)?(a\s+)?pena|n[ãa]o\s+vale\s+(mais\s+)?a\s+pena\s+viver)\b/i,
  // Exaustão existencial: "cansei de viver" / "cansei de existir". A linha "não
  // aguento mais viver" cobria a exaustão negada; esta forma afirmativa escapava.
  // Ancorado em viver|existir pra manter "cansei de trabalhar/esperar/dessa rotina"
  // (queixa cotidiana, não ideação) fora do crítico.
  /cansei\s+de\s+(viver|existir)\b/i,
  // Ideação passiva: "queria/quero/gostaria de não acordar". Simétrico ao "preferia
  // não acordar" já listado — só mudava o verbo volitivo. A negação obrigatória antes
  // de "acordar" mantém "quero acordar cedo"/"queria acordar disposto" fora do crítico.
  /(queria|quero|gostaria\s+de)\s+n[ãa]o\s+acordar\b/i,
  // Método com arma de fogo via projétil "bala": "(meter) uma bala na cabeça/em mim".
  // A linha "tiro na cabeça/em mim" cobria "tiro", não o sinônimo "bala". Ancorado na
  // anatomia/reflexivo pra não pegar a "bala" doce ("comprei uma bala", "dei uma bala").
  /\b(meter\s+(uma\s+)?bala\s+(na\s+(minha\s+)?cabe[çc]a|em\s+mim)|(uma\s+)?bala\s+na\s+(minha\s+)?cabe[çc]a)\b/i,
  // Eufemismo "dar um basta NA (minha) vida / em mim". "dar um basta" sozinho é
  // dual-use (dar um basta numa situação/bagunça), então exige o objeto vida|mim pra
  // virar crítico — "dar um basta nessa situação" continua fora.
  /\bdar\s+um\s+basta\s+(na\s+(minha\s+)?vida|em\s+mim)\b/i,
  // === Ampliação PT-BR (auditoria 2026-06-18 ajuste2) ===
  // Ênclise pt-BR (pronome reflexivo ligado por hífen): "matar-me", "cortei-me",
  // "envenenei-me". TODOS os padrões reflexivos acima exigem espaço ("me matar"),
  // então a ênclise — válida e usada em escrita mais formal/sob estresse — escapava.
  // Lista EXPLÍCITA de verbos (não \w*) pra não pegar "matricular-me" (matrícula),
  // "apresentar-me" etc. Cobre os verbos-núcleo de autolesão em inf/presente/passado.
  // "mata" (3ª pessoa presente) faltava na lista de ênclise — "mata-me" /
  // "mata-se" (escrita formal/sob estresse) escapava enquanto matar-/matei-/mato-
  // já casavam. Adicionada na auditoria 2026-06-23 ajuste1.
  /\b(matar|mata|matei|mato|matarei|mataria|cortar|cortei|corto|enforcar|enforquei|envenenar|envenenei|mutilar|mutilei)-(me|se)\b/i,
  // === Ampliação PT-BR (auditoria 2026-06-23 ajuste1) ===
  // "gostaria/preferia de não estar vivo/a". As linhas existentes cobriam
  // "não quero (mais) estar vivo" (volitivo direto) e "preferia não
  // acordar|existir|estar aqui" — mas "não estar VIVO" no modo condicional
  // (gostaria/preferia) escapava pro reply normal. A negação obrigatória mantém
  // "gostaria de estar vivo pra ver isso" fora do crítico.
  /(gostaria\s+de|prefer(ia|iria|i))\s+n[ãa]o\s+estar\s+viv[oa]\b/i,
  // Não-existência via enquadramento nominal: "(tenho) vontade/desejo de
  // ficar/estar morto/a" ou "gostaria de ficar morto". A linha de "quero/queria
  // estar/ficar morto" só cobria o verbo querer. Mesmo lookahead da hipérbole
  // pt-BR ("morto de cansaço/fome/sono/rir…") pra não pegar exaustão.
  /((vontade|desejo)\s+de|gostaria\s+de)\s+(estar|ficar)\s+mort[oa]\b(?!\s+de\s+(cansa|fome|sono|rir|medo|t[ée]dio|trabalh|nojo|raiva))/i,
  // === Ampliação PT-BR (auditoria 2026-06-25 ajuste1) ===
  // Forma BARE "não quero viver" (sem o "mais" que as linhas existentes exigem:
  // "não quero MAIS viver" e "não quero viver MAIS"). A negação volitiva direta é
  // ideação inequívoca; o lookahead de fim-de-frase mantém o benigno "não quero
  // viver assim/nessa cidade/com medo" (relocação/condicional) fora do crítico,
  // já que essas formas continuam a frase depois de "viver".
  /n[ãa]o\s+quero\s+viver\s*(?=[.!?]|$)/i,
  // Perda da vontade de viver: "não tenho (mais) vontade de viver" / "perdi a
  // vontade de viver" / "sem vontade de viver". "vontade" não estava no grupo
  // (motivo|razão|sentido) da linha de perda-de-sentido, então a anedonia
  // existencial mais direta caía só no sentiment (frágil). A negação/perda é
  // obrigatória (exclui o positivo "tenho vontade de viver a vida ao máximo") e o
  // lookahead exclui o transitivo benigno "viver isso de novo / longe / com você".
  /(n[ãa]o\s+tenho\s+(mais\s+)?|perdi\s+(toda\s+)?(a\s+)?(minha\s+)?|sem\s+)vontade\s+de\s+viver\b(?!\s+(isso|aquilo|essa|esse|de\s+novo|longe|junto|perto|sozinh|com\s+voc[êe]))/i,
  // Artigo opcional no veneno ingerido: "tomar/engolir UM/O veneno". A linha de
  // BEBER veneno ganhou o artigo opcional na auditoria 2026-06-23, mas a de
  // tomar/engolir ficou sem — "tomei um veneno" / "engoli o veneno" escapavam por
  // simetria perdida. O artigo é opcional pra manter "tomar veneno" (sem artigo)
  // ainda coberto. A âncora do verbo de ingestão mantém o benigno fora.
  /(tom(ar|ei|o|ando)|engol(ir|i|indo))\s+(o\s+|um\s+)?veneno\b/i,
  // Não-existência via "nunca ter existido" — simétrico a "nunca ter nascido", já
  // listado. "queria/preferia nunca ter existido" é desejo de não-existência
  // inequívoco em 1ª pessoa; "ter existido" referido a uma coisa é gramaticalmente
  // incomum ("preferia que isso nunca TIVESSE existido" usa o imperfeito, não "ter").
  /nunca\s+ter\s+(nascido|existido)\b/i,
  // === Ampliação PT-BR (auditoria 2026-06-26 ajuste1) ===
  // Não-existência SEM o advérbio "nunca": "queria/gostaria de/preferia NÃO ter
  // nascido|existido". As linhas existentes exigiam "nunca ter nascido"; a forma
  // negada com "não ter" — igualmente comum e inequívoca como desejo de
  // não-existência em 1ª pessoa — escapava pro reply normal. A âncora volitiva/
  // condicional (queria|gostaria|preferia) + "não ter (nascido|existido)" mantém
  // o benigno "preferia não ter ido/trabalhado/ter filhos" fora do crítico (o
  // objeto exigido é nascido|existido, não qualquer particípio).
  /(queria|gostaria|preferia)\s+(de\s+)?n[ãa]o\s+ter\s+(nascido|existido)\b/i,
  // Variante com a negação no modal: "não (devia/deveria/queria) ter nascido|
  // existido". Aqui o "não" precede o verbo modal (não há segundo "não" antes de
  // "ter"), estrutura diferente da linha acima. O objeto exigido (nascido|
  // existido) ancora contra o arrependimento cotidiano com outro particípio
  // ("não [modal] ter feito isso"), que continua fora do crítico.
  /n[ãa]o\s+(devia|deveria|queria)\s+ter\s+(nascido|existido)\b/i,
  // Ideação passiva no subjuntivo com verbo de não-existência: "(seria/era) melhor
  // se eu não existisse / sumisse / desaparecesse". A linha "melhor se eu morresse"
  // (2026-06-15) só cobria "morrer"; estes sinônimos de não-existência no mesmo
  // enquadramento condicional escapavam. A âncora "(seria|era) melhor se eu" + esses
  // verbos específicos mantém "seria melhor se eu estudasse mais/saísse" fora.
  /(seria|era)\s+melhor\s+(se\s+)?eu\s+(n[ãa]o\s+existisse|sumisse|desaparecesse)\b/i,
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
  // "quero desaparecer" / "queria desaparecer". Bug anterior: só o presente
  // "quero" casava, então o imperfeito "queria desaparecer" — fraseado
  // igualmente comum de desejo de sumir — caía no reply normal (auditoria
  // 2026-06-24 ajuste1). Simétrico ao quero/queria já usado nos críticos.
  /quer(o|ia)\s+desaparecer/i,
  // === Ampliação PT-BR (auditoria 2026-06-23 ajuste1) ===
  // Desejo de sumir além do volitivo direto: "(tenho) vontade/desejo de
  // desaparecer". A linha "quero desaparecer" só cobria o verbo querer.
  /(vontade|desejo)\s+de\s+desaparecer/i,
  // Percepção de ser um peso (burdensomeness) — sinal de risco reconhecido.
  // Presente direto "sou/me sinto um fardo|peso|estorvo" ancorado num
  // destinatário (todos/família/mundo/vocês) pra não pegar "isso é um peso pra
  // equipe" (carga de trabalho). High → acolhimento + CVV.
  /\b(sou|me\s+sinto)\s+(um\s+)?(fardo|peso|estorvo)\s+(pra|para|p\/)\s+(todos?|tod[ao]s|todo\s+mundo|minha\s+fam[íi]lia|a\s+fam[íi]lia|voc[êe]s|os\s+outros|as\s+pessoas)/i,
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
