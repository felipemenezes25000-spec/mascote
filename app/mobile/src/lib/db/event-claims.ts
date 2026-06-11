import { read, write, withLock } from './internal';

export interface EventClaimRow {
  user_id: string;
  /** IDs de OCORRÊNCIAS de desafio já resgatadas (`evento:data-início`). */
  claimed_ids: string[];
  updated_at: string;
}

/** Ocorrências antigas não voltam — cap evita crescimento eterno. */
const MAX_CLAIMED_IDS = 50;

function freshRow(user_id: string): EventClaimRow {
  return { user_id, claimed_ids: [], updated_at: new Date().toISOString() };
}

/**
 * Resgates de desafios de evento. Cada ocorrência (evento + data de início)
 * é resgatável UMA vez — semana que vem é outra ocorrência, outro resgate.
 * `tryClaim` é atômico: retorna false se já estava resgatado (anti-double).
 */
export const eventClaims = {
  async isClaimed(user_id: string, challengeId: string): Promise<boolean> {
    const rows = await read<EventClaimRow>('event_claims');
    const row = rows.find(r => r.user_id === user_id);
    return row?.claimed_ids.includes(challengeId) ?? false;
  },
  /** Marca como resgatado. Retorna false se JÁ estava (caller não paga). */
  async tryClaim(user_id: string, challengeId: string): Promise<boolean> {
    return withLock('event_claims', async () => {
      const rows = await read<EventClaimRow>('event_claims');
      const current = rows.find(r => r.user_id === user_id) ?? freshRow(user_id);
      if (current.claimed_ids.includes(challengeId)) return false;
      const claimed = [...current.claimed_ids, challengeId].slice(-MAX_CLAIMED_IDS);
      const next: EventClaimRow = {
        ...current,
        claimed_ids: claimed,
        updated_at: new Date().toISOString(),
      };
      const newRows = rows.some(r => r.user_id === user_id)
        ? rows.map(r => (r.user_id === user_id ? next : r))
        : [...rows, next];
      await write<EventClaimRow>('event_claims', newRows);
      return true;
    });
  },
};
