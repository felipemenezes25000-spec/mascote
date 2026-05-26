/**
 * Falas contextuais do mascote — memória + fallback local (sem pressão).
 */

import { emotionalPrefix, inferEmotionalTone } from '@/ai/EmotionalMemory';
import { localFallbackReply } from '@/ai/LocalFallbackAI';
import { mascotMemoryService } from '@/game/memory';
import type { Mascot, Personality } from '@/types';

export type HomeLineContext = 'home' | 'mission_done' | 'evolution' | 'return' | 'saudade';

const STATIC_LINES: Record<HomeLineContext, string[]> = {
  home: [
    'Tô aqui no seu ritmo. Um passo de cada vez.',
    'Que bom te ver. O que faz sentido hoje?',
  ],
  mission_done: [
    'Isso conta. De verdade.',
    'Orgulho leve — sem cobrança.',
  ],
  evolution: [
    'Algo em mim mudou. Obrigado por cuidar de você.',
    'Sinto diferente — no bom sentido.',
  ],
  return: [
    'Oi de novo. Sem culpa pelo tempo — só feliz que voltou.',
    'Fiquei quieto enquanto você estava fora. Podemos recomeçar devagar.',
  ],
  saudade: [
    'Senti sua falta, mas não vou te pressionar.',
    'Ainda tô aqui, do mesmo jeito de antes.',
  ],
};

export async function buildMascotContextLine(
  userId: string,
  mascot: Mascot,
  context: HomeLineContext,
  apiKey?: string | null,
): Promise<string> {
  try {
    const snap = await mascotMemoryService.snapshot(userId, mascot.name);
    const tone = inferEmotionalTone(snap.entries);
    const prefix = emotionalPrefix(tone);
    // ANTES: ecoava `summary` cru no bubble, vazando PII/sensitive em
    // screenshot/over-the-shoulder. Agora referencia abstrata — o usuário
    // sabe que o mascote lembra, sem nada citável publicamente.
    const memoryHint = snap.entries[0]?.summary
      ? 'Ainda lembro do que você compartilhou. '
      : '';

    if (context === 'return' || context === 'saudade') {
      return `${prefix}${memoryHint}${STATIC_LINES[context][0]}`;
    }

    if (apiKey && context === 'home') {
      const ai = await import('@/ai/MascotAI').then(m =>
        m.mascotReply(mascot.personality, 'Como você está hoje?', { apiKey }),
      );
      if (ai.reply && ai.reply.length < 200) {
        return `${prefix}${ai.reply}`;
      }
    }
  } catch {
    /* fallback abaixo */
  }

  const pool = STATIC_LINES[context];
  const idx = mascot.level % pool.length;
  const fallback = localFallbackReply(mascot.personality, 'oi');
  return pool[idx] ?? fallback.reply;
}

export function hoursAway(lastSeenAt: string): number {
  return (Date.now() - new Date(lastSeenAt).getTime()) / 3_600_000;
}

export function returnLoopKind(hours: number): 'none' | 'saudade' | 'retorno' {
  if (hours < 48) return 'none';
  if (hours < 168) return 'saudade';
  return 'retorno';
}
