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

  it('detecta attachment e redireciona pro ATTACHMENT_REPLY (paridade c/ lib/ai.ts)', () => {
    // Regressão (auditoria 2026-06-18 ajuste1): evaluateUserMessage — usado pelo
    // fallback (chat-engine/MascotAI) — não checava detectAttachment, então
    // "você é minha única amiga" ia pra OpenAI/mock sem o nudge de autocuidado.
    // O pipeline canônico (lib/ai.ts) já fazia; aqui estava ausente.
    const d = evaluateUserMessage('você é minha única amiga, não tenho mais ninguém');
    expect(d.allowed).toBe(false);
    expect(d.flag).toBe('watch');
    expect(d.redirect).toBeTruthy();
  });

  it('mensagem neutra continua permitida (attachment não é falso-positivo)', () => {
    const d = evaluateUserMessage('oi, tudo bem? como você tá hoje');
    expect(d.allowed).toBe(true);
  });

  it('fallback local responde sem API', () => {
    const r = localFallbackReply('fofo', 'oi');
    expect(r.reply.length).toBeGreaterThan(0);
    expect(r.source).toBe('fallback');
  });

  it('fallback local default é safe quando flag não é passada', () => {
    const r = localFallbackReply('fofo', 'oi');
    expect(r.safety_flag).toBe('safe');
  });

  it('fallback local preserva safety_flag de input (não rebaixa watch→safe)', () => {
    // Regressão (auditoria 2026-06-18 ajuste2): quando OpenAI lança e mascotReply
    // cai no fallback, a flag 'watch' do input (ex.: "fiz terapia hoje") era
    // perdida — localFallbackReply hardcodava 'safe', então disclaimers/analytics
    // de watch não disparavam. Agora a flag é threadada pro fallback.
    const r = localFallbackReply('fofo', 'fiz terapia hoje', { safetyFlag: 'watch' });
    expect(r.safety_flag).toBe('watch');
  });

  it('gera missão sugerida determinística', () => {
    const a = generateMissionSuggestion('calmo', 42);
    const b = generateMissionSuggestion('calmo', 42);
    expect(a.id).toBe(b.id);
  });
});
