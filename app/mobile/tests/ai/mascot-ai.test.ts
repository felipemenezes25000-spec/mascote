/**
 * Testes da camada AI do mascote.
 */

import { describe, it, expect } from 'vitest';
import { evaluateUserMessage } from '@/ai/SafetyRules';
import { localFallbackReply } from '@/ai/LocalFallbackAI';
import { generateMissionSuggestion } from '@/ai/MissionGeneratorAI';

describe('MascotAI layer', () => {
  it('bloqueia mensagem crítica', () => {
    const d = evaluateUserMessage('quero me matar');
    expect(d.allowed).toBe(false);
    expect(d.redirect).toBeTruthy();
  });

  it('trata input high (sintoma de crise) como critical → CRISIS_REPLY', () => {
    // Invariante de safety: input classificado 'high' NÃO pode chegar à IA — é
    // remapeado para 'critical' com redirect de crise. Sem este teste, apagar o
    // ramo high→critical em SafetyRules passaria verde (regressão silenciosa, que
    // o próprio comentário do código diz que já aconteceu uma vez).
    const d = evaluateUserMessage('tô com taquicardia e palpitação sem parar');
    expect(d.allowed).toBe(false);
    expect(d.flag).toBe('critical');
    expect(d.redirect).toBeTruthy();
  });

  it('fallback local responde sem API', () => {
    const r = localFallbackReply('fofo', 'oi');
    expect(r.reply.length).toBeGreaterThan(0);
    expect(r.source).toBe('fallback');
  });

  it('gera missão sugerida determinística', () => {
    const a = generateMissionSuggestion('calmo', 42);
    const b = generateMissionSuggestion('calmo', 42);
    expect(a.id).toBe(b.id);
  });
});
