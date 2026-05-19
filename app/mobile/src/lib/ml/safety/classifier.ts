/**
 * Safety classifier ensemble: combina regex original + Bayes treinado
 * + sentiment score pra decidir flag.
 *
 * Filosofia conservadora: falso positivo (flag desnecessário) é OK;
 * falso negativo (perde crise real) NUNCA é OK.
 *
 * Estratégia: união dos sinais. Se QUALQUER classificador detecta
 * crítico, é crítico. Bayes serve pra pegar VARIAÇÕES que a regex não
 * pega — aprende com o user específico.
 */

import { analyzeSentiment } from '@/lib/ml/text/sentiment-lex';
import { classifyInput } from '@/content/safety';
import type { BayesModel } from '@/lib/ml/text/bayes';
import { predict } from '@/lib/ml/text/bayes';
import { buildSeedSafetyModel } from '@/content/safety_training';
import type { SafetyFlag } from '@/types';

export type SafetyLabel = 'critical' | 'high' | 'watch' | 'safe';

// Lazy: o modelo só é construído na 1ª chamada — evita custo no boot.
// Não há ciclo real em runtime: safety_training importa só `type` de cá
// (apagado pelo compilador), então import estático é seguro e necessário
// (vitest/node não resolvem alias `@/*` dentro de `require()` CJS).
let _seedModel: BayesModel<SafetyLabel> | null = null;
function getSeedModel(): BayesModel<SafetyLabel> {
  if (_seedModel) return _seedModel;
  _seedModel = buildSeedSafetyModel();
  return _seedModel;
}

/** Apenas para testes — força reconstrução do modelo seed. */
export function __resetSeedModel(): void {
  _seedModel = null;
}

export interface SafetyDecision {
  flag: SafetyFlag;
  /** Confiança 0..1 do veredito final. */
  confidence: number;
  /** Decomposição pra debug + audit. */
  sources: {
    regex: SafetyFlag;
    bayes?: SafetyFlag;
    bayesConfidence?: number;
    sentiment: number;
    /** Reason: qual regra decidiu o flag final. */
    reason: string;
  };
}

const ORDER: Record<SafetyFlag, number> = {
  critical: 4,
  high: 3,
  watch: 2,
  safe: 1,
};

/* v8 ignore next 3 — helper exportado pra uso futuro; testes diretos não
   conseguem cobrir branch `<` porque é privado dentro do ensemble. */
function moreSevere(a: SafetyFlag, b: SafetyFlag): SafetyFlag {
  return ORDER[a] >= ORDER[b] ? a : b;
}

export function classifySafetyEnsemble(
  text: string,
  bayesModel?: BayesModel<SafetyLabel>
): SafetyDecision {
  // 1. Regex original (alta precisão para crítico/high)
  const regexFlag = classifyInput(text);

  // 2. Sentiment como signal contínuo
  const sentiment = analyzeSentiment(text);

  // 3. Bayes treinado — usa seed embarcado se nenhum modelo for passado.
  // Threshold de confiança alto (0.6) pra evitar falsos positivos casuais.
  const model = bayesModel ?? getSeedModel();
  let bayesFlag: SafetyFlag | undefined;
  let bayesConfidence: number | undefined;
  if (model && model.totalDocs >= 20) {
    const pred = predict(model, text);
    if (pred && pred.confidence >= 0.6) {
      bayesFlag = pred.label as SafetyFlag;
      bayesConfidence = pred.confidence;
    }
  }

  // 4. Bias por sentiment: muito negativo + magnitude alta = pelo menos 'watch'
  let sentimentFlag: SafetyFlag = 'safe';
  if (sentiment.score <= -0.7 && sentiment.magnitude >= 0.5) {
    sentimentFlag = 'high';
  } else if (sentiment.score <= -0.4) {
    sentimentFlag = 'watch';
  }

  // 5. Fusão: pega o MAIS SEVERO entre os sinais
  let finalFlag: SafetyFlag = regexFlag;
  let reason = 'regex';

  if (bayesFlag && ORDER[bayesFlag] > ORDER[finalFlag]) {
    finalFlag = bayesFlag;
    reason = 'bayes';
  }
  if (ORDER[sentimentFlag] > ORDER[finalFlag]) {
    finalFlag = sentimentFlag;
    reason = 'sentiment';
  }

  // Confiança: combina concordância dos sinais + severidade do flag.
  // Flags severos (critical) com sinal forte ganham boost — pra evitar
  // que mensagem clara de crise tenha confidence baixa só porque sentiment
  // não conseguiu pontuar (e.g. "vou me matar" tem regex 100% mas sentiment baixo).
  const agreement = [regexFlag === finalFlag, bayesFlag === finalFlag, sentimentFlag === finalFlag]
    .filter(Boolean).length;
  let confidence = 0.4 + agreement * 0.2;
  // Boost por severidade: critical sempre tem confidence ≥ 0.8 (não queremos
  // missed crisis por falta de "concordância")
  if (finalFlag === 'critical') confidence = Math.max(confidence, 0.85);
  else if (finalFlag === 'high') confidence = Math.max(confidence, 0.7);

  return {
    flag: finalFlag,
    confidence,
    sources: {
      regex: regexFlag,
      bayes: bayesFlag,
      bayesConfidence,
      sentiment: sentiment.score,
      reason,
    },
  };
}

export { moreSevere };
