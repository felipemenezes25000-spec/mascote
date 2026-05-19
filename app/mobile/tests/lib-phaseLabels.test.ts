import { describe, expect, it } from 'vitest';
import { phaseLabels } from '@/lib/phaseLabels';

describe('phaseLabels', () => {
  it('todas as 6 phases têm label PT-BR', () => {
    expect(phaseLabels.ovo).toBeTruthy();
    expect(phaseLabels.bebe).toBeTruthy();
    expect(phaseLabels.crianca).toBeTruthy();
    expect(phaseLabels.adolescente).toBeTruthy();
    expect(phaseLabels.adulto).toBeTruthy();
    expect(phaseLabels.evoluido).toBeTruthy();
  });

  it('labels são strings não-vazias', () => {
    for (const v of Object.values(phaseLabels)) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    }
  });
});
