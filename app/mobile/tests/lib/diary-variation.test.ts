/**
 * Variação determinística dos openers do diário do mascote.
 *
 * Garantias:
 * - mesma mutationId → mesma carta (idempotência do feed)
 * - mutationIds distintos → openers variados (≥ 3 únicos em 10 mutações)
 * - todos openers vêm do pool DIARY_OPENERS, sem off-by-one
 */

import { describe, expect, it } from 'vitest';
import { buildMutationBody, DIARY_OPENERS } from '@/lib/diary/mascotDiary';

describe('diary opener variation', () => {
  it('varia openers ao longo de 10 mutationIds diferentes', () => {
    const cards = Array.from({ length: 10 }, (_, i) =>
      buildMutationBody(`m-${i}`, 'mut', 'desc curta', 'Bipo'),
    );
    const openers = new Set(cards.map(c => c.split('.')[0]));
    expect(openers.size).toBeGreaterThanOrEqual(3);
  });

  it('mesma mutationId sempre gera a mesma carta (determinismo)', () => {
    const a = buildMutationBody('fixed-id', 'mut', 'desc', 'Bipo');
    const b = buildMutationBody('fixed-id', 'mut', 'desc', 'Bipo');
    expect(a).toBe(b);
  });

  it('opener escolhido vem do pool DIARY_OPENERS', () => {
    const card = buildMutationBody('any-id', 'mut', 'desc', 'Bipo');
    const opener = card.split('.')[0] + '.';
    expect(DIARY_OPENERS).toContain(opener);
  });

  it('pool tem pelo menos 10 openers — garante variedade real', () => {
    expect(DIARY_OPENERS.length).toBeGreaterThanOrEqual(10);
  });
});
