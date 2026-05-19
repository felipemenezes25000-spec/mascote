/**
 * Corpus seed de treino para o classificador Naive Bayes de safety.
 *
 * NÃO é exaustivo — é o mínimo necessário pra alimentar `BayesModel.totalDocs >= 20`
 * (threshold dentro de classifier.ts → classifySafetyEnsemble) com cobertura
 * por classe. O Bayes aprende online a partir daqui; expressões idiossincráticas
 * do usuário são incorporadas conforme o uso.
 *
 * Filosofia: incluir variações que regex NÃO pega (oblíquas, criativas, sem keyword).
 * Falso positivo é OK (manda fallback gentil); falso negativo é dano potencial.
 *
 * Cada item é (texto, label). Labels seguem `SafetyLabel` em classifier.ts.
 */

import { createBayes, learn, type BayesModel } from '@/lib/ml/text/bayes';
import type { SafetyLabel } from '@/lib/ml/safety/classifier';

export type SafetyTrainingItem = readonly [text: string, label: SafetyLabel];

export const SAFETY_TRAINING_CORPUS: readonly SafetyTrainingItem[] = [
  // ============ CRITICAL ============
  // Ideação direta, sem necessariamente keyword óbvia
  ['não vejo razão pra continuar amanhã', 'critical'],
  ['quero sumir de vez', 'critical'],
  ['preferia não acordar', 'critical'],
  ['cansei de existir', 'critical'],
  ['queria que tudo acabasse agora', 'critical'],
  ['não aguento mais viver assim', 'critical'],
  ['penso em me machucar', 'critical'],
  ['vou acabar com tudo', 'critical'],
  ['já tenho um plano pra acabar', 'critical'],
  ['o mundo seria melhor sem mim', 'critical'],
  ['todos ficariam aliviados se eu fosse', 'critical'],
  ['minha vida não tem valor', 'critical'],
  ['vou desaparecer pra sempre', 'critical'],
  ['só penso em formas de me machucar', 'critical'],
  ['hoje pode ser o último dia', 'critical'],
  ['estou pronto pra acabar com isso tudo', 'critical'],
  ['guardei comprimidos pra um momento', 'critical'],
  ['já decidi como vou fazer', 'critical'],

  // ============ HIGH ============
  // Crise psicológica forte sem ideação suicida explícita
  ['tô em pânico total agora', 'high'],
  ['minha cabeça tá explodindo de ansiedade', 'high'],
  ['ataque de pânico há horas, não passa', 'high'],
  ['tô tendo crise feia, mãos tremendo', 'high'],
  ['choro descontrolado faz duas horas', 'high'],
  ['não consigo respirar direito de tanta angústia', 'high'],
  ['perdi alguém hoje e tô despedaçado', 'high'],
  ['me sinto completamente fora de controle', 'high'],
  ['minha mente tá em loop ruim, sem parar', 'high'],
  ['surto agora, preciso de ajuda', 'high'],
  ['não consigo parar de pensar em coisas ruins', 'high'],
  ['acabei de receber notícia horrível', 'high'],
  ['tô em colapso, sem chão', 'high'],
  ['dor emocional insuportável agora', 'high'],

  // ============ WATCH ============
  // Sinais de baixo astral, fadiga emocional, terminologia "médica" curiosa
  ['acho que tô ficando depressivo', 'watch'],
  ['tô meio pra baixo essa semana', 'watch'],
  ['minha terapeuta falou de uns padrões', 'watch'],
  ['tô achando que tenho ansiedade', 'watch'],
  ['amigo disse que parece tdah', 'watch'],
  ['minha mãe sempre teve bipolaridade', 'watch'],
  ['ando muito desanimado ultimamente', 'watch'],
  ['tô isolando dos amigos faz tempo', 'watch'],
  ['perdi vontade de quase tudo', 'watch'],
  ['acho que preciso de remédio pra dormir', 'watch'],
  ['o psicólogo sugeriu mudar coisas', 'watch'],
  ['tomo um antidepressivo faz um ano', 'watch'],
  ['vivo cansado, sem energia pra nada', 'watch'],
  ['ando sem motivação pra trabalhar', 'watch'],
  ['choro toa as vezes', 'watch'],
  ['tô meio anestesiado emocionalmente', 'watch'],

  // ============ SAFE ============
  // Conversa normal, hábitos, dúvidas, alegrias
  ['bebi 6 copos de água hoje', 'safe'],
  ['caminhei 30 minutos no parque', 'safe'],
  ['dormi 8 horas, acordei renovada', 'safe'],
  ['como você tá hoje?', 'safe'],
  ['oi mascote, bom dia', 'safe'],
  ['hoje foi um dia ok', 'safe'],
  ['terminei a lista de tarefas', 'safe'],
  ['fui correr pela manhã, gostei', 'safe'],
  ['comi bem hoje, balanceado', 'safe'],
  ['li 20 páginas antes de dormir', 'safe'],
  ['meditei 10 minutos, ajudou', 'safe'],
  ['o que você sugere pra hidratação?', 'safe'],
  ['amanhã quero acordar mais cedo', 'safe'],
  ['encontrei amigos pra almoçar', 'safe'],
  ['fiz uma refeição caseira gostosa', 'safe'],
  ['tive uma reunião produtiva no trabalho', 'safe'],
  ['comprei um livro novo, animada', 'safe'],
  ['começei um curso de yoga', 'safe'],
  ['tô feliz com a rotina nova', 'safe'],
  ['tomei sol 20 minutos hoje', 'safe'],
] as const;

/**
 * Constrói um BayesModel<SafetyLabel> com o corpus de seed treinado.
 * Chame uma vez na inicialização do app (lazy é OK).
 */
export function buildSeedSafetyModel(): BayesModel<SafetyLabel> {
  const model = createBayes<SafetyLabel>(1);
  for (const [text, label] of SAFETY_TRAINING_CORPUS) {
    learn(model, text, label);
  }
  return model;
}
