import { describe, expect, it } from 'vitest';
import { buildMascotReplyContractRequest } from '@/ai/ProxyMascotAI';

describe('Proxy AI contract request', () => {
  it('monta payload estrito para /v1/mascot/reply', () => {
    const payload = buildMascotReplyContractRequest('calmo', 'oi mascote', {
      history: [{ role: 'user', content: 'bom dia' }],
      mascotName: 'Bipo',
      userId: 'u-1',
      recentReplies: ['respira comigo'],
    });
    expect(payload.personality).toBe('calmo');
    expect(payload.message).toBe('oi mascote');
    expect(payload.history).toHaveLength(1);
    expect(payload.mascotName).toBe('Bipo');
    expect(payload.userId).toBe('u-1');
    expect(payload.system_prompt.length).toBeGreaterThan(20);
    expect(payload.personality_flavor.length).toBeGreaterThan(5);
    expect(payload.recent_replies).toEqual(['respira comigo']);
  });
});
