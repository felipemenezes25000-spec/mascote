import { describe, expect, it } from 'vitest';
import { deriveMoodNoChat, deriveReflectiveMood } from '@/lib/mood';
import type { Checkin, Mascot, Message } from '@/types';

function chk(kind: Checkin['habit_kind'], offsetDays = 0): Checkin {
  return {
    id: 'c' + Math.random(),
    user_id: 'u1',
    habit_kind: kind,
    value: 1,
    unit: null,
    occurred_on: new Date(Date.now() - offsetDays * 86400000).toISOString().slice(0, 10),
    occurred_at: new Date().toISOString(),
    xp_awarded: 10,
    idempotency_key: '' + Math.random(),
    created_at: new Date().toISOString(),
  };
}

function msg(content: string, role: Message['role'] = 'user'): Message {
  return {
    id: 'm' + Math.random(),
    conversation_id: 'conv',
    role,
    content,
    safety_flag: 'safe',
    cached: false,
    created_at: new Date().toISOString(),
  };
}

function baseMascot(): Mascot {
  return {
    id: 'm1', user_id: 'u1', name: 'Robo', personality: 'calmo',
    phase: 'bebe', mood: 'feliz', xp: 0, level: 1, energy: 50, health: 100,
    last_seen_at: '', created_at: '',
  };
}

describe('mood: deriveReflectiveMood', () => {
  it('mensagens explicitamente tristes → triste/exausto', () => {
    const out = deriveReflectiveMood({
      baseMood: 'feliz',
      recentMessages: [
        msg('me sinto deprimida, sem esperança'),
        msg('tô muito triste e sozinha, sem ninguém'),
      ],
      recentCheckins: [],
      hoursSinceLastCheckin: 1,
    });
    expect(['triste', 'exausto']).toContain(out);
  });

  it('mensagens claramente alegres → empolgado/feliz', () => {
    const out = deriveReflectiveMood({
      baseMood: 'ok',
      recentMessages: [msg('hoje foi incrível! tô maravilhado e feliz demais')],
      recentCheckins: [],
      hoursSinceLastCheckin: 1,
    });
    expect(['empolgado', 'feliz']).toContain(out);
  });

  it('72h+ sem checkin → exausto', () => {
    const out = deriveReflectiveMood({
      baseMood: 'feliz',
      recentMessages: [],
      recentCheckins: [],
      hoursSinceLastCheckin: 80,
    });
    expect(out).toBe('exausto');
  });

  it('36h+ + vibe negativa → triste ou exausto', () => {
    const out = deriveReflectiveMood({
      baseMood: 'feliz',
      recentMessages: [msg('tô meio cansado e desanimado')],
      recentCheckins: [],
      hoursSinceLastCheckin: 40,
    });
    expect(['triste', 'exausto']).toContain(out);
  });

  it('habit signal "tired" (sem sleep, mas com 5 outros) → exausto', () => {
    const out = deriveReflectiveMood({
      baseMood: 'feliz',
      recentMessages: [],
      recentCheckins: [
        chk('water'), chk('water'), chk('exercise'), chk('breath'), chk('reading'),
      ],
      hoursSinceLastCheckin: 1,
    });
    expect(out).toBe('exausto');
  });

  it('habit thriving (variedade + breath) → feliz', () => {
    const out = deriveReflectiveMood({
      baseMood: 'feliz',
      recentMessages: [],
      recentCheckins: [
        chk('water'), chk('sleep'), chk('exercise'), chk('breath'), chk('reading'),
      ],
      hoursSinceLastCheckin: 1,
    });
    expect(['feliz', 'empolgado']).toContain(out);
  });

  it('sem mensagens nem checkins → baseMood', () => {
    const out = deriveReflectiveMood({
      baseMood: 'ok',
      recentMessages: [],
      recentCheckins: [],
      hoursSinceLastCheckin: 1,
    });
    expect(out).toBe('ok');
  });

  it('ignora msgs role=mascot', () => {
    const out = deriveReflectiveMood({
      baseMood: 'feliz',
      recentMessages: [msg('tô horrível', 'mascot')],
      recentCheckins: [],
      hoursSinceLastCheckin: 1,
    });
    expect(out).toBe('feliz');
  });
});

describe('mood: múltiplas mensagens — só última afeta sample', () => {
  it('2+ msgs: idx < last não muda lastMood (branch false)', () => {
    const out = deriveReflectiveMood({
      baseMood: 'ok',
      recentMessages: [
        msg('triste'),         // não é última
        msg('feliz alegre'),   // última, define sample
      ],
      recentCheckins: [],
      hoursSinceLastCheckin: 1,
    });
    // última msg é positiva, então sample deve refletir
    expect(['feliz', 'empolgado', 'ok']).toContain(out);
  });
});

describe('mood: habitHealth waterCount branches', () => {
  it('< 5 checkins com waterCount <= 3 → neutral score 0', () => {
    const out = deriveReflectiveMood({
      baseMood: 'ok',
      recentMessages: [],
      recentCheckins: [chk('water'), chk('water'), chk('water')],
      hoursSinceLastCheckin: 1,
    });
    expect(out).toBe('ok');
  });

  it('habit thriving + baseMood empolgado → empolgado (branch ternário)', () => {
    const out = deriveReflectiveMood({
      baseMood: 'empolgado',
      recentMessages: [],
      recentCheckins: [
        chk('water'), chk('sleep'), chk('exercise'), chk('breath'), chk('reading'),
      ],
      hoursSinceLastCheckin: 1,
    });
    expect(out).toBe('empolgado');
  });

  it('hoursSinceLastCheckin >= 36 + vibe < 0 → triste', () => {
    const out = deriveReflectiveMood({
      baseMood: 'feliz',
      recentMessages: [msg('triste hoje')],
      recentCheckins: [],
      hoursSinceLastCheckin: 40,
    });
    expect(out).toBe('triste');
  });
});

describe('mood: deriveMoodNoChat', () => {
  it('chama deriveReflectiveMood com mensagens vazias', () => {
    const m = baseMascot();
    const out = deriveMoodNoChat(m, [], 1);
    expect(out).toBe('feliz');
  });

  it('habit tired sem chat → exausto', () => {
    const m = baseMascot();
    const out = deriveMoodNoChat(m, [
      chk('water'), chk('water'), chk('exercise'), chk('breath'), chk('reading'),
    ], 1);
    expect(out).toBe('exausto');
  });
});
