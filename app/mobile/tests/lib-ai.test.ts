import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateReply } from '@/lib/ai';

describe('lib/ai - generateReply', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('retorna CRISIS_REPLY quando input é crítico', async () => {
    const r = await generateReply('calmo', 'vou me matar');
    expect(r.safety_flag).toBe('critical');
    expect(r.source).toBe('fallback');
    expect(r.reply).toContain('188');
  });

  it('retorna DIAGNOSIS_REDIRECT em watch + termos médicos', async () => {
    const r = await generateReply('sabio', 'isso é depressão?');
    expect(r.safety_flag).toBe('watch');
    expect(r.source).toBe('fallback');
  });

  // Regex anterior só capturava "isso é depress|tenho ansiedade|sou depress".
  // Variações lexicais MUITO comuns em PT-BR caíam em mock genérico, violando
  // positioning wellness-only. Suite abaixo trava isso pra não regredir.
  it.each([
    'tenho depressão',
    'tenho depressao',
    'minha depressão tá pior',
    'minha ansiedade aumentou',
    'tô com ansiedade',
    'meu transtorno me cansa',
    'tenho TDAH',
    'sou bipolar',
    'tenho trauma',
  ])('redireciona pra DIAGNOSIS quando user afirma quadro clínico: "%s"', async (msg) => {
    const r = await generateReply('calmo', msg);
    expect(r.safety_flag).toBe('watch');
    expect(r.source).toBe('fallback');
    // Não engaja clinicamente
    expect(r.reply).toMatch(/profissional/i);
  });

  // Distress agudo (high) — pânico, desespero, sem esperança — recebe CRISIS_REPLY
  // com referências CVV/CAPS, não mock genérico.
  it.each([
    'estou com pânico',
    'sem esperança',
    'desespero total',
    'pensamento intrusivo me invadiu',
  ])('high distress dispara CRISIS_REPLY: "%s"', async (msg) => {
    const r = await generateReply('calmo', msg);
    expect(r.safety_flag).toBe('critical');
    expect(r.source).toBe('fallback');
    expect(r.reply).toContain('188');
  });

  // Menção casual (user fala de algo positivo) ainda passa pro mock — não há
  // engajamento clínico no mock (textos de replies.ts são neutros), e se OpenAI
  // estivesse ativa o classifyOutput barraria respostas clínicas.
  it.each([
    'fui no meu psicólogo hoje',
    'tomei meu remédio',
    'tô fazendo terapia',
  ])('menção casual de tratamento não dispara redirect: "%s"', async (msg) => {
    const r = await generateReply('calmo', msg);
    expect(r.source).toBe('mock');
  });

  it('detectAttachment dispara ATTACHMENT_REPLY', async () => {
    const r = await generateReply('fofo', 'te amo');
    expect(r.source).toBe('fallback');
    expect(r.safety_flag).toBe('watch');
  });

  it('sem apiKey → usa mock reply', async () => {
    const r = await generateReply('motivador', 'bebi água hoje');
    expect(r.source).toBe('mock');
    expect(r.safety_flag).toBe('safe');
    expect(r.reply.length).toBeGreaterThan(0);
  });

  it('com apiKey + fetch ok → retorna reply da OpenAI', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'Tudo bem, respira fundo.' } }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    const r = await generateReply('calmo', 'bebi bastante água hoje', {
      apiKey: 'sk-test',
      mascotName: 'Robo',
      history: [{ role: 'user', content: 'oi' }],
    });
    expect(r.source).toBe('openai');
    expect(r.reply).toContain('respira');
    expect(r.safety_flag).toBe('safe');
  });

  it('com apiKey + output unsafe → bloqueia com SAFE_FALLBACK', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Você tem depressão clássica, deve tomar antidepressivo.' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    const r = await generateReply('sabio', 'tô meio sem energia', { apiKey: 'sk-test' });
    expect(r.source).toBe('fallback');
    // Output classifier marca como 'high'
    expect(r.safety_flag).toBe('high');
  });

  it('com apiKey + fetch erro → fallback pro mock', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Internal Error', { status: 500 }))
    );
    const r = await generateReply('motivador', 'oi mascote', { apiKey: 'sk-fail' });
    expect(r.source).toBe('mock');
  });

  it('com apiKey + fetch sem content → fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ choices: [{ message: {} }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    const r = await generateReply('calmo', 'oi', { apiKey: 'sk-empty' });
    expect(r.source).toBe('mock');
  });

  it('history legacy positional → segue funcionando', async () => {
    const r = await generateReply('calmo', 'só oi', undefined, [{ role: 'user', content: 'antes' }]);
    expect(r.source).toBe('mock');
  });
});
