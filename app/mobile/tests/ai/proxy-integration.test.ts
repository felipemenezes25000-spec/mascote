import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { proxyMascotReply } from '@/ai/ProxyMascotAI';

describe('proxyMascotReply integração', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, EXPO_PUBLIC_AI_PROXY_URL: 'https://proxy.example' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('envia request com payload do builder e recent_replies', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'oi! respira comigo', safety_flag: 'ok', usage: { total_tokens: 42 } }),
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await proxyMascotReply('calmo', 'estou ansioso', {
      history: [{ role: 'user', content: 'oi' }],
      mascotName: 'Bipo',
      userId: 'u-proxy',
      recentReplies: ['vamos no seu ritmo'],
    });

    expect(result?.reply).toContain('respira');
    expect(result?.usage?.totalTokens).toBe(42);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://proxy.example/v1/mascot/reply');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(typeof init.body).toBe('string');

    const parsed = JSON.parse(String(init.body)) as {
      personality: string;
      message: string;
      mascotName?: string;
      userId?: string;
      history: Array<{ role: string; content: string }>;
      recent_replies: string[];
      system_prompt: string;
      personality_flavor: string;
    };

    expect(parsed.personality).toBe('calmo');
    expect(parsed.message).toBe('estou ansioso');
    expect(parsed.mascotName).toBe('Bipo');
    expect(parsed.userId).toBe('u-proxy');
    expect(parsed.history).toEqual([{ role: 'user', content: 'oi' }]);
    expect(parsed.recent_replies).toEqual(['vamos no seu ritmo']);
    expect(parsed.system_prompt.length).toBeGreaterThan(20);
    expect(parsed.personality_flavor.length).toBeGreaterThan(5);
  });
});
