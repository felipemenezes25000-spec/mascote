import type { JourneyClaimRow } from '@/game/journey/types';
import { read, write, withLock } from './internal';

function freshRow(user_id: string): JourneyClaimRow {
  return { user_id, claimed_phase: 1, updated_at: new Date().toISOString() };
}

/**
 * Ponteiro de resgate da Jornada: a maior fase cujas recompensas já foram
 * pagas. A fase em si é derivada do XP (pura); este row existe SÓ pra
 * idempotência do pagamento — nunca pra decidir progressão.
 */
export const journeyClaims = {
  async get(user_id: string): Promise<JourneyClaimRow> {
    const rows = await read<JourneyClaimRow>('journey_claims');
    const row = rows.find(r => r.user_id === user_id) ?? freshRow(user_id);
    // Sanitização: ponteiro corrompido (NaN/negativo) reseta pra 1 em vez de
    // envenenar o claim loop; nunca acima de 100.
    const claimed = Number.isFinite(row.claimed_phase)
      ? Math.max(1, Math.min(100, Math.floor(row.claimed_phase)))
      : 1;
    return { ...row, claimed_phase: claimed };
  },
  /**
   * Avança o ponteiro MONOTONICAMENTE (nunca regride). Retorna o row final.
   * Chamar dentro do lock de claim (journey:userId) — ver service.
   */
  async advance(user_id: string, toPhase: number): Promise<JourneyClaimRow> {
    return withLock('journey_claims', async () => {
      const rows = await read<JourneyClaimRow>('journey_claims');
      const current = rows.find(r => r.user_id === user_id) ?? freshRow(user_id);
      const safeTo = Number.isFinite(toPhase)
        ? Math.max(1, Math.min(100, Math.floor(toPhase)))
        : 1;
      const next: JourneyClaimRow = {
        ...current,
        claimed_phase: Math.max(current.claimed_phase, safeTo),
        updated_at: new Date().toISOString(),
      };
      const newRows = rows.some(r => r.user_id === user_id)
        ? rows.map(r => (r.user_id === user_id ? next : r))
        : [...rows, next];
      await write<JourneyClaimRow>('journey_claims', newRows);
      return next;
    });
  },
};
