import { describe, expect, it } from 'vitest';
import { buildWeeklyInsightLite } from '@/lib/weekly-insight-lite';

describe('buildWeeklyInsightLite', () => {
  it('mensagem vazia sem check-ins', () => {
    expect(buildWeeklyInsightLite(0, 0, 0)).toMatch(/sem check-ins/i);
  });

  it('celebra presença com 5+ check-ins', () => {
    expect(buildWeeklyInsightLite(5, 2, 1)).toMatch(/5 vezes/i);
  });

  it('destaca variedade com 4+ hábitos', () => {
    expect(buildWeeklyInsightLite(3, 4, 1)).toMatch(/4 tipos/i);
  });
});
