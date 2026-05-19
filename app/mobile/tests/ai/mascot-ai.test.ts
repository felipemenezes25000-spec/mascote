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
