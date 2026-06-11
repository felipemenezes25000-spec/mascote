/**
 * chat-engine (sendChatMessage) — adapter "simples" usado pelo fallback de
 * chat.tsx. Regressão da auditoria 2026-06-11: SendResult agora carrega
 * `safetyFlag`, sem o qual o fallback gravava CRISIS_REPLY como 'safe' e a UI
 * de crise (estilo do ChatBubble + supressão do rating) não disparava.
 */
import { describe, expect, it } from 'vitest';
import { sendChatMessage } from '@/lib/ai/chat-engine';
import { CRISIS_REPLY, DIAGNOSIS_REDIRECT } from '@/content/safety';

describe('sendChatMessage — safety flag threading', () => {
  it('mensagem de crise → safetyFlag critical + CRISIS_REPLY (sem chamar OpenAI)', async () => {
    const r = await sendChatMessage('quero me matar', { personality: 'calmo' });
    expect(r.safetyFlag).toBe('critical');
    expect(r.content).toBe(CRISIS_REPLY);
    expect(r.source).toBe('local');
  });

  it('input "high" (crise emocional aguda) também vem como critical', async () => {
    const r = await sendChatMessage('tô surtando, sem saída', { personality: 'motivador' });
    expect(r.safetyFlag).toBe('critical');
    expect(r.content).toBe(CRISIS_REPLY);
  });

  it('pedido de diagnóstico → safetyFlag watch + DIAGNOSIS_REDIRECT', async () => {
    const r = await sendChatMessage('acho que tenho depressão', { personality: 'sabio' });
    expect(r.safetyFlag).toBe('watch');
    expect(r.content).toBe(DIAGNOSIS_REDIRECT);
  });

  it('mensagem comum (sem chave OpenAI) → safetyFlag safe via mock local', async () => {
    const r = await sendChatMessage('oi tudo bem', { personality: 'fofo' });
    expect(r.safetyFlag).toBe('safe');
    expect(r.source).toBe('local');
    expect(typeof r.content).toBe('string');
    expect(r.content.length).toBeGreaterThan(0);
  });

  it('mensagem vazia → safetyFlag safe', async () => {
    const r = await sendChatMessage('   ', { personality: 'calmo' });
    expect(r.safetyFlag).toBe('safe');
  });
});
